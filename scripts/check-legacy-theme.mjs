import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib"];
const sourceFiles = ["tailwind.config.ts"];
const extensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

const prohibited = [
  ["retired accent value", /#35D7BB/gi],
  ["retired sidebar value", /#2B2F36/gi],
  ["retired navigation value", /#373D49/gi],
  ["retired accent token", /\bplum\b/gi],
  ["retired navigation token", /\bbg-navbar\b/gi],
  ["retired sidebar token", /\bbg-sidebar\b/gi],
  ["retired compound text token", /\btext-text-(?:primary|secondary|accent|danger)\b/gi],
  ["retired compound surface token", /\bbg-(?:background|surface)-(?:body|surface|muted|raised)\b/gi],
  ["retired Source Sans family", /Source Sans(?: Pro| 3)?/gi],
  ["retired Ubuntu Mono family", /Ubuntu Mono/gi],
  ["retired Georgia preview family", /font-family\s*:\s*[^;]*Georgia/gi],
  ["stock neutral runtime theme", /\bneutralTheme\b/g],
];

function walk(directory) {
  for (const entry of readdirSync(join(root, directory))) {
    const path = join(directory, entry);
    const info = statSync(join(root, path));
    if (info.isDirectory()) {
      walk(path);
    } else if (extensions.has(extname(entry))) {
      sourceFiles.push(path);
    }
  }
}

for (const directory of sourceRoots) walk(directory);

const failures = [];
for (const file of sourceFiles) {
  const content = readFileSync(join(root, file), "utf8");
  for (const [label, pattern] of prohibited) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      failures.push(`${relative(root, file)}:${line}: ${label}: ${match[0]}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Legacy visual-theme source is prohibited:\n");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Legacy theme check passed (${sourceFiles.length} rendered-source files).`);
