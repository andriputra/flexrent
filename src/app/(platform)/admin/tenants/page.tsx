import Link from "next/link"
import { Plus, Search, Store } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { PlatformTenantStatusButton } from "@/components/platform/platform-tenant-status-button"
import { formatRupiah } from "@/lib/format"
import { formatDateId } from "@/lib/datetime"
import { requirePlatformAdmin } from "@/lib/platform"
import { listPlatformTenants } from "@/server/queries/platform"

function planStatus(status: string | undefined) {
  return status === "ACTIVE" ? "Aktif" : status === "TRIALING" ? "Trial" : status === "PAST_DUE" ? "Tertunggak" : status === "CANCELLED" ? "Dibatalkan" : "Belum ada"
}

export default async function PlatformTenantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePlatformAdmin()
  const query = await searchParams
  const search = typeof query.q === "string" ? query.q : ""
  const tenants = await listPlatformTenants(search)

  return (
    <>
      <PageHeader
        title="Semua tenant"
        description="Kelola status rental dan lihat kesehatan langganan di satu tempat."
        actions={
          <Button asChild>
            <Link href="/admin/tenants/new">
              <Plus aria-hidden className="size-4" />
              Daftarkan tenant baru
            </Link>
          </Button>
        }
      />

      <form className="flex flex-col gap-2 sm:flex-row" method="get">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={search} placeholder="Cari nama, slug, kota, atau email…" className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Cari tenant</Button>
        {search ? <Button asChild type="button" variant="ghost"><Link href="/admin/tenants">Reset</Link></Button> : null}
      </form>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <EmptyState icon={<Store aria-hidden />} title="Tenant tidak ditemukan" description="Coba kata kunci lain atau kosongkan filter pencarian." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border/70 bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tenant</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Langganan</th>
                    <th className="px-4 py-3 font-medium">Penggunaan</th>
                    <th className="px-4 py-3 font-medium">Terdaftar</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="transition-colors hover:bg-muted/25">
                      <td className="px-4 py-3">
                        <Link href={`/admin/tenants/${tenant.id}`} className="font-medium hover:text-primary">{tenant.name}</Link>
                        <p className="text-xs text-muted-foreground">/{tenant.slug} · {tenant.city}</p>
                      </td>
                      <td className="px-4 py-3"><Badge variant={tenant.isActive ? "secondary" : "destructive"}>{tenant.isActive ? "Aktif" : "Suspend"}</Badge></td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{tenant.subscription?.plan.name ?? "Belum ada"}</p>
                        <p className="text-xs text-muted-foreground">{planStatus(tenant.subscription?.status)}{tenant.subscription?.plan.priceMonthly ? ` · ${formatRupiah(tenant.subscription.plan.priceMonthly)}/bln` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tenant._count.vehicles} kendaraan · {tenant._count.bookings} booking · {tenant._count.invoices} tagihan</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{formatDateId(tenant.createdAt, "d MMM yyyy")}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button asChild size="xs" variant="outline"><Link href={`/admin/tenants/${tenant.id}`}>Detail</Link></Button><PlatformTenantStatusButton tenantId={tenant.id} tenantName={tenant.name} active={tenant.isActive} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
