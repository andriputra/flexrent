"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"
import { changePlanAction } from "@/server/actions/billing"

export type PlanOption = {
  code: string
  name: string
  description: string | null
  priceMonthly: number
  maxVehicles: number
  maxStaff: number
}

export type PlanCard = PlanOption & { features: string[] }

/**
 * Pilih paket. Kartu yang tidak muat dipakai armada saat ini dinonaktifkan dengan
 * alasan yang jelas, supaya staf tidak perlu menebak kenapa tombolnya mati.
 */
export function PlanSwitcher({
  plans,
  currentCode,
  usage,
  canManage,
}: {
  plans: PlanCard[]
  currentCode: string
  usage: { vehicles: number; staff: number }
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function pick(code: string) {
    setPending(code)
    const result = await changePlanAction(code)
    setPending(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Paket ${result.data.name} dipilih. Tagihan berikutnya mengikuti harga paket ini.`)
    router.refresh()
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const active = plan.code === currentCode
        const tooSmall = usage.vehicles > plan.maxVehicles || usage.staff > plan.maxStaff
        const reason =
          usage.vehicles > plan.maxVehicles
            ? `Armada Anda ${usage.vehicles} unit, paket ini ${plan.maxVehicles} unit.`
            : usage.staff > plan.maxStaff
              ? `Tim Anda ${usage.staff} orang, paket ini ${plan.maxStaff} akun.`
              : null

        return (
          <Card
            key={plan.code}
            className={cn(
              "group relative overflow-hidden transition-[border-color,box-shadow,transform] duration-300",
              active
                ? "border-accent/70 shadow-pop ring-1 ring-accent/20"
                : "border-border/70 shadow-card hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-pop"
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/20"
              />
            ) : null}
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-semibold">{plan.name}</p>
                  {plan.description ? <p className="text-xs text-muted-foreground">{plan.description}</p> : null}
                </div>
                {active ? (
                  <Badge variant="secondary" className="border-transparent bg-accent/15 text-accent-foreground">
                    Paket aktif
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-0.5">
                <p className="text-xl font-semibold tabular-nums">{formatRupiah(plan.priceMonthly)}</p>
                <p className="text-xs text-muted-foreground">per bulan</p>
              </div>

              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <Check aria-hidden className="size-4 shrink-0 text-success" />
                  {plan.maxVehicles} kendaraan · {plan.maxStaff} akun staf
                </li>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {active ? (
                <p className="text-xs text-muted-foreground">Paket yang sedang berjalan.</p>
              ) : (
                <>
                  <Button
                    type="button"
                    variant={tooSmall ? "outline" : "default"}
                    disabled={!canManage || tooSmall || pending !== null}
                    onClick={() => pick(plan.code)}
                    className={cn("w-full", !tooSmall && "bg-accent text-accent-foreground hover:bg-accent-hover")}
                  >
                    {pending === plan.code ? "Mengubah…" : `Pakai paket ${plan.name}`}
                  </Button>
                  <p className={cn("text-xs", reason ? "text-warning" : "text-muted-foreground")}>
                    {reason ?? "Berlaku mulai tagihan periode berikutnya."}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
