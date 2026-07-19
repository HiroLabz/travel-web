"use client";
// beui.dev/components/motion/switch

import { animate, motion, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Heavy, deliberate thumb — high mass keeps the travel weighty without wobble.
const THUMB_SPRING = { type: "spring", stiffness: 800, damping: 80, mass: 4 } as const;

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** DESIGN.md Switch sizes — Medium 36x20 (default), Large 44x24. */
  size?: "medium" | "large";
  id?: string;
  className?: string;
}

const TRACK_SIZE = {
  medium: "h-5 w-9",
  large: "h-6 w-11",
} as const;

const THUMB_SIZE = {
  medium: "h-4 w-4",
  large: "h-5 w-5",
} as const;

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  size = "medium",
  id: providedId,
  className,
}: SwitchProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const thumbRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [isPressed, setIsPressed] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  // Disabled shake feedback when pressed.
  useEffect(() => {
    if (!thumbRef.current || reduce) return;
    if (disabled && isPressed) {
      animate(
        thumbRef.current,
        { x: [0, -2, 2, -1, 0] },
        { delay: 0.2, duration: 0.6 },
      );
    }
  }, [disabled, isPressed, reduce]);

  const squish = !disabled && isPointer && isPressed && !reduce;

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : THUMB_SPRING}>
      <span className={cn("inline-flex items-center gap-3", className)}>
        <motion.button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onCheckedChange(!checked)}
          onPointerDown={(e) => {
            setIsPressed(true);
            setIsPointer(e.type.startsWith("pointer"));
          }}
          onPointerUp={() => setIsPressed(false)}
          onPointerLeave={() => setIsPressed(false)}
          initial={false}
          data-state={checked ? "checked" : "unchecked"}
          className={cn(
            "group peer inline-flex shrink-0 cursor-pointer items-center p-0.5 rounded-full outline-none transition-colors duration-200",
            TRACK_SIZE[size],
            "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-60",
            checked ? "justify-end bg-brand-500" : "justify-start bg-neutral-100",
          )}
        >
          <motion.div
            ref={thumbRef}
            layout
            animate={{ scale: squish ? 0.9 : 1 }}
            className={cn("pointer-events-none block rounded-full bg-white shadow-md", THUMB_SIZE[size])}
          >
            {/* Stretch toward the destination while active. */}
            <div
              className={cn(
                THUMB_SIZE[size],
                squish && (checked ? "ml-1" : "mr-1"),
              )}
            />
          </motion.div>
        </motion.button>
        {label ? (
          <label htmlFor={id} className="cursor-pointer text-sm text-foreground">
            {label}
          </label>
        ) : null}
      </span>
    </MotionConfig>
  );
}
