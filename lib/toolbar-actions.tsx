import type { ReactNode } from "react";
import { Bold, Italic, Heading2, List, Link as LinkIcon, Code, Table, Sigma, Workflow } from "lucide-react";

export interface ToolbarAction {
  id: string;
  label: string;
  icon: ReactNode;
  markdown: string;
}

export const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { id: "bold", label: "Bold", icon: <Bold size={16} />, markdown: "**bold**" },
  { id: "italic", label: "Italic", icon: <Italic size={16} />, markdown: "*italic*" },
  { id: "heading", label: "Heading", icon: <Heading2 size={16} />, markdown: "## Heading" },
  { id: "list", label: "List", icon: <List size={16} />, markdown: "- List item" },
  { id: "link", label: "Link", icon: <LinkIcon size={16} />, markdown: "[text](url)" },
  { id: "code", label: "Code", icon: <Code size={16} />, markdown: "`code`" },
  {
    id: "table",
    label: "Table",
    icon: <Table size={16} />,
    markdown: "| Header | Header |\n| --- | --- |\n| Cell | Cell |",
  },
  { id: "math", label: "Math", icon: <Sigma size={16} />, markdown: "$$\n\n$$" },
  {
    id: "diagram",
    label: "Diagram",
    icon: <Workflow size={16} />,
    markdown: "```mermaid\ngraph TD\n  A --> B\n```",
  },
];
