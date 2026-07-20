import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPaletteRoot } from "@/components/editor/CommandPaletteRoot";
import { useStore } from "@/stores/store";

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ notify: vi.fn() }),
}));

const handleExport = vi.fn();
vi.mock("@/hooks/useExport", () => ({
  useExport: () => ({ handleExport }),
}));

const initialState = useStore.getState();

const docA = {
  id: "doc-a",
  title: "First.md",
  body: "# First",
  createdAt: "2026-01-01T00:00:00.000Z",
  folderId: null,
  tags: [],
};
const docB = {
  id: "doc-b",
  title: "Second.md",
  body: "# Second",
  createdAt: "2026-01-01T00:00:00.000Z",
  folderId: null,
  tags: [],
};

function resetStore() {
  useStore.setState(
    {
      ...initialState,
      documents: [docA, docB],
      currentDocument: docA,
      commandPaletteOpen: true,
      previewVisible: true,
      zenMode: false,
      settingsOpen: false,
    },
    true
  );
}

describe("CommandPaletteRoot", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("opens on the commandPaletteOpen store flag and lists commands", async () => {
    render(<CommandPaletteRoot />);

    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    // Bootstrap results load asynchronously (CommandPalette's own
    // useTransition-based search) — findBy* waits for them.
    expect(await screen.findByText("Switch to Second.md")).toBeInTheDocument();
    expect(screen.getByText("Toggle preview")).toBeInTheDocument();
    expect(screen.getByText("Enter zen mode")).toBeInTheDocument();
    expect(screen.getByText("Export as Markdown")).toBeInTheDocument();
    expect(screen.getByText("Insert Bold")).toBeInTheDocument();
    expect(screen.getByText("Open settings")).toBeInTheDocument();
    // The current document itself isn't offered as a "switch to" target.
    expect(screen.queryByText("Switch to First.md")).not.toBeInTheDocument();
  });

  it("does not render when commandPaletteOpen is false", () => {
    useStore.setState({ commandPaletteOpen: false }, false);
    render(<CommandPaletteRoot />);

    expect(
      screen.queryByRole("dialog", { name: "Command palette" })
    ).not.toBeInTheDocument();
  });

  it("filters commands by typed text", async () => {
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);
    await screen.findByText("Toggle preview");

    const input = screen.getByRole("combobox");
    await user.type(input, "bold");

    expect(await screen.findByText("Insert Bold")).toBeInTheDocument();
    expect(screen.queryByText("Toggle preview")).not.toBeInTheDocument();
  });

  it("executes the selected action and closes the palette", async () => {
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);

    await user.click(await screen.findByText("Toggle preview"));

    expect(useStore.getState().previewVisible).toBe(false);
    expect(useStore.getState().commandPaletteOpen).toBe(false);
  });

  it("switches to the selected document", async () => {
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);

    await user.click(await screen.findByText("Switch to Second.md"));

    expect(useStore.getState().currentDocument?.id).toBe("doc-b");
  });

  it("inserts the correct markdown for a formatting command", async () => {
    const insertMarkdownAtCursor = vi.fn();
    useStore.setState({ insertMarkdownAtCursor }, false);
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);

    await user.click(await screen.findByText("Insert Bold"));

    expect(insertMarkdownAtCursor).toHaveBeenCalledWith("**bold**");
  });

  it("opens settings and closes the palette", async () => {
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);

    await user.click(await screen.findByText("Open settings"));

    expect(useStore.getState().settingsOpen).toBe(true);
    expect(useStore.getState().commandPaletteOpen).toBe(false);
  });

  it("toggles zen mode on and relabels the command when reopened", async () => {
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);

    await user.click(await screen.findByText("Enter zen mode"));

    expect(useStore.getState().zenMode).toBe(true);

    useStore.setState({ commandPaletteOpen: true }, false);
    expect(await screen.findByText("Exit zen mode")).toBeInTheDocument();
  });

  it("exports in the requested format via the export hook", async () => {
    const user = userEvent.setup();
    render(<CommandPaletteRoot />);

    await user.click(await screen.findByText("Export as styled HTML"));

    expect(handleExport).toHaveBeenCalledWith("html", { styled: true });
    expect(useStore.getState().commandPaletteOpen).toBe(false);
  });
});
