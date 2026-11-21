"use client"

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react"
import { cn } from "cn"

export function SpotlightCard({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || event.pointerType !== "mouse") return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`)
    el.style.setProperty("--my", `${event.clientY - rect.top}px`)
  }

  return (
    <div ref={ref} onPointerMove={handlePointerMove} className={cn("spotlight", className)} style={style}>
      {children}
    </div>
  )
}
