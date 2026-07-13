"use client";

import { useState } from "react";
import { Check, ChevronUp, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { ChecklistItem } from "@/types";

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: () => void;
  onDelete: () => void;
  onTextChange: (text: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
  onTextChange,
  onMoveUp,
  onMoveDown,
}: ChecklistItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleBlur = () => {
    setIsEditing(false);
    if (editText.trim() && editText !== item.text) {
      onTextChange(editText.trim());
    } else {
      setEditText(item.text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border transition-all min-h-[44px]",
        "touch-manipulation",
        item.completed
          ? "bg-muted border-border"
          : "bg-card border-border hover:border-brand-300"
      )}
    >
      {/* Checkbox - Large touch target */}
      <button
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
          item.completed
            ? "bg-success-accent border-success-accent"
            : "border-border hover:border-brand-400"
        )}
        aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {item.completed && <Check className="w-4 h-4 text-white" />}
      </button>

      {/* Text - Inline editable */}
      {isEditing ? (
        <Input
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 h-8 text-sm"
        />
      ) : (
        <span
          onClick={() => {
            setEditText(item.text);
            setIsEditing(true);
          }}
          className={cn(
            "flex-1 text-sm cursor-text select-none",
            item.completed && "text-muted-foreground line-through"
          )}
        >
          {item.text}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
        {onMoveUp && (
          <button
            onClick={onMoveUp}
            className="p-1.5 hover:bg-muted rounded"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={onMoveDown}
            className="p-1.5 hover:bg-muted rounded"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-destructive-soft rounded text-muted-foreground hover:text-destructive"
          aria-label="Delete item"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
