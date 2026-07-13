import type MarkdownIt from "markdown-it";

const lineNumberRendererRuleNames = [
  "paragraph_open",
  "image",
  "code_block",
  "fence",
  "list_item_open",
] as const;

// Mermaid diagrams render client-side only (MarkdownPreview.tsx dynamic-
// imports the `mermaid` package and hydrates these containers into SVG) —
// this just marks fenced ```mermaid blocks so that client-side step knows
// where to look, and keeps the raw diagram source out of a <code> block
// so it isn't syntax-highlighted or displayed as literal text once
// hydrated.
function applyMermaidFenceRule(instance: MarkdownIt) {
  const previousFence = instance.renderer.rules.fence;

  instance.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info ? instance.utils.unescapeAll(token.info).trim() : "";
    const langName = info.split(/\s+/)[0];

    if (langName === "mermaid") {
      const lineAttrs = token.map?.length
        ? ` class="has-line-data" data-line-start="${token.map[0] + 1}" data-line-end="${token.map[1]}"`
        : "";
      const source = instance.utils.escapeHtml(token.content);
      return `<div class="mermaid-diagram"${lineAttrs}>${source}</div>\n`;
    }

    return previousFence
      ? previousFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };
}

function applyLegacyRendererRules(instance: MarkdownIt) {
  instance.renderer.rules.table_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrPush(["class", "table table-striped table-bordered"]);
    return self.renderToken(tokens, idx, options);
  };

  lineNumberRendererRuleNames.forEach((ruleName) => {
    const original = instance.renderer.rules[ruleName];

    instance.renderer.rules[ruleName] = (tokens, idx, options, env, self) => {
      const token = tokens[idx];

      if (token.map?.length) {
        token.attrPush(["class", "has-line-data"]);
        token.attrPush([
          "data-line-start",
          String(ruleName === "fence" ? token.map[0] + 1 : token.map[0]),
        ]);
        token.attrPush(["data-line-end", String(token.map[1])]);
      }

      if (original) {
        return original(tokens, idx, options, env, self);
      }

      return self.renderToken(tokens, idx, options);
    };
  });

  instance.renderer.rules.heading_open = (tokens, idx) => {
    const token = tokens[idx];
    const level = token.tag;
    const label = tokens[idx + 1];

    const makeSafe = (content: string) =>
      content.replace(/[^\w\s]/g, "").trim().split(/\s+/).join("_");

    if (label?.type === "inline" && token.map?.length && label.map?.length) {
      const anchor = `${makeSafe(label.content)}_${label.map[0]}`;

      return `<${level} class="code-line has-line-data" data-line-start="${token.map[0]}" data-line-end="${token.map[1]}"><a id="${anchor}"></a>`;
    }

    return `<${level}>`;
  };
}

let md: MarkdownIt | null = null;
let safeMd: MarkdownIt | null = null;

async function getMarkdownRenderer(allowHtml: boolean): Promise<MarkdownIt> {
  const cached = allowHtml ? md : safeMd;
  if (cached) return cached;

  const [
    { default: MarkdownIt },
    { default: markdownItAbbr },
    { default: markdownItCheckbox },
    { default: markdownItDeflist },
    { default: markdownItFootnote },
    { default: markdownItIns },
    { default: markdownItMark },
    { default: markdownItSub },
    { default: markdownItSup },
    { default: markdownItTexmath },
    { default: markdownItToc },
    { default: hljs },
    { default: katex },
  ] = await Promise.all([
    import("markdown-it"),
    import("markdown-it-abbr"),
    import("markdown-it-checkbox"),
    import("markdown-it-deflist"),
    import("markdown-it-footnote"),
    import("markdown-it-ins"),
    import("markdown-it-mark"),
    import("markdown-it-sub"),
    import("markdown-it-sup"),
    import("markdown-it-texmath"),
    import("markdown-it-toc"),
    import("highlight.js"),
    import("katex"),
  ]);

  const renderer = new MarkdownIt({
    html: allowHtml,
    linkify: true,
    typographer: true,
    breaks: true,
    highlight: (str: string, lang: string): string => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang, ignoreIllegals: true })
            .value;
        } catch {
          // Fall through to default escaping.
        }
      }

      return "";
    },
  })
    .use(markdownItToc)
    .use(markdownItAbbr)
    .use(markdownItCheckbox)
    .use(markdownItDeflist)
    .use(markdownItFootnote)
    .use(markdownItIns)
    .use(markdownItMark)
    .use(markdownItSub)
    .use(markdownItSup)
    .use(markdownItTexmath, {
      engine: katex,
      delimiters: "dollars",
    });

  applyLegacyRendererRules(renderer);
  applyMermaidFenceRule(renderer);

  if (allowHtml) {
    md = renderer;
  } else {
    safeMd = renderer;
  }

  return renderer;
}

export async function renderMarkdown(content: string): Promise<string> {
  const renderer = await getMarkdownRenderer(true);
  return renderer.render(content);
}

export async function renderMarkdownSafe(content: string): Promise<string> {
  const renderer = await getMarkdownRenderer(false);
  return renderer.render(content);
}
