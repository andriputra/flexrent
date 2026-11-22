import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/layout-parts"
import { PlatformPlanForm } from "@/components/platform/platform-plan-form"
import { formatRupiah } from "@/lib/format"
import { requirePlatformAdmin } from "@/lib/platform"
import { listPlatformPlans } from "@/server/queries/platform"

export default async function PlatformPlansPage() {
  await requirePlatformAdmin()
  const plans = await listPlatformPlans()

  return (
    <>
      <PageHeader title="Paket langganan" description="Atur harga, batas penggunaan, dan visibilitas paket SaaS." />
      {plans.length === 0 ? (
        <Card><CardContent><p className="text-sm text-muted-foreground">Belum ada paket langganan.</p></CardContent></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="shadow-card">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package aria-hidden className="size-4" /></span><Badge variant={plan.isPublic ? "secondary" : "outline"}>{plan.isPublic ? "Publik" : "Tersembunyi"}</Badge></div>
                <div><CardTitle className="text-lg">{plan.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{plan.description || "Paket Flexrent"}</p></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted/40 p-3"><p className="text-2xl font-bold tabular-nums">{formatRupiah(plan.priceMonthly)}<span className="text-xs font-medium text-muted-foreground"> / bulan</span></p><p className="mt-1 text-xs text-muted-foreground">{plan._count.subscriptions} tenant berlangganan</p></div>
                <PlatformPlanForm plan={{ id: plan.id, priceMonthly: plan.priceMonthly, priceYearly: plan.priceYearly, maxVehicles: plan.maxVehicles, maxStaff: plan.maxStaff, isPublic: plan.isPublic }} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
