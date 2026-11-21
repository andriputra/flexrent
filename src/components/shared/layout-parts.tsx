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
    <Card className="shadow-card">
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-5 text-muted-foreground">{label}</p>
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-primary [&_svg]:size-4">
            {icon}
          </span>
        </div>
        <p className="text-[1.75rem] leading-8 font-semibold tracking-tight">{value}</p>
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
