"use client";

import { useStore } from "@/stores/store";
import type { ThemeMode } from "@/lib/types";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { X } from "lucide-react";

export function SettingsModal() {
  const settingsOpen = useStore((state) => state.settingsOpen);
  const settings = useStore((state) => state.settings);
  const toggleSettings = useStore((state) => state.toggleSettings);
  const updateSettings = useStore((state) => state.updateSettings);

  if (!settingsOpen) return null;

  return (
    <Dialog
      isOpen
      onOpenChange={() => toggleSettings()}
      width={360}
      aria-label="Settings"
    >
      <Layout
        header={
          <DialogHeader
            title="Settings"
            endContent={
              <Button
                label="Close settings"
                icon={<X size={20} />}
                variant="ghost"
                isIconOnly
                onClick={() => toggleSettings()}
              />
            }
          />
        }
        content={
          <LayoutContent>
          <div className="space-y-4">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <span className="text-text-primary text-sm">Theme</span>
            <SegmentedControl
              label="Theme"
              value={settings.theme}
              onChange={(value) => updateSettings({ theme: value as ThemeMode })}
            >
              <SegmentedControlItem value="light" label="Light" />
              <SegmentedControlItem value="dark" label="Dark" />
              <SegmentedControlItem value="system" label="System" />
            </SegmentedControl>
          </div>

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

          {/* Night Mode */}
          <SettingToggle
            id="night-mode"
            label="Night Mode"
            checked={settings.enableNightMode}
            onChange={(v) => updateSettings({ enableNightMode: v })}
          />

          {/* Scroll Sync */}
          <SettingToggle
            id="scroll-sync"
            label="Scroll Sync"
            checked={settings.enableScrollSync}
            onChange={(v) => updateSettings({ enableScrollSync: v })}
          />

          {/* Tab Size */}
          <div className="flex items-center justify-between">
            <label htmlFor="tab-size" className="text-text-primary text-sm">Tab Size</label>
            <select
              id="tab-size"
              value={settings.tabSize}
              onChange={(e) => updateSettings({ tabSize: Number(e.target.value) })}
              className="bg-bg-highlight text-text-invert px-2 py-1 rounded text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>

          {/* Keybindings */}
          <div className="flex items-center justify-between">
            <label htmlFor="keybindings" className="text-text-primary text-sm">Keybindings</label>
            <select
              id="keybindings"
              value={settings.keybindings}
              onChange={(e) =>
                updateSettings({
                  keybindings: e.target.value as "default" | "vim" | "emacs",
                })
              }
              className="bg-bg-highlight text-text-invert px-2 py-1 rounded text-sm
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
            >
              <option value="default">Default</option>
              <option value="vim">Vim</option>
              <option value="emacs">Emacs</option>
            </select>
          </div>
          </div>
          </LayoutContent>
        }
      />
    </Dialog>
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
      <label htmlFor={id} className="text-text-primary text-sm">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          checked ? "bg-plum" : "bg-switchery"
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
