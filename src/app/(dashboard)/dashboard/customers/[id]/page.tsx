import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Ban, FileText, History, ShieldCheck, ShieldOff, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/layout-parts"
import {
  BookingPaymentBadge,
  BookingStatusBadge,
  DepositStatusBadge,
} from "@/components/shared/status-badge"
import { BlacklistButton } from "@/components/customers/customer-row-actions"
import { DocumentVerifyButton } from "@/components/customers/document-verify-button"
import { formatDateId, formatDateTimeId } from "@/lib/datetime"
import { DOCUMENT_LABEL, documentViewLink } from "@/lib/documents"
import { formatRupiah } from "@/lib/format"
import { requireTenant } from "@/lib/tenant"
import { getCustomerDetail, getCustomerHistory } from "@/server/queries/customers"
import { bookingMoney } from "@/server/queries/bookings"

export const metadata = { title: "Profil pelanggan — Flexrent" }

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-right">{value}</dd>
    </div>
  )
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireTenant()
  const { id } = await params
  const [customer, orderCount] = await Promise.all([
    getCustomerDetail(context.tenant.id, id),
    getCustomerHistory(context.tenant.id, id),
  ])
  if (!customer) notFound()

  const shown = customer.bookings
  const shownValue = shown.reduce((sum, booking) => sum + booking.totalAmount, 0)
  const totals = shown.reduce(
    (sum, booking) => {
      const money = bookingMoney(booking)
      return { outstanding: sum.outstanding + money.outstanding, held: sum.held + money.depositOutstanding }
    },
    { outstanding: 0, held: 0 }
  )
  const verified = customer.documents.filter((document) => document.isVerified)

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          <>
            <span className="tabular-nums">{customer.phone}</span>
            {customer.email ? <span> · {customer.email}</span> : null}
            {customer.city ? <span> · {customer.city}</span> : null}
            {customer.isBlacklisted ? (
              <Badge variant="outline" className="ml-2 border-transparent bg-danger/12 text-danger align-middle">
                <Ban aria-hidden className="size-3" />
                Daftar hitam
              </Badge>
            ) : null}
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/customers">
                <ArrowLeft aria-hidden />
                Semua pelanggan
              </Link>
            </Button>
            <BlacklistButton
              customer={{
                id: customer.id,
                name: customer.name,
                isBlacklisted: customer.isBlacklisted,
                blacklistReason: customer.blacklistReason,
              }}
              readOnly={context.isReadOnly}
            />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History aria-hidden className="size-4 text-muted-foreground" />
                Riwayat sewa
              </CardTitle>
              <CardDescription>
                {orderCount} pesanan tercatat tanpa pembatalan. Daftar di bawah 50 pesanan terbaru, termasuk yang
                dibatalkan, supaya pola keterlambatan terlihat.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {shown.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Pelanggan ini belum pernah memesan.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Pesanan</TableHead>
                      <TableHead>Kendaraan</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[180px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((booking) => {
                      const money = bookingMoney(booking)
                      return (
                      <TableRow key={booking.id}>
                        <TableCell className="pl-5">
                          <Link
                            href={`/dashboard/bookings/${booking.code}`}
                            className="font-mono text-sm tracking-wider hover:underline"
                          >
                            {booking.code}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {booking.vehicle.brand} {booking.vehicle.model}
                          <p className="font-mono text-xs text-muted-foreground">{booking.vehicle.plate}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDateId(booking.startsAt, "d MMM yyyy")} → {formatDateId(booking.endsAt, "d MMM yyyy")}
                          <p>{booking.days} hari</p>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatRupiah(booking.totalAmount)}
                          {booking.lateFee + booking.damageFee > 0 ? (
                            <p className="text-xs text-warning">
                              denda {formatRupiah(booking.lateFee + booking.damageFee)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="space-y-1">
                          <BookingStatusBadge status={booking.status} />
                          <div className="flex flex-wrap gap-1">
                            <BookingPaymentBadge status={booking.paymentStatus} />
                            {money.depositHeld > 0 ? (
                              <DepositStatusBadge status={booking.depositStatus} />
                            ) : booking.depositAmount > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                deposit {formatRupiah(booking.depositAmount)} belum diterima
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText aria-hidden className="size-4 text-muted-foreground" />
                Dokumen identitas
              </CardTitle>
              <CardDescription>
                {verified.length > 0
                  ? `${verified.length} dokumen sudah disetujui staf.`
                  : "Belum ada dokumen yang disetujui — cocokkan foto KTP dan SIM sebelum sewa dimulai."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada dokumen tersimpan untuk nomor WhatsApp ini.
                </p>
              ) : (
                <ul className="divide-y">
                  {customer.documents.map((document) => (
                    <li key={document.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                          {DOCUMENT_LABEL[document.type] ?? document.type}
                          <span className="truncate font-normal text-muted-foreground">{document.fileName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Diunggah {formatDateTimeId(document.createdAt)}
                          {document.isVerified && document.verifiedAt ? ` · disetujui ${formatDateId(document.verifiedAt, "d MMM yyyy HH:mm")}` : ""}
                          {document.bookingId ? " · dari pesanan" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            document.isVerified
                              ? "border-transparent bg-success/12 text-success"
                              : "border-transparent bg-muted text-muted-foreground"
                          }
                        >
                          {document.isVerified ? (
                            <ShieldCheck aria-hidden className="size-3" />
                          ) : (
                            <ShieldOff aria-hidden className="size-3" />
                          )}
                          {document.isVerified ? "Terverifikasi" : "Menunggu"}
                        </Badge>
                        <Button asChild variant="outline" size="xs">
                          <a href={documentViewLink(document.id)} target="_blank" rel="noreferrer">
                            Buka
                          </a>
                        </Button>
                        <DocumentVerifyButton
                          documentId={document.id}
                          isVerified={document.isVerified}
                          fileName={document.fileName}
                          readOnly={context.isReadOnly}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="shadow-card lg:sticky lg:top-5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ringkasan</CardTitle>
              <CardDescription>Dihitung dari 50 pesanan terakhir yang tampil di halaman ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-0.5">
                <Row label="Pesanan (tanpa batal)" value={<span className="tabular-nums">{orderCount}</span>} />
                <Row label="Ditampilkan" value={<span className="tabular-nums">{shown.length}</span>} />
                <Row label="Nilai pesanan" value={<span className="tabular-nums">{formatRupiah(shownValue)}</span>} />
                <Row label="Sisa bayar" value={<span className="tabular-nums">{formatRupiah(totals.outstanding)}</span>} />
                <Row label="Deposit tertahan" value={<span className="tabular-nums">{formatRupiah(totals.held)}</span>} />
                {customer.address ? <Row label="Alamat" value={customer.address} /> : null}
                <Row label="Terdaftar" value={formatDateId(customer.createdAt, "d MMM yyyy")} />
                {customer.notes ? <Row label="Catatan internal" value={customer.notes} /> : null}
              </dl>

              <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Wallet aria-hidden className="size-4 shrink-0" />
                Nilai pesanan bukan uang yang benar-benar masuk. Cek menu Pembayaran untuk penerimaan riil.
              </div>
            </CardContent>
          </Card>

          {customer.isBlacklisted ? (
            <Card className="border-danger/40 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-danger">
                  <Ban aria-hidden className="size-4" />
                  Daftar hitam
                </CardTitle>
                <CardDescription>{customer.blacklistReason ?? "Alasan tidak dicatat."}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Pelanggan ini tidak bisa membuat pesanan baru lewat halaman publik. Cabut blokir bila sudah
                  beres.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}
