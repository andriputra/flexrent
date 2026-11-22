import Link from "next/link"
import { Activity, Building2, Car, CircleDollarSign, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, PageHeader, StatCard } from "@/components/shared/layout-parts"
import { formatRupiah } from "@/lib/format"
import { formatDateId } from "@/lib/datetime"
import { requirePlatformAdmin } from "@/lib/platform"
import { getPlatformOverview } from "@/server/queries/platform"

function subscriptionLabel(status: string | undefined) {
  if (!status) return "Belum berlangganan"
  return status === "TRIALING" ? "Trial" : status === "ACTIVE" ? "Aktif" : status === "PAST_DUE" ? "Tertunggak" : "Dibatalkan"
}

function subscriptionVariant(status: string | undefined): "default" | "secondary" | "destructive" | "outline" {
  return status === "ACTIVE" || status === "TRIALING" ? "secondary" : status === "PAST_DUE" ? "destructive" : "outline"
}

export default async function PlatformAdminPage() {
  await requirePlatformAdmin()
  const summary = await getPlatformOverview()

  return (
    <>
      <PageHeader
        title="Control center platform"
        description="Pantau tenant, langganan, penggunaan, dan aktivitas administratif Flexrent."
        actions={
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent-hover">
            <Link href="/admin/tenants">Kelola tenant</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total tenant" value={String(summary.tenantTotal)} hint={`${summary.activeTenantTotal} aktif`} icon={<Building2 aria-hidden />} />
        <StatCard label="Pengguna" value={String(summary.userTotal)} hint="Semua akun terdaftar" icon={<Users aria-hidden />} />
        <StatCard label="Kendaraan" value={String(summary.vehicleTotal)} hint="Lintas tenant" icon={<Car aria-hidden />} />
        <StatCard label="Booking" value={String(summary.bookingTotal)} hint="Semua status" icon={<Activity aria-hidden />} />
        <StatCard label="MRR indikatif" value={formatRupiah(summary.recurringRevenue)} hint="Paket aktif/trial" icon={<CircleDollarSign aria-hidden />} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Tenant terbaru</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Pendaftaran rental terakhir di platform.</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/tenants">Lihat semua</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {summary.recentTenants.length === 0 ? (
              <EmptyState icon={<Building2 aria-hidden />} title="Belum ada tenant" description="Tenant baru akan muncul di sini." />
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table w-full min-w-[650px]">
                  <thead><tr><th>Tenant</th><th>Status</th><th>Paket</th><th>Aktivitas</th><th /></tr></thead>
                  <tbody>
                    {summary.recentTenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td><div className="font-medium">{tenant.name}</div><div className="text-xs text-muted-foreground">/{tenant.slug} · {tenant.city}</div></td>
                        <td><Badge variant={tenant.isActive ? "secondary" : "destructive"}>{tenant.isActive ? "Aktif" : "Suspend"}</Badge></td>
                        <td><Badge variant={subscriptionVariant(tenant.subscription?.status)}>{tenant.subscription?.plan.name ?? "—"}</Badge><div className="mt-1 text-xs text-muted-foreground">{subscriptionLabel(tenant.subscription?.status)}</div></td>
                        <td className="text-xs text-muted-foreground">{tenant._count.vehicles} kendaraan · {tenant._count.bookings} booking</td>
                        <td className="text-right"><Button asChild variant="outline" size="xs"><Link href={`/admin/tenants/${tenant.id}`}>Detail</Link></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Aktivitas admin</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Perubahan penting yang tercatat platform.</p>
          </CardHeader>
          <CardContent className="p-0">
            {summary.recentAuditLogs.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">Belum ada aktivitas administratif.</p>
            ) : (
              <ul className="divide-y">
                {summary.recentAuditLogs.map((log) => (
                  <li key={log.id} className="space-y-1 px-5 py-3">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.tenant?.name ?? log.entityType} · {log.actor.name ?? log.actor.email ?? "Akun"}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{formatDateId(log.createdAt, "d MMM yyyy HH:mm")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
