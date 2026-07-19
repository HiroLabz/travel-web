"use client";
// beui.dev/components/motion/input

import { motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
// transitions.dev — error state shake. Owns the border-color tween, the
// shake keyframes, and the error message reveal; this component only
// toggles the classes documented in that file.
import "@/styles/transitions/error-shake.css";

export type InputClassNames = {
  root?: string;
  label?: string;
  field?: string;
  input?: string;
  leftIcon?: string;
  rightIcon?: string;
  successIcon?: string;
  errorMessage?: string;
};

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> {
  label?: string;
  // Matches native <input>'s own value type (number inputs commonly pass a
  // number directly), coerced to a string internally.
  value?: string | number;
  defaultValue?: string | number;
  // Kept as the native DOM change event (not beUI's original value-only
  // callback) so this is a drop-in replacement for every existing call site
  // — including react-hook-form's register(), which relies on this shape.
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Truthy error triggers a shake, red border and (if a string) a message. */
  error?: string | boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  classNames?: InputClassNames;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
    success,
    leftIcon,
    rightIcon,
    className,
    classNames,
    disabled,
    id: idProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const reduce = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(String(defaultValue ?? ""));
  const value = controlled ? String(valueProp ?? "") : internal;

  const [focused, setFocused] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);

  const hasError = Boolean(error);
  const errorMessage = typeof error === "string" ? error : null;

  // Right edge shows the success check, otherwise the caller's right icon.
  const rightSlot = success ? null : rightIcon;

  // Once a field has errored, keep the message mounted (transitions.dev's
  // CSS fades it via opacity/visibility, not display, so it still needs a
  // box to fade) and hold the last real text through that fade instead of
  // blanking instantly when the error clears. Pristine fields that have
  // never errored render no box at all, so they don't carry extra blank
  // space under every input on every page.
  const [hasErrored, setHasErrored] = useState(Boolean(errorMessage));
  const [displayedError, setDisplayedError] = useState(errorMessage);
  useEffect(() => {
    if (errorMessage) {
      setHasErrored(true);
      setDisplayedError(errorMessage);
    }
  }, [errorMessage]);

  // Replay the shake (transitions.dev — error state shake) whenever a new
  // error appears. Tracks the last error we've already shaken for so it
  // doesn't replay on unrelated re-renders while the same error is shown.
  const shookForRef = useRef<string | boolean>(false);
  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) return;
    const key = errorMessage ?? true;
    if (shookForRef.current === key) return;
    shookForRef.current = key;
    const el = fieldRef.current;
    el.classList.remove("is-shaking");
    void el.offsetWidth; // force reflow so the animation can replay
    el.classList.add("is-shaking");
  }, [hasError, errorMessage, reduce]);
  useEffect(() => {
    if (!hasError) shookForRef.current = false;
  }, [hasError]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternal(e.target.value);
    onChange?.(e);
  };

  return (
    <div
      className={cn(
        "t-input-wrap flex flex-col gap-1.5",
        hasError && "is-error",
        classNames?.root,
      )}
    >
      {label ? (
        <label
          htmlFor={id}
          className={cn(
            "px-1 text-sm font-medium text-brand-800",
            classNames?.label,
          )}
        >
          {label}
        </label>
      ) : null}

      <div
        ref={fieldRef}
        data-state={
          hasError
            ? "error"
            : success
              ? "success"
              : focused
                ? "focused"
                : "idle"
        }
        className={cn(
          "t-input relative h-11 overflow-hidden rounded-[10px] border bg-brand-subtle",
          "border-neutral-100",
          focused && !hasError && "border-brand-500 ring-2 ring-brand-100",
          hasError && "is-error border-danger-600 ring-2 ring-danger-100",
          disabled && "opacity-60",
          className,
          classNames?.field,
        )}
      >
        {leftIcon ? (
          <span
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-neutral-600 [&_svg]:h-4 [&_svg]:w-4",
              classNames?.leftIcon,
            )}
          >
            {leftIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={id}
          type={type}
          // File inputs must stay genuinely uncontrolled — browsers don't
          // allow scripts to set their value.
          value={type === "file" ? undefined : value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          {...rest}
          onChange={handleChange}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "peer h-full w-full bg-transparent text-base leading-6 text-neutral-dark-900 caret-brand-500 outline-none",
            "placeholder:text-neutral-600",
            leftIcon ? "pl-10" : "pl-3.5",
            rightSlot || success ? "pr-10" : "pr-3.5",
            disabled && "cursor-not-allowed",
            classNames?.input,
          )}
        />

        {success ? (
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            className={cn(
              "absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-success-600",
              classNames?.successIcon,
            )}
          >
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </motion.svg>
        ) : rightSlot ? (
          <span
            className={cn(
              "absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-neutral-600 [&_svg]:h-4 [&_svg]:w-4",
              classNames?.rightIcon,
            )}
          >
            {rightSlot}
          </span>
        ) : null}
      </div>

      {hasErrored ? (
        <p
          id={`${id}-error`}
          role="alert"
          className={cn(
            "t-error-msg px-1 text-xs text-danger-500",
            classNames?.errorMessage,
          )}
        >
          {displayedError}
        </p>
      ) : null}
    </div>
  );
});
