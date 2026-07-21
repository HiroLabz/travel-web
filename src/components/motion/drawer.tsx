"use client";
// beui.dev/components/motion/drawer

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, type HTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { EASE_OUT, SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  children: ReactNode;
  /** Class for the panel surface. */
  className?: string;
  /** Class for the backdrop. */
  backdropClassName?: string;
  ariaLabel?: string;
  /** Close when the backdrop is clicked. Default true. */
  dismissable?: boolean;
}

const DrawerContext = createContext<{ onOpenChange: (open: boolean) => void } | null>(null);

export function Drawer({
  open,
  onOpenChange,
  side = "right",
  children,
  className,
  backdropClassName,
  ariaLabel,
  dismissable = true,
}: DrawerProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  const offscreen = side === "right" ? "100%" : "-100%";

  return (
    <DrawerContext.Provider value={{ onOpenChange }}>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50">
            <motion.button
              type="button"
              aria-label="Close"
              tabIndex={dismissable ? 0 : -1}
              onClick={() => dismissable && onOpenChange(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className={cn(
                "absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-sm",
                backdropClassName,
              )}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              initial={reduce ? { opacity: 0 } : { x: offscreen }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: offscreen }}
              transition={reduce ? { duration: 0.2, ease: EASE_OUT } : SPRING_PANEL}
              className={cn(
                "absolute inset-y-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-xsl",
                side === "right"
                  ? "right-0 border-l border-neutral-100"
                  : "left-0 border-r border-neutral-100",
                className,
              )}
            >
              {children}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </DrawerContext.Provider>
  );
}

export function DrawerContent({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("relative flex h-full flex-col gap-4 overflow-y-auto p-6", className)}>
      {children}
    </div>
  );
}

export function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-left", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-neutral-dark-900", className)} {...props} />;
}

export function DrawerDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-neutral-600", className)} {...props} />;
}

export function DrawerClose({ className }: { className?: string }) {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("DrawerClose must be used within <Drawer>");
  return (
    <button
      type="button"
      onClick={() => ctx.onOpenChange(false)}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        className,
      )}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}
