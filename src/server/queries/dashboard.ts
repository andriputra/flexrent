import { prisma } from "@/lib/db"
import { addDays, fromWib, startOfMonthWib, toDayKey } from "@/lib/datetime"

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ONGOING"] as const

export async function getDashboardSummary(tenantId: string) {
  const now = new Date()
  const monthStart = startOfMonthWib(now)
  const windowStart = fromWib(toDayKey(now))
  const windowEnd = addDays(windowStart, 30)

  const [
    vehicleTotal,
    byStatus,
    monthBookingRows,
    activeCount,
    ongoingCount,
    returnsToday,
    windowBookings,
  ] = await Promise.all([
    prisma.vehicle.count({ where: { tenantId } }),
    prisma.vehicle.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ["CONFIRMED", "ONGOING", "COMPLETED"] },
        startsAt: { gte: monthStart },
      },
      select: { totalAmount: true, startsAt: true },
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
      include: { vehicle: { select: { plate: true, brand: true, model: true, type: true } } },
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
  ])

  const statusCounts = Object.fromEntries(
    byStatus.map((row) => [row.status, row._count._all])
  ) as Record<string, number>

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
    monthRevenue: monthBookingRows.reduce((sum, row) => sum + row.totalAmount, 0),
    monthBookingCount: monthBookingRows.length,
    activeBookingCount: activeCount,
    ongoingCount,
    returnsToday,
    occupancyRate,
  }
}
