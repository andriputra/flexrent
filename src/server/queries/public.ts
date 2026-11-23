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

/** Pilihan kendaraan untuk formulir ulasan publik. */
export function listPublicVehicleOptions(tenantId: string) {
  return prisma.vehicle.findMany({
    where: { tenantId, isPublished: true, status: { not: "INACTIVE" } },
    select: { id: true, brand: true, model: true },
    orderBy: [{ type: "asc" }, { brand: "asc" }, { createdAt: "desc" }],
    take: 60,
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

const testimonialCardSelect = {
  id: true,
  author: true,
  rating: true,
  message: true,
  photoUrl: true,
  occurredAt: true,
  vehicle: { select: { id: true, brand: true, model: true } },
} satisfies Prisma.TestimonialSelect

/** Ulasan yang boleh dibaca pengunjung: hanya yang sudah terbit oleh staf. */
export function listPublishedTestimonials(tenantId: string, limit = 12) {
  return prisma.testimonial.findMany({
    where: { tenantId, status: "PUBLISHED" },
    select: testimonialCardSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  })
}

export function listTestimonialsForVehicle(tenantId: string, vehicleId: string, limit = 6) {
  return prisma.testimonial.findMany({
    where: { tenantId, status: "PUBLISHED", vehicleId },
    select: testimonialCardSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  })
}

/**
 * Rata-rata bintang untuk strip rating, lengkap dengan sebaran per nilai. Tanpa
 * ulasan, `count` nol dan callers menyembunyikan seluruh section, bukan
 * menampilkan "0,0 dari 5".
 */
export async function getTestimonialSummary(tenantId: string, vehicleId?: string) {
  const where = { tenantId, status: "PUBLISHED" as const, ...(vehicleId ? { vehicleId } : {}) }
  const [count, average, ratings] = await prisma.$transaction([
    prisma.testimonial.count({ where }),
    prisma.testimonial.aggregate({ where, _avg: { rating: true } }),
    // Sebaran bintang dihitung di sini, dibatasi 500 baris: cukup untuk satu
    // armada, dan `groupBy` menuntut ordering yang tidak perlu di sini.
    prisma.testimonial.findMany({ where, select: { rating: true }, take: 500 }),
  ])

  // Indeks 0..4 = bintang 5..1, supaya bar digambar dari yang terbaik.
  const breakdown = [0, 0, 0, 0, 0]
  for (const item of ratings) {
    const star = Math.max(1, Math.min(5, item.rating))
    breakdown[5 - star] += 1
  }

  return { count, average: count ? (average._avg.rating ?? 0) : 0, breakdown }
}

export function findBlockedCustomer(tenantId: string, phone: string) {
  return prisma.customer.findFirst({
    where: { tenantId, phone, isBlacklisted: true },
    select: { id: true },
  })
}

/** Dipakai untuk menyembunyikan tombol bayar deposit yang sudah lunas. */
export async function isDepositPaid(tenantId: string, bookingId: string): Promise<boolean> {
  const paid = await prisma.payment.findFirst({
    where: { tenantId, bookingId, kind: "DEPOSIT", status: "SETTLED" },
    select: { id: true },
  })
  return Boolean(paid)
}
