import type { VehicleType } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { addDays, fromWib, monthRangeWib, toDayKey } from "@/lib/datetime"
import { prisma } from "@/lib/db"
import { getMonthRevenue, getRevenueSeries, type RevenuePoint } from "./reports"

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ONGOING"] as const

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

export type DashboardSummary = {
  vehicleTotal: number
  availableCount: number
  maintenanceCount: number
  inactiveCount: number
  /** Kas masuk bulan berjalan dari pembayaran yang benar-benar tercatat. */
  monthRevenue: number
  monthLabel: string
  activeBookingCount: number
  ongoingCount: number
  returnsToday: ReturnToday[]
  /** Persentase hari armada terpakai dalam 30 hari ke depan. */
  occupancyRate: number
  revenueSeries: RevenuePoint[]
}

export async function getDashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const now = new Date()
  const month = monthRangeWib(now)
  const windowStart = fromWib(toDayKey(now))
  const windowEnd = addDays(windowStart, 30)

  const [vehicleTotal, byStatus, activeCount, ongoingCount, returnsToday, windowBookings, revenue, monthRevenue] =
    await Promise.all([
      prisma.vehicle.count({ where: { tenantId } }),
      prisma.vehicle.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.booking.count({ where: { tenantId, status: { in: [...ACTIVE_BOOKING_STATUSES] } } }),
      prisma.booking.count({ where: { tenantId, status: "ONGOING" } }),
      prisma.booking.findMany({
        where: {
          tenantId,
          status: { in: ["CONFIRMED", "ONGOING"] },
          endsAt: { gte: windowStart, lt: addDays(windowStart, 1) },
        },
        orderBy: { endsAt: "asc" },
        take: 8,
        select: returnSelect,
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
      getRevenueSeries(tenantId, 30),
      getMonthRevenue(tenantId, now),
    ])

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<string, number>

  const bookedDays = windowBookings.reduce((sum, booking) => {
    const start = Math.max(booking.startsAt.getTime(), windowStart.getTime())
    const end = Math.min(booking.endsAt.getTime(), windowEnd.getTime())
    return sum + Math.max(0, Math.round((end - start) / 86_400_000))
  }, 0)

  const capacity = vehicleTotal * 30
  const occupancyRate = capacity > 0 ? Math.min(100, Math.round((bookedDays / capacity) * 100)) : 0

  return {
    vehicleTotal,
    availableCount: statusCounts.AVAILABLE ?? 0,
    maintenanceCount: statusCounts.MAINTENANCE ?? 0,
    inactiveCount: statusCounts.INACTIVE ?? 0,
    monthRevenue,
    monthLabel: month.label,
    activeBookingCount: activeCount,
    ongoingCount,
    returnsToday,
    occupancyRate,
    revenueSeries: revenue.points,
  }
}
