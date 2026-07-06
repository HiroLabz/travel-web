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
          ? "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
          : "bg-white border-slate-200 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-indigo-600"
      )}
    >
      {/* Checkbox - Large touch target */}
      <button
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
          item.completed
            ? "bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
            : "border-slate-300 hover:border-indigo-400 dark:border-slate-600 dark:hover:border-indigo-500"
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
            item.completed && "text-slate-400 line-through dark:text-slate-500"
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
            className="p-1.5 hover:bg-slate-100 rounded dark:hover:bg-slate-700"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={onMoveDown}
            className="p-1.5 hover:bg-slate-100 rounded dark:hover:bg-slate-700"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 dark:hover:bg-red-900/30"
          aria-label="Delete item"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
