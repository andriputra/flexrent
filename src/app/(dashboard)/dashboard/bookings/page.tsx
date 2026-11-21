import Link from "next/link"
import { Check, Clock, ListChecks, SearchX } from "lucide-react"
import type { BookingStatus } from "@prisma/client"
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
import { BookingPaymentBadge, BookingStatusBadge } from "@/components/shared/status-badge"
import { BookingFilterBar } from "@/components/bookings/booking-filter-bar"
import { BookingRowActions } from "@/components/bookings/booking-row-actions"
import { BookingTimeline } from "@/components/bookings/booking-timeline"
import { addWibDays, formatDateId, fromWib, toDayKey } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { rentDueOf } from "@/lib/payments/reconcile"
import { requireTenant } from "@/lib/tenant"
import { getBookingVehicleOptions, getFleetTimeline, listBookings } from "@/server/queries/bookings"

export const metadata = { title: "Booking — Flexrent" }

type SearchParams = {
  status?: string
  kendaraan?: string
  cari?: string
  page?: string
  tampilan?: string
  mulai?: string
}

const STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
const TIMELINE_DAYS = 14

function Period({ startsAt, endsAt, days }: { startsAt: Date; endsAt: Date; days: number }) {
  return (
    <div className="text-sm leading-5">
      <p className="tabular-nums">
        {formatDateId(startsAt, "d MMM yyyy")} · {formatDateId(startsAt, "HH:mm")}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        → {formatDateId(endsAt, "d MMM yyyy")} · {formatDateId(endsAt, "HH:mm")} · {days} hari
      </p>
    </div>
  )
}

function ChecklistMark({ label, done }: { label: string; done: boolean }) {
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      {done ? (
        <Check aria-hidden className="size-3.5 text-success" />
      ) : (
        <Clock aria-hidden className="size-3.5" />
      )}
      {label}
    </p>
  )
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const context = await requireTenant()
  const params = await searchParams

  const status = STATUSES.includes(params.status as BookingStatus) ? (params.status as BookingStatus) : undefined
  const vehicleId = params.kendaraan?.trim() || undefined
  const cari = params.cari?.trim() || undefined
  const mode = params.tampilan === "kalender" ? "kalender" : "daftar"

  const headerQuery = (overrides: Record<string, string | null>) => {
    const search = new URLSearchParams()
    if (mode === "kalender") {
      search.set("tampilan", "kalender")
      if (overrides.mulai) search.set("mulai", overrides.mulai)
      else if (params.mulai?.match(DAY_KEY)) search.set("mulai", params.mulai)
    } else {
      if (status) search.set("status", status)
      if (vehicleId) search.set("kendaraan", vehicleId)
      if (cari) search.set("cari", cari)
      const page = overrides.page
      if (page && page !== "1") search.set("page", page)
    }
    const suffix = search.toString()
    return `/dashboard/bookings${suffix ? `?${suffix}` : ""}`
  }

  if (mode === "kalender") {
    const startDay = params.mulai?.match(DAY_KEY) ? params.mulai : toDayKey(new Date())
    const timeline = await getFleetTimeline(context.tenant.id, startDay, TIMELINE_DAYS)
    const endDay = addWibDays(startDay, TIMELINE_DAYS - 1)
    const ongoing = timeline.vehicles.reduce(
      (sum, vehicle) => sum + vehicle.segments.filter((segment) => segment.status === "ONGOING").length,
      0
    )

    return (
      <>
        <PageHeader
          title="Booking"
          description="Kelola pesanan dan lihat seluruh armada dalam satu lini masa."
        />
        <BookingFilterBar
          mode="kalender"
          total={timeline.vehicles.length}
          activeCount={ongoing}
          vehicles={timeline.vehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.label }))}
        />
        <BookingTimeline
          timeline={timeline}
          rangeLabel={`${formatDateId(fromWib(startDay), "d MMM yyyy")} → ${formatDateId(
            fromWib(endDay),
            "d MMM yyyy"
          )}`}
          prevHref={headerQuery({ mulai: addWibDays(startDay, -TIMELINE_DAYS) })}
          todayHref={headerQuery({ mulai: toDayKey(new Date()) })}
          nextHref={headerQuery({ mulai: addWibDays(startDay, TIMELINE_DAYS) })}
        />
      </>
    )
  }

  const [{ rows, total, activeCount, page, totalPages }, vehicles] = await Promise.all([
    listBookings(context.tenant.id, {
      status,
      vehicleId,
      q: cari,
      page: Math.max(1, Number(params.page ?? 1) || 1),
    }),
    getBookingVehicleOptions(context.tenant.id),
  ])

  return (
    <>
      <PageHeader
        title="Booking"
        description="Semua pesanan, dari yang menunggu konfirmasi sampai selesai. Aksi mengikuti status pesanan — pengembalian dicatat lewat form penutupan agar denda dan deposit tidak terlewat."
      />
      <BookingFilterBar mode="daftar" total={total} activeCount={activeCount} vehicles={vehicles} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<SearchX aria-hidden />}
          title={total === 0 ? "Belum ada booking" : "Tidak ada booking yang cocok"}
          description={
            total === 0
              ? "Pesanan dari halaman publik rental Anda muncul di sini otomatis."
              : "Ubah status, kendaraan, atau kata kunci pencarian."
          }
          action={
            total === 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/vehicles">Lihat armada</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pesanan</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead>Periode sewa</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="w-[190px]">Status</TableHead>
                  <TableHead className="w-[130px]">Checklist</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((booking) => {
                  const outstanding = Math.max(0, rentDueOf(booking) - booking.paidAmount)
                  const labels = booking.handovers.map((handover) => handover.type)
                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/bookings/${booking.code}`}
                          className="font-mono text-sm tracking-wider hover:underline"
                        >
                          {booking.code}
                        </Link>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {booking.customerName} · {booking.customerPhone}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/vehicles/${booking.vehicle.id}`}
                          className="text-sm hover:underline"
                        >
                          {booking.vehicle.brand} {booking.vehicle.model}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{booking.vehicle.plate}</p>
                      </TableCell>
                      <TableCell>
                        <Period startsAt={booking.startsAt} endsAt={booking.endsAt} days={booking.days} />
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatRupiah(booking.totalAmount)}</p>
                        <p
                          className={
                            outstanding > 0 ? "text-xs text-warning tabular-nums" : "text-xs text-muted-foreground"
                          }
                        >
                          {outstanding > 0 ? `kurang ${formatRupiah(outstanding)}` : "sudah lunas"}
                        </p>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <BookingStatusBadge status={booking.status} />
                        <BookingPaymentBadge status={booking.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <ChecklistMark label="Serah-terima" done={labels.includes("PICKUP")} />
                        <ChecklistMark label="Kembali" done={labels.includes("RETURN")} />
                      </TableCell>
                      <TableCell>
                        <BookingRowActions
                          code={booking.code}
                          status={booking.status}
                          customerName={booking.customerName}
                          readOnly={context.isReadOnly}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {rows.map((booking) => {
              const labels = booking.handovers.map((handover) => handover.type)
              return (
                <li key={booking.id}>
                  <Card className="shadow-card">
                    <CardContent className="space-y-2.5 px-4 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/bookings/${booking.code}`}
                            className="font-mono text-sm tracking-wider"
                          >
                            {booking.code}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">{booking.customerName}</p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm">
                        {booking.vehicle.brand} {booking.vehicle.model}
                        <span className="font-mono text-xs text-muted-foreground"> · {booking.vehicle.plate}</span>
                      </p>
                      <Period startsAt={booking.startsAt} endsAt={booking.endsAt} days={booking.days} />
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold tabular-nums">{formatRupiah(booking.totalAmount)}</p>
                          <div className="flex gap-2">
                            <ChecklistMark label="Serah-terima" done={labels.includes("PICKUP")} />
                            <ChecklistMark label="Kembali" done={labels.includes("RETURN")} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookingPaymentBadge status={booking.paymentStatus} />
                          <BookingRowActions
                            code={booking.code}
                            status={booking.status}
                            customerName={booking.customerName}
                            readOnly={context.isReadOnly}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>

          {totalPages > 1 ? (
            <nav aria-label="Navigasi halaman" className="flex items-center justify-between pt-1">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ListChecks aria-hidden className="size-4" />
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={headerQuery({ page: String(page - 1) })}>Sebelumnya</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={headerQuery({ page: String(page + 1) })}>Berikutnya</Link>
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
