import { expect, test, type Locator, type Page } from "@playwright/test";
import { source as axeSource } from "axe-core";

const richBody = `# Phase 20 editorial system

[Owned accent link](https://example.com)

> A quiet workspace keeps the document at the center.

- [x] Accessible controls
- [ ] Calm motion

| Surface | Status |
| --- | --- |
| Editor | Ready |

\`\`\`ts
const theme = "dillinger";
\`\`\`

Inline math $E = mc^2$.

\`\`\`mermaid
flowchart LR
  Draft --> Review --> Publish
\`\`\`
`;

const documents = [
  {
    id: "phase20-primary",
    title: "Phase 20 Rebrand.md",
    body: richBody,
    createdAt: "2026-07-19T00:00:00.000Z",
    folderId: "phase20-folder",
    tags: ["design", "review"],
  },
  {
    id: "phase20-secondary",
    title: "Editorial notes.md",
    body: "# Editorial notes\n\nA second document for navigation and deletion states.",
    createdAt: "2026-07-18T00:00:00.000Z",
    folderId: null,
    tags: ["notes"],
  },
];

const settings = {
  enableAutoSave: true,
  enableWordsCount: true,
  enableCharactersCount: true,
  enableScrollSync: true,
  tabSize: 4,
  keybindings: "default",
  enableNightMode: false,
  enableGitHubComment: true,
  theme: "light",
};

async function seedEditor(page: Page, theme: "light" | "dark" | "system" = "light") {
  await page.addInitScript(
    ({ seededDocuments, seededSettings }) => {
      localStorage.setItem("files", JSON.stringify(seededDocuments));
      localStorage.setItem("currentDocument", JSON.stringify(seededDocuments[0]));
      localStorage.setItem(
        "folders",
        JSON.stringify([
          { id: "phase20-folder", name: "Design", createdAt: "2026-07-17T00:00:00.000Z" },
        ]),
      );
      localStorage.setItem("profileV3", JSON.stringify(seededSettings));
    },
    { seededDocuments: documents, seededSettings: { ...settings, theme } },
  );
}

async function loadEditor(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle sidebar" }).waitFor();
  await page.locator(".monaco-editor").waitFor({ timeout: 30_000 });
  await page.locator("nextjs-portal").evaluateAll((nodes) => {
    nodes.forEach((node) => node.setAttribute("hidden", ""));
  });
}

async function openSidebar(page: Page) {
  const sidebar = page.locator('aside[aria-label="Document library"]');
  if ((await sidebar.getAttribute("aria-hidden")) === "true") {
    await page.getByRole("button", { name: "Toggle sidebar" }).click();
  }
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");
  return sidebar;
}

async function tabUntil(page: Page, target: Locator, maximumTabs = 64) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((node) => node === document.activeElement)) {
      return;
    }
  }

  const active = await page.evaluate(() => document.activeElement?.outerHTML ?? "none");
  throw new Error(`Keyboard traversal did not reach target; active element: ${active}`);
}

async function axeSeriousCritical(page: Page, label: string) {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (window as typeof window & {
      axe: { run: (options: object) => Promise<{ violations: Array<{ id: string; impact: string | null }> }> };
    }).axe;
    const result = await axe.run({
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
    });
    return result.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => JSON.stringify(violation));
  });
  expect(violations, `${label} serious/critical axe violations`).toEqual([]);
}

test.describe("Phase 20 clean visual rebrand", () => {
  test("owned light/dark theme covers shell, document, and overlay families with axe-clean states", async ({ page }) => {
    await seedEditor(page, "light");
    await loadEditor(page);

    const rootTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        canvas: style.getPropertyValue("--color-background-body").trim(),
        surface: style.getPropertyValue("--color-background-surface").trim(),
        accent: style.getPropertyValue("--color-accent").trim(),
        bodyFont: getComputedStyle(document.body).fontFamily,
      };
    });
    expect(rootTokens.canvas).toBe("light-dark(#F8FAFC, #0B1220)");
    expect(rootTokens.surface).toBe("light-dark(#FFFFFF, #111827)");
    expect(rootTokens.accent).toBe("light-dark(#4F46E5, #818CF8)");
    expect(rootTokens.bodyFont.toLowerCase()).toContain("geist");
    await expect(page.locator(".preview-html h1")).toHaveText("Phase 20 editorial system");
    await expect(page.locator(".preview-html table")).toBeVisible();
    await axeSeriousCritical(page, "light editor shell");

    await page.getByRole("button", { name: "Export document" }).click();
    await expect(page.getByRole("menu", { name: "Export as" })).toBeVisible();
    await axeSeriousCritical(page, "export menu");
    await page.keyboard.press("Escape");

    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await axeSeriousCritical(page, "command palette");
    await page.keyboard.type("no-phase-20-command");
    await expect(page.getByText(/no results/i)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Open settings" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await axeSeriousCritical(page, "settings dialog");
    await page.keyboard.press("Escape");

    const sidebar = await openSidebar(page);
    await sidebar.getByText("Import from", { exact: true }).click();
    await sidebar.locator("#import-panel").getByRole("button", { name: "GitHub" }).click();
    await expect(page.getByRole("dialog", { name: "Connect to GitHub" })).toBeVisible();
    await axeSeriousCritical(page, "provider dialog");
    await page.keyboard.press("Escape");

    await sidebar.getByRole("button", { name: "Delete Document" }).click();
    await expect(page.getByRole("alertdialog", { name: "Delete Document" })).toBeVisible();
    await axeSeriousCritical(page, "delete confirmation");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "More editor actions" }).click();
    await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();
    await expect(page.getByRole("dialog", { name: "Keyboard Shortcuts" })).toBeVisible();
    await axeSeriousCritical(page, "keyboard shortcuts");
    await page.keyboard.press("Escape");

    await sidebar.getByRole("button", { name: "Save Session" }).click();
    await expect(page.getByText("Documents saved", { exact: true })).toBeVisible();
    await axeSeriousCritical(page, "toast");

    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByText("Dark", { exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator(".monaco-editor-background").first()).toHaveCSS(
      "background-color", "rgb(17, 24, 39)"
    );
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).colorScheme))
      .toContain("dark");
    await axeSeriousCritical(page, "dark settings dialog");
  });

  test("keyboard-only navigation reaches the shell, sidebar, toolbar, palette, and pane toggles", async ({ page }) => {
    await seedEditor(page);
    await loadEditor(page);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const sidebarToggle = page.getByRole("button", { name: "Toggle sidebar" });
    await tabUntil(page, sidebarToggle);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary", { name: "Document library" })).toHaveAttribute("aria-hidden", "false");

    const boldButton = page.getByRole("button", { name: "Bold" });
    await tabUntil(page, boldButton);
    await page.keyboard.press("Enter");

    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await page.keyboard.type("settings");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    const previewTab = page.getByRole("tab", { name: "Preview" });
    const editorInput = page.getByRole("textbox", { name: "Editor content" });
    await tabUntil(page, editorInput);
    await page.keyboard.press("Control+m");
    await tabUntil(page, previewTab);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Rendered preview" })).toBeVisible();
  });

  test("system mode reacts live and persisted dark mode is server-rendered without a flash", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await seedEditor(page, "system");
    await loadEditor(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator(".monaco-editor-background").first()).toHaveCSS(
      "background-color", "rgb(17, 24, 39)"
    );

    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByText("Dark", { exact: true }).click();
    await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === "dillinger-theme")?.value)
      .toBe("dark");

    const response = await context.request.get("/");
    expect(await response.text()).toMatch(/<html[^>]*data-theme="dark"/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-astryx-theme", "dillinger");
  });

  test("320px rendering retains actions, has no page overflow, and honors reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedEditor(page);
    await loadEditor(page);

    await expect(page.getByRole("button", { name: "Toggle sidebar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import file" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export document" })).toBeVisible();
    await expect(page.getByRole("button", { name: /preview/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More editor actions" })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const transitionDuration = await page.getByRole("button", { name: "Toggle sidebar" }).evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );
    expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);
  });

  test("branded loading, not-found, and application-error states use owned tokens", async ({ page }) => {
    await page.goto("/?phase20-skeleton=1");
    await expect(page.getByLabel("Loading editor")).toBeVisible();
    await expect.poll(() => page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue("--color-background-body").trim(),
    )).toBe("light-dark(#F8FAFC, #0B1220)");

    await page.goto("/phase20-not-found");
    await expect(page.getByRole("heading", { name: "This page is outside the workspace." })).toBeVisible();

    await page.goto("/?phase20-error=1");
    await expect(page.getByRole("heading", { name: "The editor hit an unexpected problem." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry workspace" })).toBeVisible();
  });
});
