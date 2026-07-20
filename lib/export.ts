import { readFileSync } from "node:fs";
import { join } from "node:path";
import { replaceExtension, sanitizeDownloadFilename } from "@/lib/document";
import { astryxColorTokens } from "@/lib/theme/tokens";

// Inlined (not CDN-linked) so the exported file stays fully self-contained
// and works under the strict CSP below, which allows no external style/font
// hosts — matches katex.min.css from the `katex` package already used for
// the live preview (app/globals.css). Read via a plain filesystem path
// (not require.resolve) because Next's server bundler rewrites .css
// require.resolve targets to a virtual path that doesn't exist on disk.
const KATEX_CSS = `/* katex.min.css */\n${readFileSync(
  join(process.cwd(), "node_modules/katex/dist/katex.min.css"),
  "utf8"
)}`;

const light = (token: keyof typeof astryxColorTokens) =>
  astryxColorTokens[token][0];

const STYLED_EXPORT_CSS = `
  body {
    background: ${light("--color-background-body")};
    color: ${light("--color-text-primary")};
    font-family: Geist, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.75;
    max-width: 800px;
    margin: 0 auto;
    padding: 2.5rem 2rem;
  }
  h1, h2, h3, h4, h5, h6 {
    color: ${light("--color-text-primary")};
    font-family: Geist, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-weight: 650;
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin-top: 1.75em;
    margin-bottom: 0.65em;
  }
  h1 { font-size: 2.25rem; border-bottom: 1px solid ${light("--color-border")}; padding-bottom: 0.35em; }
  h2 { font-size: 1.75rem; border-bottom: 1px solid ${light("--color-border")}; padding-bottom: 0.3em; }
  h3 { font-size: 1.35rem; }
  a { color: ${light("--color-text-accent")}; text-underline-offset: 0.18em; }
  code {
    background: ${light("--color-background-muted")};
    border: 1px solid ${light("--color-border")};
    border-radius: 4px;
    color: ${light("--color-text-primary")};
    font-family: "Geist Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.9em;
    padding: 0.18em 0.4em;
  }
  pre {
    background: ${light("--color-background-muted")};
    border: 1px solid ${light("--color-border")};
    border-radius: 12px;
    overflow-x: auto;
    padding: 1rem 1.125rem;
  }
  .hljs {
    display: block;
    overflow-x: auto;
    padding: 0;
    color: ${light("--color-text-primary")};
  }
  pre code { background: none; border: 0; padding: 0; }
  blockquote {
    background: ${light("--color-accent-muted")};
    border-left: 3px solid ${light("--color-accent")};
    border-radius: 0 8px 8px 0;
    color: ${light("--color-text-secondary")};
    margin-left: 0;
    padding: 0.8rem 1rem;
  }
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }
  th, td {
    border-bottom: 1px solid ${light("--color-border")};
    padding: 0.65rem 0.75rem;
    text-align: left;
  }
  th {
    background: ${light("--color-background-muted")};
    font-weight: 650;
  }
  #preview .table { width: auto; }
  img {
    border-radius: 8px;
    max-width: 100%;
    height: auto;
  }
  .katex-display {
    overflow-x: auto;
    overflow-y: hidden;
  }
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getExportFilename(title: string | undefined, extension: string): string {
  const safeTitle = sanitizeDownloadFilename(title?.trim() || "document");
  return sanitizeDownloadFilename(replaceExtension(safeTitle, extension));
}

export function renderHtmlDocument({
  title,
  html,
  styled,
}: {
  title?: string;
  html: string;
  styled?: boolean;
}): string {
  const styleTag = styled
    ? `<style>${KATEX_CSS}${STYLED_EXPORT_CSS}</style>`
    : "";
  const safeTitle = escapeHtml(title || "Document");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src data:">
  <title>${safeTitle}</title>
  ${styleTag}
</head>
<body id="preview">
${html}
</body>
</html>`;
}
