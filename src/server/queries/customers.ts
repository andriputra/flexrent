import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

export type CustomerFilters = {
  q?: string
  /** Semua, hanya yang masuk daftar hitam, atau yang masih normal. */
  status?: "BLACKLIST" | "NORMAL"
  /** "VERIFIED" = punya dokumen yang sudah disetujui staf. */
  verifikasi?: "VERIFIED" | "UNVERIFIED"
  page?: number
  perPage?: number
}

const listInclude = {
  _count: { select: { bookings: true, documents: true } },
  // Hanya dokumen yang sudah disetujui staf yang dihitung untuk badge verifikasi.
  documents: { where: { isVerified: true }, select: { id: true, type: true } },
} satisfies Prisma.CustomerInclude

export type CustomerListRow = Prisma.CustomerGetPayload<{ include: typeof listInclude }>

export type CustomerSummary = {
  bookings: number
  /** Nilai pesanan yang tidak dibatalkan/kedaluwarsa — bukan uang yang masuk. */
  orderValue: number
  lastStartsAt: Date | null
}

export async function listCustomers(tenantId: string, filters: CustomerFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 20))
  const q = filters.q?.trim()

  const where: Prisma.CustomerWhereInput = {
    tenantId,
    ...(filters.status === "BLACKLIST" ? { isBlacklisted: true } : {}),
    ...(filters.status === "NORMAL" ? { isBlacklisted: false } : {}),
    ...(filters.verifikasi === "VERIFIED" ? { documents: { some: { isVerified: true } } } : {}),
    ...(filters.verifikasi === "UNVERIFIED" ? { documents: { none: { isVerified: true } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/^\+?62/, "0"), mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [rows, total, blacklisted] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      include: listInclude,
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { tenantId, isBlacklisted: true } }),
  ])

  // Ringkasan sewa per pelanggan diambil sekali jalan untuk halaman ini.
  const grouped = await prisma.booking.groupBy({
    by: ["customerId"],
    where: {
      tenantId,
      status: { notIn: ["CANCELLED", "EXPIRED"] },
      customerId: { in: rows.map((row) => row.id) },
    },
    _count: true,
    _sum: { totalAmount: true },
    _max: { startsAt: true },
  })

  const summaries = new Map<string, CustomerSummary>()
  for (const entry of grouped) {
    if (!entry.customerId) continue
    summaries.set(entry.customerId, {
      bookings: entry._count,
      orderValue: entry._sum?.totalAmount ?? 0,
      lastStartsAt: entry._max?.startsAt ?? null,
    })
  }

  return {
    rows: rows as CustomerListRow[],
    total,
    blacklisted,
    summaries,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

const detailInclude = {
  bookings: {
    select: {
      id: true,
      code: true,
      status: true,
      paymentStatus: true,
      startsAt: true,
      endsAt: true,
      days: true,
      totalAmount: true,
      lateFee: true,
      damageFee: true,
      depositAmount: true,
      depositStatus: true,
      // Riwayat bayar ikut agar sisa bayar dan deposit di ringkasan memakai uang yang benar-benar masuk.
      payments: { select: { kind: true, status: true, amount: true } },
      vehicle: { select: { id: true, brand: true, model: true, plate: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 50,
  },
  documents: {
    select: {
      id: true,
      type: true,
      fileName: true,
      mimeType: true,
      isVerified: true,
      createdAt: true,
      verifiedAt: true,
      bookingId: true,
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.CustomerInclude

export type CustomerDetail = Prisma.CustomerGetPayload<{ include: typeof detailInclude }>

export async function getCustomerDetail(tenantId: string, id: string): Promise<CustomerDetail | null> {
  return prisma.customer.findFirst({ where: { tenantId, id }, include: detailInclude })
}

/** Riwayat singkat untuk panel detail booking. */
export async function getCustomerHistory(tenantId: string, customerId: string) {
  return prisma.booking.count({ where: { tenantId, customerId, status: { notIn: ["CANCELLED", "EXPIRED"] } } })
}
