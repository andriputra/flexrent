import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type Step = { title: string; description: string }

/**
 * Stepper alur booking. Langkah lama boleh dibuka lagi lewat tombol, tapi
 * langkah ke depan tidak bisa dilompati tanpa mengisi langkah sebelumnya.
 */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="grid gap-1 sm:grid-cols-4 sm:gap-3">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={step.title}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors motion-reduce:transition-none",
              active ? "border-accent bg-accent/10" : done ? "bg-muted/40" : "opacity-60"
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                done
                  ? "bg-success text-white"
                  : active
                    ? "bg-accent text-accent-foreground"
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
  )
}
