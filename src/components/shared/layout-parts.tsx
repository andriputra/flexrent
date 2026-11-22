import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl leading-8 font-semibold tracking-tight sm:text-[1.75rem] sm:leading-9">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("border-dashed bg-card/60 shadow-none", className)}>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
          {icon}
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

/** Kartu isi untuk halaman publik: permukaan kartu + garis tepi lembut. */
export function PublicPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5",
        className
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeading({
  icon,
  children,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  children: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-start gap-2.5", className)}>
      {icon ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <h2 className="font-display text-base leading-6 font-semibold tracking-tight">{children}</h2>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** Banner informasi berwarna — dipakai untuk status pesanan dan peringatan rental. */
export function Notice({
  icon,
  tone = "muted",
  children,
  className,
}: {
  icon?: ReactNode
  tone?: "muted" | "warning" | "info" | "danger"
  children: ReactNode
  className?: string
}) {
  const tones = {
    muted: "border-border/70 bg-muted/50",
    warning: "border-warning/30 bg-warning/10",
    info: "border-info/30 bg-info/10",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
  } as const
  const iconTone = {
    muted: "text-muted-foreground",
    warning: "text-warning",
    info: "text-info",
    danger: "text-destructive",
  } as const

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm leading-6",
        tones[tone],
        className
      )}
    >
      {icon ? (
        <span className={cn("mt-0.5 shrink-0 [&_svg]:size-4", iconTone[tone])} aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string
  value: string
  hint?: string
  icon: ReactNode
  trend?: { value: string; direction: "up" | "down" | "flat" }
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-danger"
        : "text-muted-foreground"

  return (
    <Card className="group relative overflow-hidden border-border/70 shadow-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-pop">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-5 text-muted-foreground">{label}</p>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/40 text-primary ring-1 ring-inset ring-border/60 transition-colors duration-300 [&_svg]:size-4 group-hover:bg-accent/15 group-hover:text-accent-hover">
            {icon}
          </span>
        </div>
        <p className="text-[1.75rem] leading-8 font-semibold tracking-tight tabular-nums">{value}</p>
        <div className="flex items-center gap-2 text-xs leading-4">
          {trend ? (
            <span className={cn("inline-flex items-center gap-1 font-medium", trendColor)}>
              {trend.direction === "down" ? (
                <ArrowDownRight aria-hidden />
              ) : trend.direction === "up" ? (
                <ArrowUpRight aria-hidden />
              ) : (
                <Minus aria-hidden />
              )}
              {trend.value}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
