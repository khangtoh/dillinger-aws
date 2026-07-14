import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormattingToolbar } from "@/components/editor/FormattingToolbar";
import { useStore } from "@/stores/store";

const initialState = useStore.getState();

function resetStore() {
  useStore.setState(
    {
      ...initialState,
      toolbarVisible: true,
    },
    true
  );
}

describe("FormattingToolbar", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders a toolbar button for every formatting action", () => {
    render(<FormattingToolbar />);

    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Math" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diagram" })).toBeInTheDocument();
  });

  it("does not render when toolbarVisible is false", () => {
    useStore.setState({ toolbarVisible: false }, false);
    render(<FormattingToolbar />);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });

  const cases: Array<[name: string, markdown: string]> = [
    ["Bold", "**bold**"],
    ["Italic", "*italic*"],
    ["Heading", "## Heading"],
    ["List", "- List item"],
    ["Link", "[text](url)"],
    ["Code", "`code`"],
    ["Table", "| Header | Header |\n| --- | --- |\n| Cell | Cell |"],
    ["Math", "$$\n\n$$"],
    ["Diagram", "```mermaid\ngraph TD\n  A --> B\n```"],
  ];

  it.each(cases)(
    "%s action inserts the correct markdown snippet",
    async (name, markdown) => {
      const insertMarkdownAtCursor = vi.fn();
      useStore.setState({ insertMarkdownAtCursor }, false);
      const user = userEvent.setup();
      render(<FormattingToolbar />);

      await user.click(screen.getByRole("button", { name }));

      expect(insertMarkdownAtCursor).toHaveBeenCalledWith(markdown);
    }
  );

  it("hides the toolbar when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<FormattingToolbar />);

    await user.click(screen.getByRole("button", { name: "Hide formatting toolbar" }));

    expect(useStore.getState().toolbarVisible).toBe(false);
  });
});
