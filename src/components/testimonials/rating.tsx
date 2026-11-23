"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const LABELS = ["Sangat buruk", "Buruk", "Cukup", "Baik", "Sangat baik"]

/** Bintang baca-saja. Nilai pecahan dibulatkan ke nearest supaya rata-rata 4,6 tampil penuh 5. */
export function RatingStars({
  value,
  size = "size-3.5",
  className,
}: {
  value: number
  size?: string
  className?: string
}) {
  const filled = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <span
      role="img"
      aria-label={`Rating ${value.toFixed(1).replace(".", ",")} dari 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          aria-hidden
          className={cn(
            size,
            step <= filled ? "fill-current text-warning" : "text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  )
}

/**
 * Pemilih rating untuk formulir. Memakai radiogroup, bukan bintang klik-semu:
 * keyboard dan pembaca layar hanya pernah menanyakan satu pertanyaan
 * ("Rating: Baik") alih-alih lima tombol tanpa konteks.
 */
export function RatingPicker({
  value,
  onChange,
  disabled,
  size = "size-6",
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  size?: string
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((step) => {
        const active = step <= value
        return (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={value === step}
            aria-label={`${step} dari 5 — ${LABELS[step - 1]}`}
            disabled={disabled}
            onClick={() => onChange(step)}
            className={cn(
              "rounded-md p-0.5 transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              value === step && "ring-2 ring-warning/45"
            )}
          >
            <Star
              aria-hidden
              className={cn(size, active ? "fill-current text-warning" : "text-muted-foreground/40")}
            />
          </button>
        )
      })}
      <span aria-hidden className="ml-1 text-xs font-medium text-muted-foreground tabular-nums">
        {value > 0 ? `${value}/5` : "Belum dinilai"}
      </span>
    </div>
  )
}
