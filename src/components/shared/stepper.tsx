import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type Step = { title: string; description: string }

/**
 * Stepper alur booking. Langkah lama boleh dibuka lagi lewat tombol, tapi
 * langkah ke depan tidak bisa dilompati tanpa mengisi langkah sebelumnya.
 */
export function Stepper({
  steps,
  current,
  tone = "accent",
}: {
  steps: Step[]
  current: number
  tone?: "accent" | "neutral" | "success"
}) {
  const progress = ((current + 1) / steps.length) * 100
  const bars = {
    accent: "bg-accent",
    neutral: "bg-muted-foreground/45",
    success: "bg-success",
  } as const

  return (
    <div className="space-y-3">
      <ol className="grid gap-1.5 sm:grid-cols-4 sm:gap-2.5">
        {steps.map((step, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={step.title}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-[background-color,border-color,box-shadow,opacity] duration-300 motion-reduce:transition-none",
                active
                  ? tone === "neutral"
                    ? "border-border/70 bg-muted/50"
                    : "border-accent/50 bg-accent/12 shadow-[0_12px_26px_-20px_var(--accent)]"
                  : done
                    ? "border-success/25 bg-success/8"
                    : "border-border/50 opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-shadow duration-300 motion-reduce:transition-none",
                  done
                    ? "bg-success text-white"
                    : active
                      ? tone === "neutral"
                        ? "bg-muted-foreground/70 text-background"
                        : "bg-accent text-accent-foreground ring-4 ring-accent/20"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check aria-hidden className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm leading-5 font-medium">{step.title}</span>
                <span className="block truncate text-xs leading-4 text-muted-foreground">
                  {step.description}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", bars[tone])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
