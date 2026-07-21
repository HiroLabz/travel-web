"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/motion/input";
import { Button } from "@/components/ui/button";
import { ChecklistItemRow } from "@/components/checklist-item-row";
import type { ChecklistItem } from "@/types";

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  maxItems?: number;
  placeholder?: string;
}

export function ChecklistEditor({
  items,
  onChange,
  maxItems = 20,
  placeholder = "Add item...",
}: ChecklistEditorProps) {
  const [newItemText, setNewItemText] = useState("");

  const handleAddItem = () => {
    if (!newItemText.trim() || items.length >= maxItems) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      completed: false,
      order: items.length,
      createdAt: new Date().toISOString(),
    };

    onChange([...items, newItem]);
    setNewItemText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleToggle = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDelete = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    // Reorder remaining items
    onChange(filtered.map((item, index) => ({ ...item, order: index })));
  };

  const handleTextChange = (id: string, text: string) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[newIndex];
    newItems[newIndex] = temp;

    // Update order values
    onChange(newItems.map((item, i) => ({ ...item, order: i })));
  };

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-2">
      {/* Add new item input */}
      <div className="flex gap-2">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          maxLength={100}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleAddItem}
          disabled={!newItemText.trim() || items.length >= maxItems}
          aria-label="Add item"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Items list */}
      <div className="space-y-1">
        {sortedItems.map((item, index) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => handleToggle(item.id)}
            onDelete={() => handleDelete(item.id)}
            onTextChange={(text) => handleTextChange(item.id, text)}
            onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
            onMoveDown={
              index < sortedItems.length - 1
                ? () => handleMove(index, 1)
                : undefined
            }
          />
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          No items yet. Add things to pack or tasks to complete.
        </p>
      )}

      {/* Limit warning */}
      {items.length >= maxItems && (
        <p className="text-xs text-warning-accent text-center">
          Maximum {maxItems} items reached.
        </p>
      )}
    </div>
  );
}
