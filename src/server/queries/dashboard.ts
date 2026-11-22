import type { VehicleType } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { addDays, fromWib, monthRangeWib, toDayKey } from "@/lib/datetime"
import { prisma } from "@/lib/db"
import { getMonthRevenue, getRevenueSeries, type RevenuePoint } from "./reports"

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ONGOING"] as const
const RENTED_STATUSES = ["CONFIRMED", "ONGOING"] as const
const UNPAID_STATUSES = ["UNPAID", "PARTIAL"] as const

/** Panjang deret kas yang dibaca untuk grafik; tampilan memilih potongannya. */
const REVENUE_WINDOW_DAYS = 90

const returnSelect = {
  id: true,
  code: true,
  customerName: true,
  endsAt: true,
  status: true,
  vehicle: { select: { plate: true, brand: true, model: true, type: true } },
} satisfies Prisma.BookingSelect

export type ReturnToday = {
  id: string
  code: string
  customerName: string
  endsAt: Date
  status: Prisma.BookingGetPayload<{ select: typeof returnSelect }>["status"]
  vehicle: { plate: string; brand: string; model: string; type: VehicleType }
}

export type ReturnLoad = { day: string; count: number }

export type MaintenanceDue = {
  id: string
  title: string
  startsAt: Date
  endsAt: Date
  vehicle: { plate: string }
}

export type DashboardSummary = {
  vehicleTotal: number
  availableCount: number
  maintenanceCount: number
  inactiveCount: number
  /** Kas masuk bulan berjalan dari pembayaran yang benar-benar tercatat. */
  monthRevenue: number
  /** Kas masuk bulan kalender sebelumnya, pembanding tren. */
  prevMonthRevenue: number
  monthLabel: string
  activeBookingCount: number
  ongoingCount: number
  pendingBookingCount: number
  /** Sewa berjalan yang pembayarannya belum lunas. */
  unpaidCount: number
  returnsToday: ReturnToday[]
  /** Jumlah kendaraan yang harus kembali per hari, 7 hari ke depan. */
  returnLoad: ReturnLoad[]
  /** Sewa yang lewat dari jadwal kembali tapi belum ditutup. */
  overdueReturns: ReturnToday[]
  overdueReturnCount: number
  /** Jadwal perawatan yang belum selesai, paling dekat lebih dulu. */
  maintenanceDue: MaintenanceDue[]
  maintenanceDueCount: number
  /** Persentase hari armada terpakai dalam 30 hari ke depan. */
  occupancyRate: number
  revenueSeries: RevenuePoint[]
}

export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const now = new Date()
  const month = monthRangeWib(now)
  const windowStart = fromWib(toDayKey(now))
  const windowEnd = addDays(windowStart, 30)
  const todayKey = toDayKey(now)

  const [
    vehicleTotal,
    vehicleByStatus,
    bookingByStatus,
    unpaidCount,
    upcomingReturns,
    overdueReturns,
    overdueReturnCount,
    windowBookings,
    maintenanceDue,
    maintenanceDueCount,
    revenue,
    monthRevenue,
    prevMonthRevenue,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { tenantId } }),
    prisma.vehicle.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.booking.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.booking.count({
      where: { tenantId, status: { in: [...RENTED_STATUSES] }, paymentStatus: { in: [...UNPAID_STATUSES] } },
    }),
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: [...RENTED_STATUSES] },
        endsAt: { gte: windowStart, lt: addDays(windowStart, 7) },
      },
      orderBy: { endsAt: "asc" },
      take: 120,
      select: returnSelect,
    }),
    prisma.booking.findMany({
      where: { tenantId, status: { in: [...RENTED_STATUSES] }, endsAt: { lt: windowStart } },
      orderBy: { endsAt: "asc" },
      take: 5,
      select: returnSelect,
    }),
    prisma.booking.count({
      where: { tenantId, status: { in: [...RENTED_STATUSES] }, endsAt: { lt: windowStart } },
    }),
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.maintenancePlan.findMany({
      where: { tenantId, isDone: false, startsAt: { lt: addDays(windowStart, 14) } },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: { id: true, title: true, startsAt: true, endsAt: true, vehicle: { select: { plate: true } } },
    }),
    prisma.maintenancePlan.count({
      where: { tenantId, isDone: false, startsAt: { lt: addDays(windowStart, 14) } },
    }),
    getRevenueSeries(tenantId, REVENUE_WINDOW_DAYS),
    getMonthRevenue(tenantId, now),
    getMonthRevenue(tenantId, addDays(month.start, -1)),
  ])

  const vehicleStatusCounts = Object.fromEntries(
    vehicleByStatus.map((row) => [row.status, row._count._all])
  ) as Record<string, number>
  const bookingStatusCounts = Object.fromEntries(
    bookingByStatus.map((row) => [row.status, row._count._all])
  ) as Record<string, number>

  const loadByDay = new Map<string, number>()
  for (const booking of upcomingReturns) {
    const key = toDayKey(booking.endsAt)
    loadByDay.set(key, (loadByDay.get(key) ?? 0) + 1)
  }
  const returnLoad: ReturnLoad[] = Array.from({ length: 7 }, (_, offset) => {
    const day = toDayKey(addDays(windowStart, offset))
    return { day, count: loadByDay.get(day) ?? 0 }
  })

  const bookedDays = windowBookings.reduce((sum, booking) => {
    const start = Math.max(booking.startsAt.getTime(), windowStart.getTime())
    const end = Math.min(booking.endsAt.getTime(), windowEnd.getTime())
    return sum + Math.max(0, Math.round((end - start) / 86_400_000))
  }, 0)

  const capacity = vehicleTotal * 30
  const occupancyRate = capacity > 0 ? Math.min(100, Math.round((bookedDays / capacity) * 100)) : 0

  return {
    vehicleTotal,
    availableCount: vehicleStatusCounts.AVAILABLE ?? 0,
    maintenanceCount: vehicleStatusCounts.MAINTENANCE ?? 0,
    inactiveCount: vehicleStatusCounts.INACTIVE ?? 0,
    monthRevenue,
    prevMonthRevenue,
    monthLabel: month.label,
    activeBookingCount: ACTIVE_BOOKING_STATUSES.reduce((sum, status) => sum + (bookingStatusCounts[status] ?? 0), 0),
    ongoingCount: bookingStatusCounts.ONGOING ?? 0,
    pendingBookingCount: bookingStatusCounts.PENDING ?? 0,
    unpaidCount,
    returnsToday: upcomingReturns.filter((booking) => toDayKey(booking.endsAt) === todayKey).slice(0, 8),
    returnLoad,
    overdueReturns,
    overdueReturnCount,
    maintenanceDue,
    maintenanceDueCount,
    occupancyRate,
    revenueSeries: revenue.points,
  }
}
