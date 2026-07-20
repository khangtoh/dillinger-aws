#!/usr/bin/env python3
"""Capture the complete Phase 20 after route/state matrix with Playwright."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Callable
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright


HERE = Path(__file__).resolve().parent
DEFAULT_BASE_URL = "http://127.0.0.1:3005/"

RICH_BODY = """# Phase 20 editorial system

[Owned accent link](https://example.com)

> A quiet workspace keeps the document at the center.

- [x] Accessible controls
- [ ] Calm motion

| Surface | Status |
| --- | --- |
| Editor | Ready |

```ts
const theme = "dillinger";
```

Inline math $E = mc^2$.

```mermaid
flowchart LR
  Draft --> Review --> Publish
```
"""

DOCUMENTS = [
    {
        "id": "phase20-primary",
        "title": "Phase 20 Rebrand.md",
        "body": RICH_BODY,
        "createdAt": "2026-07-19T00:00:00.000Z",
        "folderId": "phase20-folder",
        "tags": ["design", "review"],
    },
    {
        "id": "phase20-secondary",
        "title": "Editorial notes.md",
        "body": "# Editorial notes\n\nA second document for navigation and deletion states.",
        "createdAt": "2026-07-18T00:00:00.000Z",
        "folderId": None,
        "tags": ["notes"],
    },
]

EMPTY_DOCUMENTS = [
    {
        "id": "phase20-empty",
        "title": "Untitled Document.md",
        "body": "",
        "createdAt": "2026-07-19T00:00:00.000Z",
        "folderId": None,
        "tags": [],
    }
]

BASE_SETTINGS = {
    "enableAutoSave": True,
    "enableWordsCount": True,
    "enableCharactersCount": True,
    "enableScrollSync": True,
    "tabSize": 4,
    "keybindings": "default",
    "enableNightMode": False,
    "enableGitHubComment": True,
    "theme": "light",
}

VARIANTS = {
    "desktop-light": (1440, 900, "light"),
    "desktop-dark": (1440, 900, "dark"),
    "tablet": (768, 1024, "light"),
    "mobile": (390, 844, "light"),
}

EDITOR_VARIANTS = {
    "full": tuple(VARIANTS),
    "desktop-mobile": ("desktop-light", "desktop-dark", "mobile"),
    "mobile-only": ("mobile",),
}

ROUTES = (
    ("R01", "/", "full"),
    ("R02", "/features", "desktop-mobile"),
    ("R03", "/ai", "desktop-mobile"),
    ("R04", "/integrations", "desktop-mobile"),
    ("R05", "/guide", "desktop-mobile"),
    ("R06", "/guide/best-online-markdown-editor", "desktop-mobile"),
    ("R07", "/readme-editor", "desktop-mobile"),
    ("R08", "/markdown-viewer", "desktop-mobile"),
    ("R09", "/markdown-to-html", "desktop-mobile"),
    ("R10", "/compare", "desktop-mobile"),
    ("R11", "/compare/stackedit", "desktop-mobile"),
    ("R12", "/compare/typora", "desktop-mobile"),
    ("R13", "/compare/hackmd", "desktop-mobile"),
    ("R14", "/compare/marklivedit", "desktop-mobile"),
    ("R15", "/compare/markdownlivepreview", "desktop-mobile"),
    ("R16", "/privacy", "desktop-mobile"),
    ("R17", "/changelog", "desktop-mobile"),
    ("R18", "/phase20-not-found", "desktop-mobile"),
    ("R19", "/?phase20-error=1", "desktop-mobile"),
)


def storage_script(theme: str, documents: list[dict]) -> str:
    settings = {**BASE_SETTINGS, "theme": theme}
    return """
        localStorage.setItem('files', JSON.stringify(%s));
        localStorage.setItem('currentDocument', JSON.stringify(%s));
        localStorage.setItem('folders', JSON.stringify(%s));
        localStorage.setItem('profileV3', JSON.stringify(%s));
    """ % (
        json.dumps(documents),
        json.dumps(documents[0] if documents else None),
        json.dumps([
            {
                "id": "phase20-folder",
                "name": "Design",
                "createdAt": "2026-07-17T00:00:00.000Z",
            }
        ]),
        json.dumps(settings),
    )


def api_handler(route: Route, *, github_connected: bool, export_failure: bool) -> None:
    path = urlparse(route.request.url).path
    if path == "/api/github/status":
        body = {
            "connected": github_connected,
            "user": {
                "login": "phase20-writer",
                "name": "Phase 20 Writer",
                "avatar_url": "",
            } if github_connected else None,
        }
    elif path == "/api/github/orgs":
        body = [{"login": "astryx-labs", "type": "Organization"}]
    elif path.endswith("/status"):
        body = {"connected": False}
    elif path == "/api/export/pdf" and export_failure:
        route.fulfill(status=503, content_type="application/json", body='{"error":"offline"}')
        return
    else:
        body = []
    route.fulfill(status=200, content_type="application/json", body=json.dumps(body))


def new_page(
    browser: Browser,
    base_url: str,
    variant: str,
    *,
    documents: list[dict] | None = None,
    github_connected: bool = False,
    export_failure: bool = False,
) -> tuple[BrowserContext, Page]:
    width, height, theme = VARIANTS[variant]
    context = browser.new_context(
        viewport={"width": width, "height": height},
        color_scheme=theme,
        reduced_motion="reduce",
    )
    context.add_cookies([
        {"name": "dillinger-theme", "value": theme, "url": base_url}
    ])
    page = context.new_page()
    page.add_init_script(storage_script(theme, documents or DOCUMENTS))
    page.route(
        "**/api/**",
        lambda route: api_handler(
            route,
            github_connected=github_connected,
            export_failure=export_failure,
        ),
    )
    return context, page


def wait_editor(page: Page, base_url: str, path: str = "/") -> None:
    page.goto(urljoin(base_url, path), wait_until="domcontentloaded", timeout=60_000)
    page.get_by_role("button", name="Toggle sidebar").wait_for(timeout=30_000)
    page.locator(".monaco-editor").wait_for(timeout=30_000)
    page.locator("nextjs-portal").evaluate_all(
        "nodes => nodes.forEach(node => node.setAttribute('hidden', ''))"
    )
    page.wait_for_timeout(250)


def ensure_sidebar(page: Page) -> Page:
    sidebar = page.locator('aside[aria-label="Document library"]')
    if sidebar.get_attribute("aria-hidden") == "true":
        page.get_by_role("button", name="Toggle sidebar").click()
    sidebar.wait_for(state="visible")
    return sidebar


def open_more(page: Page) -> None:
    page.get_by_role("button", name="More editor actions").click()
    page.get_by_role("menu", name="More editor actions").wait_for()


def state_default(page: Page) -> None:
    return None


def state_sidebar(page: Page) -> None:
    ensure_sidebar(page)


def state_export(page: Page) -> None:
    page.get_by_role("button", name="Export document").click()
    page.get_by_role("menu", name="Export as").wait_for()
    page.get_by_role("menuitem", name="Markdown", exact=True).focus()


def state_palette(page: Page) -> None:
    page.keyboard.press("Control+k")
    page.get_by_role("dialog", name="Command palette").wait_for()


def state_palette_empty(page: Page) -> None:
    state_palette(page)
    page.get_by_role("dialog", name="Command palette").locator("input").fill(
        "no matching phase 20 command"
    )
    page.get_by_text(re.compile("no results", re.I)).wait_for()


def state_settings(page: Page) -> None:
    page.get_by_role("button", name="Open settings").click()
    page.get_by_role("dialog", name="Settings").wait_for()


def state_provider(page: Page, connected: bool = False) -> None:
    sidebar = ensure_sidebar(page)
    sidebar.get_by_text("Import from", exact=True).click()
    sidebar.locator("#import-panel").get_by_role("button", name="GitHub").click()
    dialog_name = "Import from GitHub" if connected else "Connect to GitHub"
    page.get_by_role("dialog", name=dialog_name).wait_for()
    if connected:
        page.get_by_role("button", name="astryx-labs").wait_for()


def state_delete(page: Page) -> None:
    sidebar = ensure_sidebar(page)
    sidebar.get_by_role("button", name="Delete Document").click()
    page.get_by_role("alertdialog", name="Delete Document").wait_for()


def state_shortcuts(page: Page) -> None:
    open_more(page)
    page.get_by_role("menuitem", name="Keyboard shortcuts").click()
    page.get_by_role("dialog", name="Keyboard Shortcuts").wait_for()


def state_toast(page: Page) -> None:
    sidebar = ensure_sidebar(page)
    sidebar.get_by_role("button", name="Save Session").click()
    page.get_by_text("Documents saved", exact=True).wait_for()


def state_toolbar(page: Page) -> None:
    page.get_by_role("button", name="Bold").focus()


def state_preview_hidden(page: Page) -> None:
    page.get_by_role("button", name="Hide preview").click()


def state_zen(page: Page) -> None:
    open_more(page)
    page.get_by_role("menuitem", name="Enter zen mode").click()
    page.get_by_role("button", name="Exit zen mode").wait_for()


def state_drag(page: Page) -> None:
    page.locator("main").evaluate(
        """node => {
          const transfer = new DataTransfer();
          transfer.items.add(new File(['# Drop'], 'drop.md', {type: 'text/markdown'}));
          node.dispatchEvent(new DragEvent('dragenter', {bubbles: true, dataTransfer: transfer}));
        }"""
    )
    page.get_by_text("Drop to add to your workspace", exact=True).wait_for()


def state_rich(page: Page) -> None:
    if page.viewport_size and page.viewport_size["width"] < 640:
        page.get_by_role("tab", name="Preview").click()
    page.locator(".preview-html table").wait_for()


def state_offline(page: Page) -> None:
    page.get_by_role("button", name="Export document").click()
    page.get_by_role("menuitem", name="PDF", exact=True).click()
    page.get_by_text(re.compile("PDF export failed", re.I)).wait_for()


STATE_ROWS: tuple[tuple[str, str, Callable[[Page], None], dict], ...] = (
    ("E01", "editor-default", state_default, {"variants": "full"}),
    ("E02", "sidebar-open", state_sidebar, {"variants": "full"}),
    ("E03", "export-menu", state_export, {"variants": "full"}),
    ("E04", "command-palette", state_palette, {"variants": "full"}),
    ("E05", "command-palette-empty", state_palette_empty, {"variants": "desktop-mobile"}),
    ("E06", "settings", state_settings, {"variants": "full"}),
    ("E07", "github-disconnected", state_provider, {"variants": "desktop-mobile"}),
    ("E08", "github-connected", lambda page: state_provider(page, True), {"variants": "desktop-mobile", "github_connected": True}),
    ("E09", "delete-confirmation", state_delete, {"variants": "desktop-mobile"}),
    ("E10", "keyboard-shortcuts", state_shortcuts, {"variants": "desktop-mobile"}),
    ("E11", "toast", state_toast, {"variants": "desktop-mobile"}),
    ("E13", "empty-document", state_default, {"variants": "desktop-mobile", "documents": EMPTY_DOCUMENTS}),
    ("E14", "toolbar-focus", state_toolbar, {"variants": "full"}),
    ("E15", "preview-hidden", state_preview_hidden, {"variants": "full"}),
    ("E16", "zen-mode", state_zen, {"variants": "full"}),
    ("E17", "drag-overlay", state_drag, {"variants": "desktop-mobile"}),
    ("E18", "rich-document", state_rich, {"variants": "full"}),
    ("E20", "offline-error", state_offline, {"variants": "desktop-mobile", "export_failure": True}),
)


def save(page: Page, output: Path, name: str, *, full_page: bool = False) -> Path:
    target = output / f"{name}.png"
    page.screenshot(path=str(target), animations="disabled", full_page=full_page)
    print(target)
    return target


def capture_states(browser: Browser, base_url: str, output: Path, results: list[dict]) -> None:
    for row_id, slug, setup, options in STATE_ROWS:
        variants = EDITOR_VARIANTS[options["variants"]]
        for variant in variants:
            context, page = new_page(
                browser,
                base_url,
                variant,
                documents=options.get("documents"),
                github_connected=options.get("github_connected", False),
                export_failure=options.get("export_failure", False),
            )
            try:
                wait_editor(page, base_url)
                setup(page)
                save(page, output, f"{row_id}-{slug}-{variant}")
                results.append({"id": row_id, "variant": variant, "status": "captured"})
            finally:
                context.close()

    for variant in EDITOR_VARIANTS["full"]:
        context, page = new_page(browser, base_url, variant)
        try:
            page.goto(urljoin(base_url, "/?phase20-skeleton=1"), wait_until="domcontentloaded")
            page.get_by_label("Loading editor").wait_for()
            save(page, output, f"E12-hydration-skeleton-{variant}")
            results.append({"id": "E12", "variant": variant, "status": "captured"})
        finally:
            context.close()

    context = browser.new_context(
        viewport={"width": 320, "height": 640},
        color_scheme="light",
        reduced_motion="reduce",
    )
    context.add_cookies([{"name": "dillinger-theme", "value": "light", "url": base_url}])
    page = context.new_page()
    page.add_init_script(storage_script("light", DOCUMENTS))
    page.route("**/api/**", lambda route: api_handler(route, github_connected=False, export_failure=False))
    try:
        wait_editor(page, base_url)
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        save(page, output, "E19-zoom-320px-mobile")
        results.append({"id": "E19", "variant": "320px", "status": "captured"})
    finally:
        context.close()


def capture_routes(browser: Browser, base_url: str, output: Path, results: list[dict]) -> None:
    for row_id, path, variant_group in ROUTES:
        for variant in EDITOR_VARIANTS[variant_group]:
            context, page = new_page(browser, base_url, variant)
            try:
                page.goto(urljoin(base_url, path), wait_until="domcontentloaded", timeout=60_000)
                if row_id == "R01":
                    page.get_by_role("button", name="Toggle sidebar").wait_for(timeout=30_000)
                    page.locator(".monaco-editor").wait_for(timeout=30_000)
                elif row_id == "R18":
                    page.get_by_role("heading", name="This page is outside the workspace.").wait_for()
                elif row_id == "R19":
                    page.get_by_role("heading", name="The editor hit an unexpected problem.").wait_for()
                else:
                    page.locator("main").first.wait_for()
                page.wait_for_timeout(200)
                route_slug = path.split("?")[0].strip("/").replace("/", "-") or "home"
                save(
                    page,
                    output,
                    f"{row_id}-{route_slug}-{variant}",
                    full_page=row_id == "R01",
                )
                results.append({"id": row_id, "variant": variant, "status": "captured"})
            finally:
                context.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--output", type=Path, default=HERE / "after" / "matrix")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    base_url = args.base_url.rstrip("/") + "/"
    results: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            capture_states(browser, base_url, output, results)
            capture_routes(browser, base_url, output, results)
        finally:
            browser.close()

    manifest = {
        "captured": len(results),
        "matrix_ids": sorted({result["id"] for result in results}),
        "results": results,
    }
    (output / "capture-results.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Captured {len(results)} screenshots across {len(manifest['matrix_ids'])} matrix IDs.")


if __name__ == "__main__":
    main()
