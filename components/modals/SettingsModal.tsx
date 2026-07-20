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
            <div className="space-y-5">
              <section aria-labelledby="appearance-heading" className="space-y-3">
                <div>
                  <h3 id="appearance-heading" className="text-sm font-semibold text-content-strong">
                    Appearance
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-content-muted">
                    Choose how the writing workspace follows your environment.
                  </p>
                </div>
                <div className="rounded-panel border border-border-subtle bg-surface-subtle p-3">
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
              </section>

              <section aria-labelledby="writing-heading" className="space-y-2">
                <h3 id="writing-heading" className="text-sm font-semibold text-content-strong">
                  Writing
                </h3>
                <div className="divide-y divide-border-subtle rounded-panel border border-border-subtle bg-surface">
                  <SettingToggle
                    id="auto-save"
                    label="Auto Save"
                    description="Save changes while you write"
                    checked={settings.enableAutoSave}
                    onChange={(v) => updateSettings({ enableAutoSave: v })}
                  />
                  <SettingToggle
                    id="scroll-sync"
                    label="Scroll Sync"
                    description="Keep editor and preview aligned"
                    checked={settings.enableScrollSync}
                    onChange={(v) => updateSettings({ enableScrollSync: v })}
                  />
                  <SettingToggle
                    id="word-count"
                    label="Word Count"
                    checked={settings.enableWordsCount}
                    onChange={(v) => updateSettings({ enableWordsCount: v })}
                  />
                  <SettingToggle
                    id="char-count"
                    label="Character Count"
                    checked={settings.enableCharactersCount}
                    onChange={(v) => updateSettings({ enableCharactersCount: v })}
                  />
                </div>
              </section>

              <section aria-labelledby="editor-heading" className="space-y-2">
                <h3 id="editor-heading" className="text-sm font-semibold text-content-strong">
                  Editor
                </h3>
                <div className="divide-y divide-border-subtle rounded-panel border border-border-subtle bg-surface">
                  <SettingSelect
                    id="tab-size"
                    label="Tab size"
                    value={String(settings.tabSize)}
                    onChange={(value) => updateSettings({ tabSize: Number(value) })}
                    options={["2", "4", "8"]}
                  />
                  <SettingSelect
                    id="keybindings"
                    label="Keybindings"
                    value={settings.keybindings}
                    onChange={(value) => updateSettings({
                      keybindings: value as "default" | "vim" | "emacs",
                    })}
                    options={["default", "vim", "emacs"]}
                  />
                  <SettingToggle
                    id="night-mode"
                    label="Night Mode"
                    description="Use the dark Monaco canvas"
                    checked={settings.enableNightMode}
                    onChange={(v) => updateSettings({ enableNightMode: v })}
                  />
                </div>
              </section>
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
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-3 py-2.5">
      <label htmlFor={id} className="min-w-0 text-sm text-content-strong">
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-content-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          checked ? "bg-accent" : "border-border-control bg-control-track"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-1 top-1 size-4 rounded-full bg-surface shadow-low transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SettingSelect({ id, label, value, options, onChange }: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-3 py-2.5">
      <label htmlFor={id} className="text-sm font-medium text-content-strong">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-9 rounded-control border border-border-subtle bg-surface-subtle px-2.5 text-sm capitalize text-content-strong shadow-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
