import Link from "next/link"
import { notFound } from "next/navigation"
import type { PaymentKind, PaymentMethod } from "@prisma/client"
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Handshake,
  Receipt,
  User,
  Wallet,
} from "lucide-react"
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
  PaymentStatusBadge,
} from "@/components/shared/status-badge"
import { BookingActionBar } from "@/components/bookings/booking-action-bar"
import { HandoverChecklist } from "@/components/bookings/handover-checklist"
import { HandoverCompare } from "@/components/bookings/handover-compare"
import { DocumentVerifyButton } from "@/components/customers/document-verify-button"
import { formatDateTimeId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { lateDays } from "@/lib/handover"
import { DOCUMENT_LABEL, documentViewLink } from "@/lib/documents"
import { requireTenant } from "@/lib/tenant"
import { bookingMoney, getBookingDetail, type BookingDetail } from "@/server/queries/bookings"

export const metadata = { title: "Detail booking" }

const KIND_LABEL: Record<PaymentKind, string> = {
  RENTAL: "Sewa & denda",
  DEPOSIT: "Deposit",
  SUBSCRIPTION: "Langganan",
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  BANK_TRANSFER: "Transfer",
  MIDTRANS: "Midtrans",
  OTHER: "Lainnya",
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={strong ? "text-sm font-semibold tabular-nums" : "text-sm text-right tabular-nums"}>{value}</dd>
    </div>
  )
}

/** Hari lewat dihitung dari waktu kembali nyata; tanpa checklist, denda yang tersimpan yang bicara. */
function LateCell({ days, fee }: { days: number; fee: number }) {
  if (days > 0) return <span>{days} hari{fee > 0 ? ` · denda ${formatRupiah(fee)}` : ""}</span>
  if (fee > 0) return <span>didenda {formatRupiah(fee)}</span>
  return <span className="text-muted-foreground">tepat waktu</span>
}

/**
 * Badge status deposit hanya berarti kalau uangnya benar-benar masuk; pesanan dengan
 * deposit yang masih ditagih ditampilkan sebagai angka, bukan "tidak ada deposit".
 */
function DepositCell({ booking, held }: { booking: BookingDetail; held: number }) {
  if (held > 0) return <DepositStatusBadge status={booking.depositStatus} />
  if (booking.depositAmount > 0)
    return <span className="text-muted-foreground">{formatRupiah(booking.depositAmount)} belum diterima</span>
  return <span className="text-muted-foreground">tidak ada deposit</span>
}

export default async function BookingDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const context = await requireTenant()
  const { code } = await params
  const booking = await getBookingDetail(context.tenant.id, code)
  if (!booking) notFound()

  const money = bookingMoney(booking)
  const now = new Date()
  const pickup = booking.handovers.find((handover) => handover.type === "PICKUP") ?? null
  const returned = [...booking.handovers].reverse().find((handover) => handover.type === "RETURN") ?? null

  // Hari telat dihitung dari waktu pengembalian nyata; selama sewa masih berjalan
  // pakai hari ini supaya saran denda tidak menunggu form ditutup.
  const returnReference = returned?.createdAt ?? (booking.status === "ONGOING" ? now : null)
  const late = returnReference ? lateDays(booking.endsAt, returnReference) : 0

  const closing =
    booking.status === "ONGOING"
      ? {
          code: booking.code,
          customerName: booking.customerName,
          vehicleLabel: `${booking.vehicle.brand} ${booking.vehicle.model} · ${booking.vehicle.plate}`,
          lateDays: late,
          lateFeeDaily: booking.vehicle.lateFeeDaily,
          outstandingRent: money.outstanding,
          depositHeld: money.depositOutstanding,
          damageFee: 0,
        }
      : null

  const delivery =
    booking.deliveryMode === "DELIVERY"
      ? `Antar-jemput · ${booking.deliveryAddress ?? booking.deliveryArea ?? "alamat tidak tercatat"}`
      : "Ambil di kantor"

  return (
    <>
      <PageHeader
        title={booking.code}
        description={
          <>
            {booking.customerName} · {booking.customerPhone} · {booking.vehicle.brand}{" "}
            {booking.vehicle.model}{" "}
            <span className="font-mono tracking-wider">{booking.vehicle.plate}</span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/bookings">
                <ArrowLeft aria-hidden />
                Daftar booking
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${context.tenant.slug}/booking/${booking.code}`}>
                <ExternalLink aria-hidden />
                Lihat halaman pelanggan
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User aria-hidden className="size-4 text-muted-foreground" />
                Pesanan &amp; pelanggan
              </CardTitle>
              <CardDescription>
                Data yang diisikan pelanggan lewat halaman publik, termasuk cara pengambilan kendaraan.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <dl className="space-y-0.5">
                <Row label="Status" value={<BookingStatusBadge status={booking.status} />} />
                <Row label="Pembayaran" value={<BookingPaymentBadge status={booking.paymentStatus} />} />
                <Row label="Deposit" value={<DepositCell booking={booking} held={money.depositHeld} />} />
                <Row label="Nama" value={booking.customerName} />
                <Row label="WhatsApp" value={booking.customerPhone} />
                {booking.customerEmail ? <Row label="Email" value={booking.customerEmail} /> : null}
                {booking.customerIdCard ? <Row label="No. identitas" value={booking.customerIdCard} /> : null}
                <Row
                  label="Pelanggan"
                  value={
                    booking.customer ? (
                      <Link
                        href={`/dashboard/customers/${booking.customer.id}`}
                        className="text-primary hover:underline"
                      >
                        Buka profil pelanggan
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">belum tertaut</span>
                    )
                  }
                />
                {booking.cancelReason ? <Row label="Alasan batal" value={booking.cancelReason} /> : null}
              </dl>

              <dl className="space-y-0.5">
                <Row
                  label="Kendaraan"
                  value={
                    <Link href={`/dashboard/vehicles/${booking.vehicle.id}`} className="text-primary hover:underline">
                      {booking.vehicle.brand} {booking.vehicle.model}
                    </Link>
                  }
                />
                <Row label="Plat" value={<span className="font-mono">{booking.vehicle.plate}</span>} />
                <Row label="Mulai" value={formatDateTimeId(booking.startsAt)} />
                <Row label="Selesai" value={formatDateTimeId(booking.endsAt)} />
                <Row label="Durasi" value={`${booking.days} hari`} />
                <Row label="Pengambilan" value={delivery} />
                <Row label="Supir" value={booking.withDriver ? `Ya · ${formatRupiah(booking.driverFee)}` : "Tidak"} />
                <Row label="Dibuat" value={formatDateTimeId(booking.createdAt)} />
                <Row label="Sumber" value={booking.source === "PUBLIC" ? "Halaman publik" : booking.source} />
                {booking.notes ? <Row label="Catatan" value={booking.notes} /> : null}
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt aria-hidden className="size-4 text-muted-foreground" />
                Tagihan
              </CardTitle>
              <CardDescription>
                Sisa bayar dihitung dari denda dan kerusakan terbaru; deposit dibandingkan dengan uang yang benar-benar
                masuk.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <dl className="space-y-0.5">
                <Row label="Sewa" value={formatRupiah(booking.rentalAmount)} />
                {booking.deliveryFee > 0 ? (
                  <Row label="Antar jemput" value={formatRupiah(booking.deliveryFee)} />
                ) : null}
                {booking.driverFee > 0 ? <Row label="Supir" value={formatRupiah(booking.driverFee)} /> : null}
                <Row label="Deposit" value={formatRupiah(booking.depositAmount)} />
                <Row label="Total" value={formatRupiah(booking.totalAmount)} strong />
                {booking.lateFee > 0 ? <Row label="Denda telat" value={formatRupiah(booking.lateFee)} /> : null}
                {booking.damageFee > 0 ? (
                  <Row label="Biaya kerusakan" value={formatRupiah(booking.damageFee)} />
                ) : null}
                <Row
                  label="Kurang bayar"
                  value={
                    money.outstanding > 0 ? (
                      <span className="text-warning">{formatRupiah(money.outstanding)}</span>
                    ) : (
                      <span className="text-success">lunas</span>
                    )
                  }
                />
              </dl>

              <dl className="space-y-0.5">
                <Row label="Diterima (sewa)" value={formatRupiah(money.paidAmount)} />
                <Row label="Deposit dipegang" value={formatRupiah(money.depositHeld)} />
                <Row label="Deposit dikembalikan" value={formatRupiah(money.depositReturned)} />
                <Row
                  label="Deposit masih di tangan"
                  value={formatRupiah(money.depositOutstanding)}
                  strong
                />
                {booking.vehicle.lateFeeDaily ? (
                  <Row label="Tarif denda kendaraan" value={`${formatRupiah(booking.vehicle.lateFeeDaily)} / hari`} />
                ) : (
                  <Row
                    label="Tarif denda kendaraan"
                    value={<span className="text-muted-foreground">belum diatur</span>}
                  />
                )}
                <Row
                  label="Keterlambatan"
                  value={<LateCell days={late} fee={booking.lateFee} />}
                />
              </dl>
            </CardContent>

            <div className="border-t px-5 py-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Wallet aria-hidden className="size-4 text-muted-foreground" />
                Riwayat pembayaran
              </p>
              {booking.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada pembayaran tercatat. Catat tunai/transfer lewat menu Pembayaran, atau aktifkan Midtrans.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTimeId(payment.paidAt ?? payment.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">{KIND_LABEL[payment.kind]}</TableCell>
                        <TableCell className="text-sm">
                          {METHOD_LABEL[payment.method]}
                          {payment.refCode ? (
                            <span className="block truncate font-mono text-xs text-muted-foreground">
                              {payment.refCode}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {payment.status === "REFUNDED" && payment.kind === "DEPOSIT" ? "-" : ""}
                          {formatRupiah(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={payment.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Handshake aria-hidden className="size-4 text-muted-foreground" />
                Kondisi kendaraan
              </CardTitle>
              <CardDescription>
                Perbandingan sebelum dan sesudah sewa: foto tiap sisi, odometer, bahan bakar, dan catatan kerusakan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HandoverCompare pickup={pickup} returned={returned} lateDays={late} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText aria-hidden className="size-4 text-muted-foreground" />
                Dokumen pelanggan
              </CardTitle>
              <CardDescription>
                KTP dan SIM disimpan privat. Tautan buka dokumen hanya berlaku beberapa menit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {booking.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada dokumen terunggah. Pelanggan mengunggahnya saat mengisi formulir booking.
                </p>
              ) : (
                <ul className="divide-y">
                  {booking.documents.map((document) => (
                    <li key={document.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {DOCUMENT_LABEL[document.type] ?? document.type} · {document.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {document.isVerified ? "Sudah terverifikasi" : "Menunggu verifikasi"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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
              <CardTitle className="text-base">Aksi pesanan</CardTitle>
              <CardDescription>
                Tombol hanya muncul sesuai status sekarang. Menyelesaikan sewa selalu lewat form penutupan supaya denda
                dan pengembalian deposit ikut tercatat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <BookingActionBar
                code={booking.code}
                status={booking.status}
                customerName={booking.customerName}
                closing={closing}
                readOnly={context.isReadOnly}
              />
              {booking.customer?.isBlacklisted ? (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  Pelanggan ini ada di daftar hitam: {booking.customer.blacklistReason ?? "tanpa alasan"}.
                </p>
              ) : null}
              {booking.expiresAt ? (
                <p className="text-xs text-muted-foreground">
                  kedaluwarsa otomatis {formatDateTimeId(booking.expiresAt)} bila belum dibayar.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Checklist kondisi</CardTitle>
              <CardDescription>Isi saat kunci diserahkan dan saat kendaraan kembali.</CardDescription>
            </CardHeader>
            <CardContent>
              <HandoverChecklist
                code={booking.code}
                status={booking.status}
                readOnly={context.isReadOnly}
                hasPickup={Boolean(pickup)}
                hasReturn={Boolean(returned)}
                pickupOdometer={pickup?.odometer ?? booking.vehicle.odometer}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
