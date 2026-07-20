"use client";

import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Editor",
    shortcuts: [
      { keys: ["⌘", "Z"], action: "Undo" },
      { keys: ["⌘", "⇧", "Z"], action: "Redo" },
      { keys: ["⌘", "X"], action: "Cut line" },
      { keys: ["⌘", "D"], action: "Duplicate line" },
      { keys: ["⌘", "/"], action: "Toggle comment" },
      { keys: ["⌘", "F"], action: "Find" },
      { keys: ["⌘", "H"], action: "Find and replace" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { keys: ["⌘", "⇧", "Z"], action: "Toggle zen mode" },
      { keys: ["Escape"], action: "Exit zen mode" },
      { keys: ["⌘", "K"], action: "Command palette" },
    ],
  },
  {
    title: "Help",
    shortcuts: [
      { keys: ["?"], action: "Keyboard shortcuts" },
    ],
  },
];

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={384} aria-label="Keyboard Shortcuts">
      <Layout
        header={
          <DialogHeader title="Keyboard Shortcuts" onOpenChange={handleOpenChange} />
        }
        content={
          <LayoutContent tabIndex={0} role="region" label="Keyboard shortcut reference">
            <div className="space-y-4">
              {SHORTCUT_GROUPS.map((group) => (
                <section key={group.title} aria-labelledby={`shortcut-${group.title.toLowerCase()}`}>
                  <h3 id={`shortcut-${group.title.toLowerCase()}`} className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">
                    {group.title}
                  </h3>
                  <div className="divide-y divide-border-subtle overflow-hidden rounded-panel border border-border-subtle bg-surface">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.action}
                        className="flex min-h-11 items-center justify-between gap-4 px-3 py-2 text-sm"
                      >
                        <span className="text-content-strong">{shortcut.action}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <kbd
                              key={`${shortcut.action}-${i}`}
                              className="min-w-7 rounded-control border border-border-control bg-surface-subtle px-2 py-1 text-center font-mono text-[11px] font-medium text-content-strong shadow-low"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
