"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/stores/store";
import { X } from "lucide-react";
import type { ThemePreference } from "@/lib/types";

export function SettingsModal() {
  const settingsOpen = useStore((state) => state.settingsOpen);
  const settings = useStore((state) => state.settings);
  const toggleSettings = useStore((state) => state.toggleSettings);
  const updateSettings = useStore((state) => state.updateSettings);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  useEffect(() => {
    if (!settingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleSettings();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen, toggleSettings]);

  return (
    <div
      className={`fixed inset-0 z-settings transition-opacity duration-300
                  ${settingsOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      style={{ transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={toggleSettings}
        aria-hidden="true"
      />

      <div
        className={`absolute right-0 top-0 h-full w-80 bg-bg-chrome shadow-xl
                    transition-transform duration-300
                    ${settingsOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle/40">
          <h2 id="settings-title" className="text-text-inverse font-semibold text-balance">Settings</h2>
          <button
            ref={closeButtonRef}
            onClick={toggleSettings}
            aria-label="Close settings"
            className="text-text-inverse hover:text-accent transition-colors rounded
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Auto Save */}
          <SettingToggle
            id="auto-save"
            label="Auto Save"
            checked={settings.enableAutoSave}
            onChange={(v) => updateSettings({ enableAutoSave: v })}
          />

          {/* Word Count */}
          <SettingToggle
            id="word-count"
            label="Word Count"
            checked={settings.enableWordsCount}
            onChange={(v) => updateSettings({ enableWordsCount: v })}
          />

          {/* Character Count */}
          <SettingToggle
            id="char-count"
            label="Character Count"
            checked={settings.enableCharactersCount}
            onChange={(v) => updateSettings({ enableCharactersCount: v })}
          />

          {/* Scroll Sync */}
          <SettingToggle
            id="scroll-sync"
            label="Scroll Sync"
            checked={settings.enableScrollSync}
            onChange={(v) => updateSettings({ enableScrollSync: v })}
          />

          {/* Theme */}
          <div className="flex items-center justify-between">
            <label htmlFor="theme-preference" className="text-text-inverse text-sm">Theme</label>
            <select
              id="theme-preference"
              value={settings.themePreference}
              onChange={(e) =>
                updateSettings({ themePreference: e.target.value as ThemePreference })
              }
              className="bg-bg-surface-hover text-text-inverse px-2 py-1 rounded text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Tab Size */}
          <div className="flex items-center justify-between">
            <label htmlFor="tab-size" className="text-text-inverse text-sm">Tab Size</label>
            <select
              id="tab-size"
              value={settings.tabSize}
              onChange={(e) => updateSettings({ tabSize: Number(e.target.value) })}
              className="bg-bg-surface-hover text-text-inverse px-2 py-1 rounded text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>

          {/* Keybindings */}
          <div className="flex items-center justify-between">
            <label htmlFor="keybindings" className="text-text-inverse text-sm">Keybindings</label>
            <select
              id="keybindings"
              value={settings.keybindings}
              onChange={(e) =>
                updateSettings({
                  keybindings: e.target.value as "default" | "vim" | "emacs",
                })
              }
              className="bg-bg-surface-hover text-text-inverse px-2 py-1 rounded text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <option value="default">Default</option>
              <option value="vim">Vim</option>
              <option value="emacs">Emacs</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-text-inverse text-sm">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-chrome ${
          checked ? "bg-accent" : "bg-bg-surface-hover"
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
