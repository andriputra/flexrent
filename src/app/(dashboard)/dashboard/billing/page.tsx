import Link from "next/link"
import { AlertTriangle, ReceiptText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CancelSchedule } from "@/components/billing/cancel-schedule"
import { InvoicePayment } from "@/components/billing/invoice-payment"
import { PlanSwitcher, type PlanCard } from "@/components/billing/plan-switcher"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { InvoiceStatusBadge, SubscriptionStatusBadge } from "@/components/shared/status-badge"
import { daysToRenewal } from "@/lib/billing"
import { diffInCalendarDays, formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { isMidtransConfigured } from "@/lib/payments/midtrans"
import { requireTenant } from "@/lib/tenant"
import { getBillingOverview } from "@/server/queries/billing"

export const metadata = { title: "Langganan" }

const METHOD_LABELS: Record<string, string> = {
  CASH: "Tunai",
  BANK_TRANSFER: "Transfer",
  MIDTRANS: "Midtrans",
  OTHER: "Lainnya",
}

function fiturList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

type SearchParams = { invoice?: string; paid?: string }

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const context = await requireTenant()
  const params = await searchParams
  const billing = await getBillingOverview(context.tenant.id)

  const subscription = billing.subscription
  const plan = subscription?.plan ?? context.plan
  const onlineEnabled = isMidtransConfigured()
  const canManage = context.canManage

  const trialLeft =
    subscription?.status === "TRIALING" && subscription.trialEndsAt
      ? diffInCalendarDays(new Date(), subscription.trialEndsAt)
      : null
  const renewalLeft = subscription ? daysToRenewal(subscription.currentPeriodEnd) : null
  const openInvoice = billing.openInvoice

  const cards: PlanCard[] = billing.plans.map((option) => ({
    code: option.code,
    name: option.name,
    description: option.description,
    priceMonthly: option.priceMonthly,
    maxVehicles: option.maxVehicles,
    maxStaff: option.maxStaff,
    features: fiturList(option.features),
  }))

  return (
    <>
      <PageHeader
        title="Langganan"
        description="Paket yang dipakai rental ini, tagihan bulanan, dan riwayat pembayarannya."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/harga">Bandingkan paket</Link>
          </Button>
        }
      />

      {params?.paid === "1" ? (
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertDescription>
            Pembayaran sedang diproses Midtrans. Status tagihan berubah otomatis begitu notifikasi masuk — muat ulang
            halaman ini sebentar lagi.
          </AlertDescription>
        </Alert>
      ) : null}

      {!subscription ? (
        <EmptyState
          icon={<ReceiptText aria-hidden />}
          title="Langganan belum tersambung"
          description="Rental ini belum punya paket langganan. Pilih paket untuk mengaktifkan dashboard dan halaman publik."
          action={
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent-hover">
              <Link href="/harga">Lihat paket</Link>
            </Button>
          }
        />
      ) : (
        <>
          {subscription.status === "PAST_DUE" ? (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden />
              <AlertDescription>
                Tagihan lewat jatuh tempo sejak {formatDateId(subscription.pastDueAt ?? subscription.currentPeriodEnd, "d MMMM yyyy")}.
                Dashboard hanya bisa dibaca dan halaman publik tidak menerima pesanan sampai tagihan lunas.
              </AlertDescription>
            </Alert>
          ) : null}

          {subscription.cancelAtPeriodEnd ? (
            <Alert>
              <AlertTriangle aria-hidden />
              <AlertDescription>
                Langganan dijadwalkan berhenti {formatDateId(subscription.currentPeriodEnd, "d MMMM yyyy")}. Pakai
                tombol di bawah untuk melanjutkan.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="shadow-card">
            <CardContent className="grid gap-px overflow-hidden p-0 sm:grid-cols-2 lg:grid-cols-4">
              <Fact
                label="Paket aktif"
                value={plan?.name ?? "—"}
                hint={plan ? `${formatRupiah(plan.priceMonthly)} per bulan` : undefined}
              />
              <Fact
                label={subscription.status === "TRIALING" ? "Sisa masa uji" : "Sisa periode"}
                value={
                  trialLeft !== null
                    ? trialLeft > 0
                      ? `${trialLeft} hari`
                      : "Sudah habis"
                    : renewalLeft !== null && renewalLeft >= 0
                      ? `${renewalLeft} hari`
                      : `Lewat ${Math.abs(renewalLeft ?? 0)} hari`
                }
                hint={
                  trialLeft !== null && trialLeft > 0 && subscription.trialEndsAt
                    ? `Uji coba sampai ${formatDateId(subscription.trialEndsAt, "d MMMM yyyy")}`
                    : `Berakhir ${formatDateId(subscription.currentPeriodEnd, "d MMMM yyyy")}`
                }
              />
              <Fact
                label="Periode berjalan"
                value={formatDateId(subscription.currentPeriodStart, "d MMM")}
                hint={`sampai ${formatDateId(subscription.currentPeriodEnd, "d MMM yyyy")}`}
              />
              <div className="space-y-2 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <SubscriptionStatusBadge status={subscription.status} />
                <p className="text-xs text-muted-foreground">
                  {subscription.status === "TRIALING"
                    ? "Belum ada tagihan selama masa uji."
                    : subscription.status === "ACTIVE"
                      ? "Akses penuh, tagihan berikutnya terbit otomatis."
                      : subscription.status === "PAST_DUE"
                        ? "Lunasi tagihan terbuka untuk membuka akses."
                        : "Langganan sudah berhenti."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold">Tagihan {openInvoice ? openInvoice.number : "berikutnya"}</p>
                  <p className="text-sm text-muted-foreground">
                    {openInvoice
                      ? `Periode ${formatDateId(openInvoice.periodStart, "d MMM yyyy")} – ${formatDateId(openInvoice.periodEnd, "d MMM yyyy")} · jatuh tempo ${formatDateId(openInvoice.dueAt, "d MMMM yyyy")}`
                      : "Tagihan periode berikutnya terbit otomatis lewat cron saat periode ini habis."}
                  </p>
                </div>
                {openInvoice ? <InvoiceStatusBadge status={openInvoice.status} /> : <Badge variant="outline">Belum terbit</Badge>}
              </div>

              {openInvoice ? (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="space-y-0.5">
                      <dt className="text-muted-foreground">Total tagihan</dt>
                      <dd className="text-base font-semibold tabular-nums">{formatRupiah(openInvoice.amount)}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-muted-foreground">Sudah masuk</dt>
                      <dd className="text-base font-semibold tabular-nums">{formatRupiah(openInvoice.paidTotal)}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-muted-foreground">Sisa bayar</dt>
                      <dd className="text-base font-semibold tabular-nums text-danger">
                        {formatRupiah(Math.max(0, openInvoice.amount - openInvoice.paidTotal))}
                      </dd>
                    </div>
                  </dl>
                  <InvoicePayment
                    onlineEnabled={onlineEnabled}
                    canManage={canManage}
                    invoice={{
                      id: openInvoice.id,
                      number: openInvoice.number,
                      amount: openInvoice.amount,
                      remaining: Math.max(0, openInvoice.amount - openInvoice.paidTotal),
                      dueLabel: formatDateId(openInvoice.dueAt, "d MMMM yyyy"),
                    }}
                  />
                  {!onlineEnabled ? (
                    <p className="text-xs text-muted-foreground">
                      Pembayaran online belum dipasang di server ini, jadi hanya pencatatan manual yang tersedia.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tidak ada tagihan terbuka. Total tagihan berikutnya {plan ? formatRupiah(plan.priceMonthly) : "—"} per
                  bulan.
                </p>
              )}

              <div className="border-t pt-4">
                <CancelSchedule
                  cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                  endsLabel={formatDateId(subscription.currentPeriodEnd, "d MMMM yyyy")}
                  canManage={canManage}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Pilih paket</h2>
        <p className="text-sm text-muted-foreground">
          Ganti paket kapan saja. Perubahan berlaku mulai tagihan periode berikutnya — tagihan yang sudah terbit tidak
          diubah nilainya.
        </p>
        <PlanSwitcher
          plans={cards}
          currentCode={plan?.code ?? ""}
          usage={billing.usage}
          canManage={canManage}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Riwayat tagihan</h2>
        {billing.invoices.length === 0 ? (
          <EmptyState
            icon={<ReceiptText aria-hidden />}
            title="Belum ada tagihan"
            description="Tagihan pertama terbit otomatis saat masa uji atau periode berjalan berakhir."
            action={null}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jatuh tempo</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibayar lewat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs tracking-wider">{invoice.number}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateId(invoice.periodStart, "d MMM")} – {formatDateId(invoice.periodEnd, "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateId(invoice.dueAt, "d MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatRupiah(invoice.amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {invoice.paidTotal > 0 ? formatRupiah(invoice.paidTotal) : "—"}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.methods.map((method) => METHOD_LABELS[method] ?? method).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  )
}
