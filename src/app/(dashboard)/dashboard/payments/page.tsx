import Link from "next/link"
import { ReceiptText } from "lucide-react"
import type { PaymentKind, PaymentMethod, PaymentStatus } from "@prisma/client"
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
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { PaymentStatusBadge } from "@/components/shared/status-badge"
import { PaymentFilterBar } from "@/components/payments/payment-filter-bar"
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog"
import { formatDateTimeId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { requireTenant } from "@/lib/tenant"
import { getPayableBookingOptions, listPayments } from "@/server/queries/payments"

export const metadata = { title: "Pembayaran" }

type SearchParams = { status?: string; metode?: string; cari?: string; page?: string }

const STATUSES: PaymentStatus[] = ["SETTLED", "PENDING", "FAILED", "EXPIRED", "REFUNDED"]
const METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "MIDTRANS", "OTHER"]

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  BANK_TRANSFER: "Transfer",
  MIDTRANS: "Midtrans",
  OTHER: "Lainnya",
}

function kindLabel(kind: PaymentKind): string {
  return kind === "RENTAL" ? "Sewa" : kind === "DEPOSIT" ? "Deposit" : "Langganan"
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const context = await requireTenant()
  const params = await searchParams

  const status = STATUSES.includes(params.status as PaymentStatus) ? (params.status as PaymentStatus) : undefined
  const method = METHODS.includes(params.metode as PaymentMethod) ? (params.metode as PaymentMethod) : undefined
  const cari = params.cari?.trim() || undefined

  const pageHref = (target: number) => {
    const query = new URLSearchParams()
    if (status) query.set("status", status)
    if (method) query.set("metode", method)
    if (cari) query.set("cari", cari)
    if (target > 1) query.set("page", String(target))
    const suffix = query.toString()
    return `/dashboard/payments${suffix ? `?${suffix}` : ""}`
  }

  const [{ rows, total, monthSettled, page, totalPages }, options] = await Promise.all([
    listPayments(context.tenant.id, { status, method, q: cari, page: Math.max(1, Number(params.page ?? 1) || 1) }),
    getPayableBookingOptions(context.tenant.id),
  ])

  return (
    <>
      <PageHeader
        title="Pembayaran"
        description="Semua transaksi masuk: tunai, transfer, dan Midtrans. Status lunas dihitung dari jumlah yang benar-benar tercatat."
        actions={<RecordPaymentDialog options={options} readOnly={context.isReadOnly} />}
      />

      <PaymentFilterBar total={total} monthSettled={formatRupiah(monthSettled)} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptText aria-hidden />}
          title={total === 0 ? "Belum ada pembayaran" : "Tidak ada pembayaran yang cocok"}
          description={
            total === 0
              ? "Catat pembayaran tunai atau transfer di sini, atau aktifkan Midtrans agar pelanggan bisa bayar sendiri."
              : "Ubah filter status, metode, atau kata kunci untuk melihat transaksi lain."
          }
          action={null}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pesanan</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Dicatat oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatDateTimeId(payment.paidAt ?? payment.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-sm tracking-wider">{payment.booking?.code ?? "—"}</p>
                      <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                        {payment.booking?.customerName ?? "Langganan"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{kindLabel(payment.kind)}</TableCell>
                    <TableCell className="text-sm">
                      {METHOD_LABELS[payment.method]}
                      {payment.refCode ? (
                        <p className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">{payment.refCode}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatRupiah(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.recordedBy?.name ?? (payment.method === "MIDTRANS" ? "Midtrans" : "Sistem")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((payment) => (
              <li key={payment.id}>
                <Card className="shadow-card">
                  <CardContent className="space-y-2 px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm tracking-wider">{payment.booking?.code ?? "Langganan"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {payment.booking?.customerName ?? "—"}
                        </p>
                      </div>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                    <p className="text-base font-semibold tabular-nums">{formatRupiah(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabel(payment.kind)} · {METHOD_LABELS[payment.method]} ·{" "}
                      {formatDateTimeId(payment.paidAt ?? payment.createdAt)}
                    </p>
                    {payment.refCode ? (
                      <p className="font-mono text-xs text-muted-foreground">{payment.refCode}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <nav aria-label="Navigasi halaman" className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={pageHref(page - 1)}>Sebelumnya</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={pageHref(page + 1)}>Berikutnya</Link>
                  </Button>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </>
  )
}
