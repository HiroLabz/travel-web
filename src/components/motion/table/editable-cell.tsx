"use client";

export function EditableCell({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (next: string) => void;
}) {
  return (
    <input
      value={value}
      aria-label={label}
      size={1}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Empty"
      className="-mx-2 w-full min-w-0 appearance-none rounded-md border-0 bg-transparent px-2 py-1 text-neutral-dark-900 outline-none transition-colors placeholder:text-neutral-500 focus:bg-neutral-50 focus:ring-1 focus:ring-brand-500"
    />
  );
}
