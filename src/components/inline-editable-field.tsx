'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditableFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'time' | 'number';
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  icon?: React.ReactNode;
  emptyText?: string;
}

export function InlineEditableField({
  value,
  onSave,
  type = 'text',
  placeholder,
  className,
  displayClassName,
  inputClassName,
  icon,
  emptyText = 'Click to add',
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue !== value && editValue.trim() !== '') {
      setIsSaving(true);
      try {
        await onSave(editValue);
      } catch {
        // Revert on error
        setEditValue(value);
      }
      setIsSaving(false);
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className={cn('inline-flex items-center gap-1', className)}>
        <input
          ref={inputRef}
          type={type === 'number' ? 'number' : type === 'time' ? 'time' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'bg-white border border-indigo-300 rounded px-2 py-0.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-w-[60px]',
            type === 'time' && 'w-[90px]',
            type === 'number' && 'w-[80px]',
            inputClassName
          )}
          disabled={isSaving}
          step={type === 'number' ? '0.01' : undefined}
        />
        {isSaving && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group inline-flex items-center gap-1 hover:bg-slate-100 rounded px-1 -mx-1 py-0.5 transition-colors cursor-pointer text-left',
        displayClassName
      )}
    >
      {icon}
      <span className={cn(!value && 'text-slate-400 italic')}>
        {value || emptyText}
      </span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
    </button>
  );
}
