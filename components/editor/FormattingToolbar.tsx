"use client";

import { useStore } from "@/stores/store";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TOOLBAR_ACTIONS } from "@/lib/toolbar-actions";
import { X } from "lucide-react";

const TOOLBAR_GROUPS = [
  { label: "Text formatting", actions: TOOLBAR_ACTIONS.slice(0, 4) },
  { label: "Insert", actions: TOOLBAR_ACTIONS.slice(4, 7) },
  { label: "Advanced insert", actions: TOOLBAR_ACTIONS.slice(7) },
] as const;

export function FormattingToolbar() {
  const toolbarVisible = useStore((state) => state.toolbarVisible);
  const toggleToolbar = useStore((state) => state.toggleToolbar);
  const insertMarkdownAtCursor = useStore((state) => state.insertMarkdownAtCursor);

  if (!toolbarVisible) return null;

  return (
    <div
      role="toolbar"
      aria-label="Formatting toolbar"
      className="flex min-h-11 items-center border-b border-border-subtle bg-surface"
    >
      <div className="min-w-0 flex-1 overflow-x-auto px-2 py-1.5">
        <div className="flex w-max items-center">
          <span className="mr-2 hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-content-muted lg:inline">
            Format
          </span>
          {TOOLBAR_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="flex items-center">
              {groupIndex > 0 && (
                <span
                  aria-hidden="true"
                  className="mx-1.5 h-5 w-px bg-border-subtle"
                />
              )}
              <ButtonGroup label={group.label}>
                {group.actions.map((action) => (
                  <IconButton
                    key={action.id}
                    label={action.label}
                    icon={action.icon}
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdownAtCursor(action.markdown)}
                    data-testid={`toolbar-${action.id}`}
                    className="text-content-muted hover:text-content-strong"
                  />
                ))}
              </ButtonGroup>
            </div>
          ))}
        </div>
      </div>
      <span aria-hidden="true" className="h-5 w-px bg-border-subtle" />
      <div className="shrink-0 px-1.5">
        <IconButton
          label="Hide formatting toolbar"
          icon={<X size={16} />}
          variant="ghost"
          size="sm"
          onClick={() => toggleToolbar()}
          className="text-content-muted hover:text-content-strong"
        />
      </div>
    </div>
  );
}
