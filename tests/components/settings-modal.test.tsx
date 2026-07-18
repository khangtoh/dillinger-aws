import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { useStore } from "@/stores/store";

const initialState = useStore.getState();

function resetStore() {
  useStore.setState(
    {
      ...initialState,
      documents: [],
      currentDocument: null,
      editorInstance: null,
      settings: { ...initialState.settings },
      sidebarOpen: true,
      settingsOpen: false,
      previewVisible: true,
      zenMode: false,
      editorScrollPercent: 0,
      editorTopLine: 1,
    },
    true
  );
}

function openSettings() {
  useStore.setState(
    { ...useStore.getState(), settingsOpen: true },
    true
  );
}

describe("SettingsModal", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders current settings and updates the store via accessible controls", async () => {
    const user = userEvent.setup();
    openSettings();

    render(<SettingsModal />);

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();

    const themeSelect = screen.getByLabelText("Theme");
    expect(themeSelect).toHaveValue("system");

    await user.selectOptions(themeSelect, "dark");

    expect(useStore.getState().settings.themePreference).toBe("dark");
    expect(themeSelect).toHaveValue("dark");
  });

  it("does not render when settingsOpen is false", () => {
    render(<SettingsModal />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("toggles auto-save setting", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const toggle = screen.getByRole("switch", { name: "Auto Save" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(useStore.getState().settings.enableAutoSave).toBe(false);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("toggles scroll sync setting", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const toggle = screen.getByRole("switch", { name: "Scroll Sync" });
    const initialValue = useStore.getState().settings.enableScrollSync;
    await user.click(toggle);
    expect(useStore.getState().settings.enableScrollSync).toBe(!initialValue);
  });

  it("toggles word count setting", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const toggle = screen.getByRole("switch", { name: "Word Count" });
    const initialValue = useStore.getState().settings.enableWordsCount;
    await user.click(toggle);
    expect(useStore.getState().settings.enableWordsCount).toBe(!initialValue);
  });

  it("toggles character count setting", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const toggle = screen.getByRole("switch", { name: "Character Count" });
    const initialValue = useStore.getState().settings.enableCharactersCount;
    await user.click(toggle);
    expect(useStore.getState().settings.enableCharactersCount).toBe(!initialValue);
  });

  it("changes tab size via select", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const select = screen.getByLabelText("Tab Size");
    await user.selectOptions(select, "8");
    expect(useStore.getState().settings.tabSize).toBe(8);

    await user.selectOptions(select, "2");
    expect(useStore.getState().settings.tabSize).toBe(2);

    await user.selectOptions(select, "4");
    expect(useStore.getState().settings.tabSize).toBe(4);
  });

  it("changes keybindings via select", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const select = screen.getByLabelText("Keybindings");
    await user.selectOptions(select, "vim");
    expect(useStore.getState().settings.keybindings).toBe("vim");

    await user.selectOptions(select, "emacs");
    expect(useStore.getState().settings.keybindings).toBe("emacs");

    await user.selectOptions(select, "default");
    expect(useStore.getState().settings.keybindings).toBe("default");
  });

  it("closes modal when close button is clicked", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    expect(screen.getByRole("dialog")).toBeVisible();

    const closeButton = screen.getByRole("button", { name: "Close settings" });
    await user.click(closeButton);

    expect(useStore.getState().settingsOpen).toBe(false);
  });

  it("closes modal when Escape key is pressed", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    expect(screen.getByRole("dialog")).toBeVisible();

    await user.keyboard("{Escape}");

    expect(useStore.getState().settingsOpen).toBe(false);
  });

  it("closes modal when backdrop is clicked", async () => {
    const user = userEvent.setup();
    openSettings();
    render(<SettingsModal />);

    const backdrop = screen.getByRole("dialog").querySelector("[aria-hidden='true']")!;
    await user.click(backdrop);

    expect(useStore.getState().settingsOpen).toBe(false);
  });

  it("displays correct initial values from store state", () => {
    useStore.setState(
      {
        ...useStore.getState(),
        settingsOpen: true,
        settings: {
          ...useStore.getState().settings,
          themePreference: "dark" as const,
          enableAutoSave: false,
          enableScrollSync: true,
          enableWordsCount: false,
          enableCharactersCount: true,
          tabSize: 8,
          keybindings: "vim" as const,
        },
      },
      true
    );

    render(<SettingsModal />);

    expect(screen.getByLabelText("Theme")).toHaveValue("dark");
    expect(screen.getByRole("switch", { name: "Auto Save" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Scroll Sync" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Word Count" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Character Count" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Tab Size")).toHaveValue("8");
    expect(screen.getByLabelText("Keybindings")).toHaveValue("vim");
  });
});
