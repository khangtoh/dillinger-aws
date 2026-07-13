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
          <LayoutContent>
            <div className="space-y-4">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs uppercase tracking-wider text-text-muted mb-2">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.action}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-text-muted">{shortcut.action}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <kbd
                              key={`${shortcut.action}-${i}`}
                              className="bg-bg-highlight text-text-invert px-2.5 py-0.5 rounded text-xs font-mono min-w-[24px] text-center"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
