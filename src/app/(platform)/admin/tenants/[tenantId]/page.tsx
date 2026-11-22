import Link from "next/link"
import { ArrowLeft, CalendarDays, Car, CreditCard, Users } from "lucide-react"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlatformTenantStatusButton } from "@/components/platform/platform-tenant-status-button"
import { PageHeader, SectionHeading } from "@/components/shared/layout-parts"
import { formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { requirePlatformAdmin } from "@/lib/platform"
import { getPlatformTenant } from "@/server/queries/platform"

function invoiceStatus(status: string) {
  return status === "PAID" ? "Lunas" : status === "OPEN" ? "Terbuka" : status === "CANCELLED" ? "Batal" : "Draft"
}

export default async function PlatformTenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  await requirePlatformAdmin()
  const { tenantId } = await params
  const tenant = await getPlatformTenant(tenantId)
  if (!tenant) notFound()

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/tenants"><ArrowLeft aria-hidden /> Kembali ke tenant</Link>
      </Button>

      <PageHeader
        title={tenant.name}
        description={`/${tenant.slug} · ${tenant.city} · terdaftar ${formatDateId(tenant.createdAt, "d MMM yyyy")}`}
        actions={<PlatformTenantStatusButton tenantId={tenant.id} tenantName={tenant.name} active={tenant.isActive} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Car aria-hidden className="size-4" /></span><div><p className="text-xs text-muted-foreground">Kendaraan</p><p className="text-xl font-bold tabular-nums">{tenant._count.vehicles}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users aria-hidden className="size-4" /></span><div><p className="text-xs text-muted-foreground">Pelanggan</p><p className="text-xl font-bold tabular-nums">{tenant._count.customers}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays aria-hidden className="size-4" /></span><div><p className="text-xs text-muted-foreground">Booking</p><p className="text-xl font-bold tabular-nums">{tenant._count.bookings}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard aria-hidden className="size-4" /></span><div><p className="text-xs text-muted-foreground">Pembayaran</p><p className="text-xl font-bold tabular-nums">{tenant._count.payments}</p></div></CardContent></Card>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><SectionHeading icon={<Users aria-hidden />}>Pengguna tenant</SectionHeading></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/60">
                {tenant.memberships.map((membership) => (
                  <li key={membership.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{membership.user.name || membership.user.email}</p><p className="truncate text-xs text-muted-foreground">{membership.user.email}</p></div>
                    <Badge variant={membership.role === "OWNER" ? "secondary" : "outline"}>{membership.role}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><SectionHeading icon={<CreditCard aria-hidden />}>Tagihan terbaru</SectionHeading></CardHeader>
            <CardContent className="p-0">
              {tenant.invoices.length ? (
                <ul className="divide-y divide-border/60">
                  {tenant.invoices.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium">{invoice.number}</p><p className="text-xs text-muted-foreground">Jatuh tempo {formatDateId(invoice.dueAt, "d MMM yyyy")}</p></div><div className="text-right"><p className="text-sm font-semibold tabular-nums">{formatRupiah(invoice.amount)}</p><Badge variant={invoice.status === "PAID" ? "secondary" : invoice.status === "CANCELLED" ? "destructive" : "outline"}>{invoiceStatus(invoice.status)}</Badge></div></li>
                  ))}
                </ul>
              ) : <p className="px-5 pb-5 text-sm text-muted-foreground">Belum ada tagihan.</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card lg:sticky lg:top-20">
          <CardHeader><CardTitle className="text-base">Status langganan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {tenant.subscription ? (
              <>
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Paket</span><Badge variant="secondary">{tenant.subscription.plan.name}</Badge></div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Status</span><Badge variant={tenant.subscription.status === "PAST_DUE" ? "destructive" : "outline"}>{tenant.subscription.status}</Badge></div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Tarif bulanan</span><span className="text-sm font-semibold tabular-nums">{formatRupiah(tenant.subscription.plan.priceMonthly)}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Periode berakhir</span><span className="text-sm tabular-nums">{formatDateId(tenant.subscription.currentPeriodEnd, "d MMM yyyy")}</span></div>
              </>
            ) : <p className="text-sm text-muted-foreground">Tenant ini belum memiliki langganan.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
