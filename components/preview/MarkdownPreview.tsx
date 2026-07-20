"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/stores/store";
import { renderMarkdown } from "@/lib/markdown";

export function MarkdownPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentDocument = useStore((state) => state.currentDocument);
  const enableScrollSync = useStore((state) => state.settings.enableScrollSync);
  const enableNightMode = useStore((state) => state.settings.enableNightMode);
  const editorScrollPercent = useStore((state) => state.editorScrollPercent);
  const editorTopLine = useStore((state) => state.editorTopLine);
  const [sanitizedHtml, setSanitizedHtml] = useState("");

  useEffect(() => {
    const body = currentDocument?.body;
    if (!body) {
      setSanitizedHtml("");
      return;
    }

    let cancelled = false;

    Promise.all([renderMarkdown(body), import("dompurify")]).then(
      ([rawHtml, DOMPurify]) => {
        if (cancelled) return;

        const clean = DOMPurify.default.sanitize(rawHtml, {
          USE_PROFILES: { html: true, mathMl: true, svg: true },
          ADD_ATTR: ["target", "class", "data-line-start", "data-line-end"],
          FORBID_TAGS: ["script", "style"],
        });
        setSanitizedHtml(clean);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [currentDocument?.body]);

  // Hydrate ```mermaid fences (marked by lib/markdown.ts as
  // .mermaid-diagram containers holding the raw, HTML-escaped source) into
  // rendered diagrams. Client-side only, dynamically imported, matching
  // the existing Monaco/Sidebar dynamic-import pattern in
  // EditorContainer.tsx — mermaid needs the DOM and has no SSR story here.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const diagrams = Array.from(
      container.querySelectorAll<HTMLElement>(".mermaid-diagram")
    );
    if (diagrams.length === 0) return;

    let cancelled = false;

    (async () => {
      const { default: mermaid } = await import("mermaid");
      if (cancelled) return;

      // securityLevel: "strict" is mermaid's own built-in, purpose-built
      // XSS protection for exactly this "render straight into innerHTML"
      // use case — it HTML-encodes all diagram-source text internally
      // before generating the SVG, so this output is safe to inject
      // as-is. DOMPurify is deliberately NOT layered on top here: mermaid
      // renders node/edge labels via <foreignObject> (an HTML <div>
      // embedded in the SVG's XML namespace), and DOMPurify's SVG
      // sanitization of namespace-switched embedded HTML is a documented,
      // hard limitation — verified directly: even with both the `svg`
      // and `html` profiles enabled plus `ADD_TAGS: ["foreignObject"]`,
      // it silently stripped every label's content, leaving empty shapes.
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

      for (const [index, el] of diagrams.entries()) {
        const source = el.textContent ?? "";
        try {
          const { svg } = await mermaid.render(
            `mermaid-diagram-${index}-${Date.now()}`,
            source
          );
          if (cancelled) return;
          el.innerHTML = svg;
        } catch {
          if (cancelled) return;
          el.textContent = "Unable to render diagram";
          el.classList.add("mermaid-diagram-error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sanitizedHtml]);

  // Scroll sync with editor
  useEffect(() => {
    if (!enableScrollSync || !containerRef.current) return;

    const container = containerRef.current;
    const lineAnchors = Array.from(
      container.querySelectorAll<HTMLElement>("[data-line-start]")
    );

    if (lineAnchors.length > 0) {
      let target = lineAnchors[0];

      for (const anchor of lineAnchors) {
        const startLine = Number(anchor.dataset.lineStart || "0");
        if (startLine <= editorTopLine) {
          target = anchor;
        } else {
          break;
        }
      }

      // offsetTop is relative to the preview's offset parent, not its
      // scroll origin. Normalize against the first mapped block so line 1
      // remains at scrollTop 0 and later line anchors move proportionally.
      const scrollOrigin = lineAnchors[0].offsetTop;
      container.scrollTop = Math.max(0, target.offsetTop - scrollOrigin);
      return;
    }

    const scrollHeight = container.scrollHeight - container.clientHeight;
    container.scrollTop = scrollHeight * editorScrollPercent;
  }, [editorScrollPercent, editorTopLine, sanitizedHtml, enableScrollSync]);

  if (!sanitizedHtml && !currentDocument?.body) {
    return (
      <div
        id="preview"
        data-testid="preview-pane"
        className="flex h-full items-center justify-center bg-surface px-6"
      >
        <p className="text-content-muted text-sm">Start typing to see a preview</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="preview"
      data-testid="preview-pane"
      className={`preview-html h-full overflow-auto bg-surface px-5 py-6 sm:px-7 lg:px-9 ${
        enableNightMode ? "dark" : ""
      }`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
