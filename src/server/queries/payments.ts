import type { PaymentKind, PaymentMethod, PaymentStatus } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { startOfMonthWib } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { prisma } from "@/lib/db"
import { rentDueOf } from "@/lib/payments/reconcile"

export type PaymentFilters = {
  status?: PaymentStatus
  method?: PaymentMethod
  kind?: PaymentKind
  /** Cocok dengan kode booking, nama pelanggan, atau nomor referensi. */
  q?: string
  page?: number
  perPage?: number
}

const include = {
  booking: {
    select: {
      id: true,
      code: true,
      customerName: true,
      vehicle: { select: { brand: true, model: true } },
    },
  },
  recordedBy: { select: { name: true } },
} satisfies Prisma.PaymentInclude

export type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof include }>

export async function listPayments(tenantId: string, filters: PaymentFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 20))
  const q = filters.q?.trim()

  const where: Prisma.PaymentWhereInput = {
    tenantId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.method ? { method: filters.method } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(q
      ? {
          OR: [
            { refCode: { contains: q, mode: "insensitive" } },
            { booking: { code: { contains: q, mode: "insensitive" } } },
            { booking: { customerName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  const [rows, total, month] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { tenantId, status: "SETTLED", paidAt: { gte: startOfMonthWib(new Date()) } },
      _sum: { amount: true },
    }),
  ])

  return {
    rows: rows as PaymentRow[],
    total,
    monthSettled: month._sum.amount ?? 0,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

/**
 * Kandidat untuk form catat manual: pesanan yang masih punya sisa tagihan sewa
 * atau deposit. Nama/label dirakit di server supaya klien tidak menghitung uang.
 */
export async function getPayableBookingOptions(tenantId: string) {
  const rows = await prisma.booking.findMany({
    where: { tenantId, status: { notIn: ["CANCELLED", "EXPIRED"] }, NOT: { paymentStatus: "REFUNDED" } },
    select: {
      id: true,
      code: true,
      customerName: true,
      status: true,
      totalAmount: true,
      depositAmount: true,
      lateFee: true,
      damageFee: true,
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  })

  // Sisa dihitung dari baris pembayaran yang benar-benar SETTLED, sama seperti
  // action pencatatan — kolom paidAmount hanya ikut dijaga oleh recomputeBooking.
  const settled = await prisma.payment.groupBy({
    by: ["bookingId", "kind"],
    where: { tenantId, bookingId: { in: rows.map((booking) => booking.id) }, status: "SETTLED" },
    _sum: { amount: true },
  })
  const sumOf = (bookingId: string, kind: "RENTAL" | "DEPOSIT") =>
    settled.find((row) => row.bookingId === bookingId && row.kind === kind)?._sum.amount ?? 0

  return rows
    .map((booking) => {
      const outstanding = Math.max(0, rentDueOf(booking) - sumOf(booking.id, "RENTAL"))
      // Deposit hanya ditagih selama sewanya belum ditutup. Setelah COMPLETED,
      // siklus deposit selesai (dikembalikan atau dipotong denda) walaupun uang
      // depositnya tidak pernah tercatat masuk.
      const depositOutstanding =
        booking.status === "COMPLETED"
          ? 0
          : Math.max(0, booking.depositAmount - sumOf(booking.id, "DEPOSIT"))
      return {
        code: booking.code,
        label: `${booking.code} · ${booking.customerName} · sisa ${formatRupiah(outstanding || depositOutstanding)}`,
        outstanding,
        depositOutstanding,
      }
    })
    .filter((option) => option.outstanding > 0 || option.depositOutstanding > 0)
}
