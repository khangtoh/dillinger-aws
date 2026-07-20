#!/usr/bin/env python3
"""Capture Phase 20 legacy-theme evidence from a deployed Dillinger tenant."""

from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright


DEFAULT_BASE_URL = (
    "https://3tfsfijqedt62hf3vfdfxwunua0rkjgo."
    "lambda-url.ap-southeast-1.on.aws/"
)
HERE = Path(__file__).resolve().parent

SEEDED_DOCUMENT = {
    "id": "phase20-before",
    "title": "Phase 20 Baseline.md",
    "body": (
        "# Phase 20 visual baseline\n\n"
        "This document records the legacy Dillinger shell before the clean "
        "visual rebrand.\n\n"
        "## Editorial workspace\n\n"
        "The replacement must use owned semantic tokens, deliberate light and "
        "dark modes, and a new document presentation.\n\n"
        "> These screenshots are before evidence, not future visual baselines.\n"
    ),
    "createdAt": "2026-07-19T00:00:00.000Z",
}

SEEDED_PROFILE = {
    "enableAutoSave": True,
    "enableWordsCount": True,
    "enableCharactersCount": True,
    "enableScrollSync": True,
    "tabSize": 4,
    "keybindings": "default",
    "enableNightMode": False,
    "enableGitHubComment": True,
    "theme": "system",
}


def seed_script() -> str:
    document = json.dumps(SEEDED_DOCUMENT)
    profile = json.dumps(SEEDED_PROFILE)
    return f"""
        localStorage.setItem('files', JSON.stringify([{document}]));
        localStorage.setItem('currentDocument', JSON.stringify({document}));
        localStorage.setItem('profileV3', JSON.stringify({profile}));
    """


def load_editor(page: Page, base_url: str) -> None:
    """Load the editor, retrying transient Lambda/static-asset failures."""
    for attempt in range(1, 4):
        page.goto(base_url, wait_until="domcontentloaded", timeout=60_000)
        try:
            page.get_by_role("button", name="Toggle sidebar").wait_for(
                state="visible", timeout=45_000
            )
            page.wait_for_timeout(2_000)
            return
        except PlaywrightTimeoutError:
            if attempt == 3:
                raise
            page.reload(wait_until="domcontentloaded", timeout=60_000)


def sidebar_is_open(page: Page) -> bool:
    return page.locator("aside").evaluate(
        "element => element.getBoundingClientRect().right > 1"
    )


def ensure_sidebar(page: Page, *, open_: bool) -> None:
    if sidebar_is_open(page) != open_:
        page.get_by_role("button", name="Toggle sidebar").click()
        page.wait_for_timeout(400)


def screenshot(page: Page, output_dir: Path, name: str) -> None:
    page.evaluate("window.scrollTo(0, 0)")
    page.screenshot(path=str(output_dir / name), animations="disabled")
    print(output_dir / name)


def capture_viewports(page: Page, output_dir: Path) -> None:
    for width, height in ((1440, 900), (768, 1024), (390, 844)):
        page.set_viewport_size({"width": width, "height": height})
        for scheme in ("light", "dark"):
            page.emulate_media(color_scheme=scheme, reduced_motion="reduce")
            page.wait_for_timeout(500)
            ensure_sidebar(page, open_=True)
            screenshot(page, output_dir, f"editor-{width}x{height}-{scheme}.png")


def close_overlay(page: Page) -> None:
    page.keyboard.press("Escape")
    page.wait_for_timeout(350)


def capture_open_states(page: Page, output_dir: Path) -> None:
    page.set_viewport_size({"width": 1440, "height": 900})
    page.emulate_media(color_scheme="light", reduced_motion="reduce")
    ensure_sidebar(page, open_=True)
    screenshot(page, output_dir, "state-sidebar-open.png")

    page.get_by_role("button", name="Export document").click()
    page.get_by_role("menu").wait_for(state="visible", timeout=10_000)
    screenshot(page, output_dir, "state-export-menu.png")
    close_overlay(page)

    page.keyboard.press("Control+k")
    page.get_by_role("dialog", name="Command palette").wait_for(
        state="visible", timeout=10_000
    )
    screenshot(page, output_dir, "state-command-palette.png")
    close_overlay(page)

    page.get_by_role("button", name="Open settings").click()
    page.get_by_role("dialog", name="Settings").wait_for(
        state="visible", timeout=10_000
    )
    screenshot(page, output_dir, "state-settings-dialog.png")
    close_overlay(page)

    ensure_sidebar(page, open_=True)
    page.get_by_text("Import from", exact=True).click()
    page.locator("#import-panel").get_by_role("button", name="GitHub").click()
    page.get_by_role("dialog", name="Connect to GitHub").wait_for(
        state="visible", timeout=10_000
    )
    screenshot(page, output_dir, "state-cloud-provider-dialog.png")
    close_overlay(page)

    ensure_sidebar(page, open_=True)
    page.get_by_role("button", name="Save Session").click()
    page.get_by_text("Documents saved", exact=True).wait_for(
        state="visible", timeout=5_000
    )
    screenshot(page, output_dir, "state-toast.png")
    page.wait_for_timeout(3_500)

    page.get_by_role("button", name="Keyboard shortcuts").click()
    page.get_by_role("dialog", name="Keyboard Shortcuts").wait_for(
        state="visible", timeout=10_000
    )
    screenshot(page, output_dir, "state-keyboard-shortcuts.png")
    close_overlay(page)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--output", type=Path, default=HERE / "before")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    profile_dir = Path(tempfile.gettempdir()) / "dillinger-phase20-evidence"

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(profile_dir),
            headless=True,
            viewport={"width": 1440, "height": 900},
            color_scheme="light",
            reduced_motion="reduce",
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script(seed_script())
        load_editor(page, args.base_url)
        capture_viewports(page, output_dir)
        capture_open_states(page, output_dir)
        context.close()


if __name__ == "__main__":
    main()
