import type { ReactNode } from "react"
import { cn } from "cn"

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent",
        className
      )}
    >
      <span aria-hidden className="h-px w-6 bg-accent/60" />
      {children}
    </p>
  )
}
