#!/usr/bin/env python3
"""Verify the deployed Phase 20 visual system and capture live evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

from capture_after import ensure_sidebar, new_page, wait_editor


HERE = Path(__file__).resolve().parent
LEGACY_RGB = {"rgb(22, 38, 46)", "rgb(13, 111, 97)", "rgb(38, 50, 56)"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--output", type=Path, default=HERE / "live")
    return parser.parse_args()


def assert_editor(page: Page, variant: str) -> dict[str, object]:
    root = page.locator("html")
    assert root.get_attribute("data-astryx-theme") == "dillinger"
    root_classes = (root.get_attribute("class") or "").split()
    if variant == "desktop-dark":
        assert "dark" in root_classes
    else:
        assert "dark" not in root_classes
    tokens = page.evaluate(
        """() => {
          const rootStyle = getComputedStyle(document.documentElement);
          return {
            canvas: rootStyle.getPropertyValue('--color-background-body').trim(),
            surface: rootStyle.getPropertyValue('--color-background-surface').trim(),
            accent: rootStyle.getPropertyValue('--color-accent').trim(),
            bodyFont: getComputedStyle(document.body).fontFamily,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          };
        }"""
    )
    assert tokens["canvas"] == "light-dark(#F8FAFC, #0B1220)"
    assert tokens["surface"] == "light-dark(#FFFFFF, #111827)"
    assert tokens["accent"] == "light-dark(#4F46E5, #818CF8)"
    assert "geist" in str(tokens["bodyFont"]).lower()
    assert tokens["overflow"] is False
    assert page.locator(".monaco-editor").is_visible()
    assert page.get_by_role("button", name="Bold").is_visible()

    sampled_styles = page.locator("body, nav, aside, button").evaluate_all(
        """nodes => nodes.flatMap(node => {
          const style = getComputedStyle(node);
          return [style.color, style.backgroundColor];
        })"""
    )
    assert not (set(sampled_styles) & LEGACY_RGB)

    sidebar = ensure_sidebar(page)
    assert sidebar.get_by_text("Design", exact=True).is_visible()
    assert sidebar.get_by_text("design", exact=True).is_visible()
    page.keyboard.press("Control+k")
    palette = page.get_by_role("dialog", name="Command palette")
    palette.wait_for()
    page.keyboard.press("Escape")

    return {"variant": variant, "tokens": tokens, "legacyComputedMatches": []}


def main() -> None:
    args = parse_args()
    base_url = args.base_url.rstrip("/") + "/"
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []
    console_errors: list[str] = []
    failed_requests: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for variant in ("desktop-light", "desktop-dark", "tablet", "mobile"):
                context, page = new_page(browser, base_url, variant)
                page.on(
                    "console",
                    lambda message: console_errors.append(message.text)
                    if message.type == "error"
                    else None,
                )
                page.on("requestfailed", lambda request: failed_requests.append(request.url))
                try:
                    wait_editor(page, base_url)
                    result = assert_editor(page, variant)
                    screenshot = output / f"{variant}.png"
                    page.screenshot(path=str(screenshot), full_page=True)
                    result["screenshot"] = screenshot.name
                    results.append(result)
                finally:
                    context.close()

            context, page = new_page(browser, base_url, "desktop-light")
            try:
                wait_editor(page, base_url)
                page.get_by_role("button", name="Open settings").click()
                page.get_by_text("Dark", exact=True).click()
                assert "dark" in (page.locator("html").get_attribute("class") or "").split()
                persisted_state = context.storage_state()
                cookie = next(
                    (
                        candidate
                        for candidate in persisted_state["cookies"]
                        if candidate["name"] == "dillinger-theme"
                    ),
                    None,
                )
                assert cookie is not None and cookie["value"] == "dark"
                assert float(cookie["expires"]) > 0
            finally:
                context.close()

            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                color_scheme="light",
                storage_state=persisted_state,
            )
            page = context.new_page()
            try:
                response = page.goto(base_url, wait_until="domcontentloaded")
                assert response is not None and response.status == 200
                assert 'data-theme="dark"' in response.text()
                page.locator(".monaco-editor").wait_for(timeout=30_000)
                assert "dark" in (page.locator("html").get_attribute("class") or "").split()
                results.append(
                    {
                        "variant": "fresh-session-persistence",
                        "cookieExpires": int(cookie["expires"]),
                        "serverRenderedTheme": "dark",
                    }
                )
            finally:
                context.close()

            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            try:
                response = page.goto(
                    base_url.rstrip("/") + "/phase20-not-found",
                    wait_until="domcontentloaded",
                )
                assert response is not None and response.status == 404
                page.get_by_role(
                    "heading", name="This page is outside the workspace."
                ).wait_for()
                results.append({"variant": "live-not-found", "status": 404})
            finally:
                context.close()
        finally:
            browser.close()

    assert not console_errors, console_errors
    assert not failed_requests, failed_requests
    manifest = {
        "baseUrl": base_url,
        "results": results,
        "consoleErrors": console_errors,
        "failedRequests": failed_requests,
    }
    (output / "verification-results.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Verified {len(results)} live result groups; captured 4 viewport screenshots.")


if __name__ == "__main__":
    main()
