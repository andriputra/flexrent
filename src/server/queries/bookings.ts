import type { BookingStatus } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { addDays, diffInCalendarDays, formatDateId, fromWib, toDayKey } from "@/lib/datetime"
import { prisma } from "@/lib/db"
import { rentDueOf, type ReconcilePayment } from "@/lib/payments/reconcile"

export type BookingFilters = {
  status?: BookingStatus
  vehicleId?: string
  /** Cocok dengan kode booking, nama, nomor WhatsApp, atau plat. */
  q?: string
  page?: number
  perPage?: number
}

const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "ONGOING"]

const listInclude = {
  vehicle: { select: { id: true, brand: true, model: true, plate: true, type: true } },
  handovers: { select: { id: true, type: true } },
} satisfies Prisma.BookingInclude

export type BookingListRow = Prisma.BookingGetPayload<{ include: typeof listInclude }>

export async function listBookings(tenantId: string, filters: BookingFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 20))
  const q = filters.q?.trim()

  const where: Prisma.BookingWhereInput = {
    tenantId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q.replace(/^\+?62/, "0"), mode: "insensitive" } },
            { vehicle: { plate: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  const [rows, total, activeCount] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: listInclude,
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { tenantId, status: { in: ACTIVE_STATUSES } } }),
  ])

  return {
    rows: rows as BookingListRow[],
    total,
    activeCount,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

/** Pilihan kendaraan untuk filter dropdown. */
export async function getBookingVehicleOptions(tenantId: string) {
  const rows = await prisma.vehicle.findMany({
    where: { tenantId, status: { not: "INACTIVE" } },
    select: { id: true, brand: true, model: true, plate: true },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
  })
  return rows.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}`,
  }))
}

const detailInclude = {
  vehicle: {
    select: {
      id: true,
      brand: true,
      model: true,
      plate: true,
      type: true,
      status: true,
      odometer: true,
      lateFeeDaily: true,
      priceDaily: true,
      deposit: true,
    },
  },
  customer: { select: { id: true, name: true, phone: true, isBlacklisted: true, blacklistReason: true } },
  payments: {
    select: {
      id: true,
      kind: true,
      method: true,
      status: true,
      amount: true,
      refCode: true,
      paidAt: true,
      createdAt: true,
      notes: true,
      recordedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" } satisfies Prisma.PaymentOrderByWithRelationInput,
  },
  handovers: {
    select: {
      id: true,
      type: true,
      odometer: true,
      fuelLevel: true,
      conditionNotes: true,
      damageNotes: true,
      createdAt: true,
      recordedBy: { select: { name: true } },
      photos: { select: { id: true, url: true, position: true } },
    },
    orderBy: { createdAt: "asc" } satisfies Prisma.HandoverOrderByWithRelationInput,
  },
  documents: {
    select: { id: true, type: true, fileName: true, isVerified: true, mimeType: true },
    orderBy: { createdAt: "asc" } satisfies Prisma.DocumentOrderByWithRelationInput,
  },
} satisfies Prisma.BookingInclude

export type BookingDetail = Prisma.BookingGetPayload<{ include: typeof detailInclude }>

/** Detail booking dicari dengan kode karena kode itulah yang dikenal staf dan pelanggan. */
export async function getBookingDetail(tenantId: string, code: string): Promise<BookingDetail | null> {
  return prisma.booking.findFirst({
    where: { tenantId, code: code.toUpperCase() },
    include: detailInclude,
  })
}

export type BookingMoney = {
  /** Tagihan sewa termasuk denda, tidak termasuk deposit. */
  dueAmount: number
  paidAmount: number
  outstanding: number
  depositHeld: number
  depositReturned: number
  depositOutstanding: number
}

export type BookingMoneySource = {
  status: BookingStatus
  totalAmount: number
  depositAmount: number
  lateFee: number
  damageFee: number
  payments: ReconcilePayment[]
}

/**
 * Angka uang booking untuk panel staf. Deposit dihitung dari baris pembayaran yang
 * benar-benar diterima, bukan dari kolom depositAmount, supaya pengembalian tidak
 * pernah mengembalikan uang yang belum masuk.
 */
export function bookingMoney(booking: BookingMoneySource): BookingMoney {
  const settledRental = booking.payments
    .filter((payment) => payment.kind === "RENTAL" && payment.status === "SETTLED")
    .reduce((sum, payment) => sum + payment.amount, 0)
  const depositHeld = booking.payments
    .filter((payment) => payment.kind === "DEPOSIT" && payment.status === "SETTLED")
    .reduce((sum, payment) => sum + payment.amount, 0)
  const depositReturned = booking.payments
    .filter((payment) => payment.kind === "DEPOSIT" && payment.status === "REFUNDED")
    .reduce((sum, payment) => sum + payment.amount, 0)

  const dueAmount = rentDueOf(booking)
  return {
    dueAmount,
    paidAmount: settledRental,
    outstanding: Math.max(0, dueAmount - settledRental),
    depositHeld,
    depositReturned,
    depositOutstanding: Math.max(0, depositHeld - depositReturned),
  }
}

export type TimelineSegment = {
  code: string
  title: string
  subtitle: string
  kind: "BOOKING" | "MAINTENANCE"
  status: BookingStatus | "MAINTENANCE"
  startIndex: number
  spanDays: number
  href: string | null
}

export type TimelineVehicle = {
  id: string
  label: string
  plate: string
  isRentedToday: boolean
  segments: TimelineSegment[]
}

export type FleetTimeline = {
  startDay: string
  days: number
  todayIndex: number
  columns: { key: string; dayLabel: string; isToday: boolean; isWeekend: boolean }[]
  vehicles: TimelineVehicle[]
  unassigned: TimelineSegment[]
}

const TIMELINE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "ONGOING", "COMPLETED"]

/**
 * Timeline armada: satu baris per kendaraan, kolomnya hari kalender WIB.
 * Segmen dipotong ke jendela yang tampil, jadi pesanan yang mulai sebelum jendela
 * tetap terlihat sampai hari terakhir jendela.
 */
export async function getFleetTimeline(
  tenantId: string,
  startDay: string,
  days = 14
): Promise<FleetTimeline> {
  const from = fromWib(startDay, "00:00")
  const to = addDays(from, days)
  const todayKey = toDayKey(new Date())

  const [vehicles, bookings, plans] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where: { tenantId, status: { not: "INACTIVE" } },
      select: { id: true, brand: true, model: true, plate: true, status: true },
      orderBy: [{ type: "asc" }, { brand: "asc" }, { model: "asc" }],
    }),
    prisma.booking.findMany({
      where: { tenantId, status: { in: TIMELINE_STATUSES }, startsAt: { lt: to }, endsAt: { gt: from } },
      select: {
        code: true,
        status: true,
        startsAt: true,
        endsAt: true,
        customerName: true,
        vehicleId: true,
        vehicle: { select: { brand: true, model: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.maintenancePlan.findMany({
      where: { tenantId, isDone: false, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { title: true, startsAt: true, endsAt: true, vehicleId: true },
      orderBy: { startsAt: "asc" },
    }),
  ])

  const clip = (startsAt: Date, endsAt: Date) => {
    const first = Math.max(0, diffInCalendarDays(from, startsAt))
    const last = Math.min(days - 1, diffInCalendarDays(from, endsAt))
    return { startIndex: first, spanDays: Math.max(1, last - first + 1) }
  }

  const bookingRows = new Map<string, TimelineSegment[]>()
  const listedVehicles = new Set(vehicles.map((vehicle) => vehicle.id))
  const unassigned: TimelineSegment[] = []
  for (const booking of bookings) {
    const segment: TimelineSegment = {
      code: booking.code,
      title: `${booking.customerName} · ${booking.vehicle.brand} ${booking.vehicle.model}`,
      subtitle: booking.code,
      kind: "BOOKING",
      status: booking.status,
      href: `/dashboard/bookings/${booking.code}`,
      ...clip(booking.startsAt, booking.endsAt),
    }
    // Kendaraan nonaktif tidak ditampilkan sebagai baris, tapi pesanannya tetap
    // harus kelihatan supaya staf tahu ada yang perlu dirapikan.
    if (!listedVehicles.has(booking.vehicleId)) {
      unassigned.push(segment)
      continue
    }
    const existing = bookingRows.get(booking.vehicleId)
    if (existing) existing.push(segment)
    else bookingRows.set(booking.vehicleId, [segment])
  }

  const maintenanceRows = new Map<string, TimelineSegment[]>()
  for (const plan of plans) {
    const segment: TimelineSegment = {
      code: plan.title,
      title: `Perawatan · ${plan.title}`,
      subtitle: "Jadwal perawatan",
      kind: "MAINTENANCE",
      status: "MAINTENANCE",
      href: null,
      ...clip(plan.startsAt, plan.endsAt),
    }
    const existing = maintenanceRows.get(plan.vehicleId)
    if (existing) existing.push(segment)
    else maintenanceRows.set(plan.vehicleId, [segment])
  }

  const columns = Array.from({ length: days }, (_, index) => {
    const date = addDays(from, index)
    const key = toDayKey(date)
    const weekday = formatDateId(date, "EEE")
    return {
      key,
      dayLabel: key === todayKey ? "Hari ini" : `${weekday} ${formatDateId(date, "d")}`,
      isToday: key === todayKey,
      isWeekend: weekday === "Sab" || weekday === "Min",
    }
  })

  const rows: TimelineVehicle[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model}`,
    plate: vehicle.plate,
    isRentedToday: (bookingRows.get(vehicle.id) ?? []).some((segment) => segment.status === "ONGOING"),
    segments: [...(bookingRows.get(vehicle.id) ?? []), ...(maintenanceRows.get(vehicle.id) ?? [])],
  }))

  return {
    startDay,
    days,
    todayIndex: Math.max(0, Math.min(days - 1, diffInCalendarDays(from, new Date()))),
    columns,
    vehicles: rows,
    unassigned,
  }
}
