import type { Prisma, Transmission, VehicleType } from "@prisma/client"
import type { CalendarInterval } from "@/components/vehicles/availability-calendar"
import { prisma } from "@/lib/db"
import { hasOverlap } from "@/lib/schedule"
import { getVehicleBusyIntervals } from "@/server/queries/vehicles"

export type CatalogFilters = {
  type?: VehicleType
  transmission?: Transmission
  minDailyPrice?: number
  maxDailyPrice?: number
  startsAt?: Date | null
  endsAt?: Date | null
}

/** Kartu hanya butuh satu foto; urutan primary dulu supaya wajah armada konsisten. */
const photoOrder = { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }] }

export async function listCatalogVehicles(tenantId: string, filters: CatalogFilters = {}) {
  const where: Prisma.VehicleWhereInput = {
    tenantId,
    isPublished: true,
    status: { not: "INACTIVE" },
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.transmission ? { transmission: filters.transmission } : {}),
    ...(filters.minDailyPrice || filters.maxDailyPrice
      ? {
          priceDaily: {
            ...(filters.minDailyPrice ? { gte: filters.minDailyPrice } : {}),
            ...(filters.maxDailyPrice ? { lte: filters.maxDailyPrice } : {}),
          },
        }
      : {}),
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: [{ type: "asc" }, { priceDaily: "asc" }],
    take: 60,
    select: {
      id: true,
      type: true,
      plate: true,
      brand: true,
      model: true,
      year: true,
      color: true,
      transmission: true,
      engineCc: true,
      seats: true,
      fuelType: true,
      hasDriver: true,
      driverFee: true,
      priceDaily: true,
      priceWeekly: true,
      priceMonthly: true,
      deposit: true,
      status: true,
      photos: photoOrder,
    },
  })

  const startsAt = filters.startsAt ?? null
  const endsAt = filters.endsAt ?? null
  if (!startsAt || !endsAt) return { rows: vehicles, hiddenByDates: 0 }

  const busy = await getVehicleBusyIntervals(
    tenantId,
    vehicles.map((vehicle) => vehicle.id),
    startsAt,
    endsAt
  )
  const rows = vehicles.filter(
    (vehicle) => !hasOverlap({ startsAt, endsAt }, busy[vehicle.id] ?? [])
  )
  return { rows, hiddenByDates: vehicles.length - rows.length }
}

export function getCatalogVehicle(tenantId: string, vehicleId: string) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, tenantId, isPublished: true, status: { not: "INACTIVE" } },
    include: { photos: photoOrder },
  })
}

/**
 * Penanda kalender di halaman publik. Sengaja tanpa label pelanggan: penyewa
 * hanya perlu tahu hari mana yang tidak bisa dipilih.
 */
export async function getPublicCalendarIntervals(
  tenantId: string,
  vehicleId: string,
  from: Date,
  to: Date
): Promise<CalendarInterval[]> {
  const [bookings, plans] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        vehicleId,
        status: { in: ["PENDING", "CONFIRMED", "ONGOING"] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.maintenancePlan.findMany({
      where: { tenantId, vehicleId, isDone: false, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
    }),
  ])

  return [
    ...bookings.map((item) => ({ ...item, kind: "BOOKING" as const })),
    ...plans.map((item) => ({ ...item, kind: "MAINTENANCE" as const })),
  ]
}

export function findPublicBooking(tenantId: string, code: string, phone: string) {
  return prisma.booking.findFirst({
    where: { tenantId, code, customerPhone: phone },
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      depositStatus: true,
      startsAt: true,
      endsAt: true,
      days: true,
      rentalAmount: true,
      driverFee: true,
      deliveryFee: true,
      depositAmount: true,
      totalAmount: true,
      paidAmount: true,
      lateFee: true,
      damageFee: true,
      withDriver: true,
      deliveryMode: true,
      deliveryArea: true,
      deliveryAddress: true,
      notes: true,
      expiresAt: true,
      cancelledAt: true,
      cancelReason: true,
      createdAt: true,
      customerName: true,
      customerPhone: true,
      vehicle: { select: { id: true, type: true, brand: true, model: true, year: true, plate: true } },
    },
  })
}

export function findBlockedCustomer(tenantId: string, phone: string) {
  return prisma.customer.findFirst({
    where: { tenantId, phone, isBlacklisted: true },
    select: { id: true },
  })
}
