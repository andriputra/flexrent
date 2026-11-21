import { prisma } from "@/lib/db"
import type { Interval } from "@/lib/schedule"
import type { VehicleStatus, VehicleType } from "@prisma/client"

export type VehicleFilters = {
  type?: VehicleType
  status?: VehicleStatus
  search?: string
  page?: number
  perPage?: number
}

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "ONGOING"] as const

export type VehicleCalendarEntry = {
  kind: "BOOKING" | "MAINTENANCE"
  label: string
  startsAt: Date
  endsAt: Date
}

export type VehicleRow = Awaited<ReturnType<typeof listVehicles>>["rows"][number]

export async function listVehicles(tenantId: string, filters: VehicleFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 10))

  const where = {
    tenantId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { plate: { contains: filters.search, mode: "insensitive" as const } },
            { brand: { contains: filters.search, mode: "insensitive" as const } },
            { model: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [rows, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.vehicle.count({ where }),
  ])

  return {
    rows,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export function getVehicle(tenantId: string, id: string) {
  return prisma.vehicle.findFirst({
    where: { id, tenantId },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      maintenancePlans: {
        where: { isDone: false },
        orderBy: { startsAt: "asc" },
        take: 12,
      },
    },
  })
}

export function countVehicles(tenantId: string) {
  return prisma.vehicle.count({ where: { tenantId } })
}

export function plateAlreadyUsed(tenantId: string, plate: string, excludeId?: string) {
  return prisma.vehicle.findFirst({
    where: { tenantId, plate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  })
}

/** Semua rentang yang membuat kendaraan tidak bebas: booking aktif + perawatan. */
export async function getVehicleBusyIntervals(
  tenantId: string,
  vehicleIds: string[],
  from: Date,
  to: Date
): Promise<Record<string, Interval[]>> {
  if (vehicleIds.length === 0) return {}

  const [bookings, maintenance] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        vehicleId: { in: vehicleIds },
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { vehicleId: true, startsAt: true, endsAt: true },
    }),
    prisma.maintenancePlan.findMany({
      where: {
        tenantId,
        vehicleId: { in: vehicleIds },
        isDone: false,
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { vehicleId: true, startsAt: true, endsAt: true },
    }),
  ])

  const grouped: Record<string, Interval[]> = {}
  for (const item of [...bookings, ...maintenance]) {
    grouped[item.vehicleId] ??= []
    grouped[item.vehicleId].push({ startsAt: item.startsAt, endsAt: item.endsAt })
  }
  return grouped
}

/** Bentrok untuk satu kendaraan, ditanyakan ke DB (sumber kebenaran sama dengan constraint). */
export function findConflictingBookings(
  tenantId: string,
  vehicleId: string,
  startsAt: Date,
  endsAt: Date
) {
  return prisma.booking.findFirst({
    where: {
      tenantId,
      vehicleId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true, code: true, startsAt: true, endsAt: true },
  })
}

/** Isi kalender satu kendaraan: penanda booking dan perawatan, berlabel untuk tooltip. */
export async function getVehicleCalendar(
  tenantId: string,
  vehicleId: string,
  from: Date,
  to: Date
): Promise<VehicleCalendarEntry[]> {
  const [bookings, plans] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        vehicleId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: {
        code: true,
        startsAt: true,
        endsAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.maintenancePlan.findMany({
      where: { tenantId, vehicleId, isDone: false, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { title: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    }),
  ])

  return [
    ...bookings.map((booking) => ({
      kind: "BOOKING" as const,
      label: `${booking.code} · ${booking.customer?.name ?? "pelanggan"}`,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })),
    ...plans.map((plan) => ({
      kind: "MAINTENANCE" as const,
      label: plan.title,
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

export function findConflictingMaintenance(tenantId: string, vehicleId: string, startsAt: Date, endsAt: Date) {
  return prisma.maintenancePlan.findFirst({
    where: {
      tenantId,
      vehicleId,
      isDone: false,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true, title: true },
  })
}
