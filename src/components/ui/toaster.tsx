"use client"

import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { AnimatedToastStack, type AnimatedToast } from "@/components/motion/animated-toast-stack"

// Matches the Radix Toast default auto-dismiss delay this replaces.
const DEFAULT_DURATION = 5000

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const activeIds = new Set(toasts.filter((t) => t.open !== false).map((t) => t.id))
    timers.current.forEach((timer, id) => {
      if (!activeIds.has(id)) {
        clearTimeout(timer)
        timers.current.delete(id)
      }
    })
    activeIds.forEach((id) => {
      if (timers.current.has(id)) return
      const timer = setTimeout(() => dismiss(id), DEFAULT_DURATION)
      timers.current.set(id, timer)
    })
  }, [toasts, dismiss])

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach(clearTimeout)
      map.clear()
    }
  }, [])

  const mapped: AnimatedToast[] = toasts
    .filter((t) => t.open !== false)
    .map(({ id, title, description, variant }) => ({
      id,
      title,
      description,
      status: variant === "destructive" ? "error" : "success",
    }))

  return (
    <AnimatedToastStack
      toasts={mapped}
      onDismiss={dismiss}
      position="bottom-right"
      placement="fixed"
    />
  )
}
