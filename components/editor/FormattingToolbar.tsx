"use client";

import { useStore } from "@/stores/store";
import { ButtonGroup } from "@astryxdesign/core/ButtonGroup";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TOOLBAR_ACTIONS } from "@/lib/toolbar-actions";
import { X } from "lucide-react";

export function FormattingToolbar() {
  const toolbarVisible = useStore((state) => state.toolbarVisible);
  const toggleToolbar = useStore((state) => state.toggleToolbar);
  const insertMarkdownAtCursor = useStore((state) => state.insertMarkdownAtCursor);

  if (!toolbarVisible) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border-light bg-white px-2 py-1">
      <ButtonGroup label="Formatting">
        {TOOLBAR_ACTIONS.map((action) => (
          <IconButton
            key={action.id}
            label={action.label}
            icon={action.icon}
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdownAtCursor(action.markdown)}
            data-testid={`toolbar-${action.id}`}
            className="text-text-primary"
          />
        ))}
      </ButtonGroup>
      <IconButton
        label="Hide formatting toolbar"
        icon={<X size={16} />}
        variant="ghost"
        size="sm"
        onClick={() => toggleToolbar()}
        className="text-text-primary"
      />
    </div>
  );
}
