import type { BookingPaymentStatus, BookingStatus, InvoiceStatus, PaymentStatus } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { prisma, TX_OPTIONS } from "@/lib/db"
import {
  bookingCodeFromOrderId,
  kindFromOrderId,
  parseOrderId,
  type PaymentEvent,
  type PaymentOutcome,
} from "./provider"
import { reconcileBooking } from "./reconcile"

const OUTCOME_STATUS = {
  SETTLED: "SETTLED",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  PENDING: "PENDING",
} as const satisfies Record<PaymentOutcome, PaymentStatus>

const bookingSelect = {
  id: true,
  code: true,
  tenantId: true,
  status: true,
  paymentStatus: true,
  startsAt: true,
  endsAt: true,
  totalAmount: true,
  depositAmount: true,
  lateFee: true,
  damageFee: true,
  customerName: true,
  customerPhone: true,
  vehicle: { select: { brand: true, model: true } },
  tenant: { select: { id: true, name: true, slug: true, phone: true } },
} satisfies Prisma.BookingSelect

export type AppliedPayment = {
  tenantId: string
  bookingId: string
  code: string
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  paidAmount: number
  totalAmount: number
  lateFee: number
  startsAt: Date
  endsAt: Date
  /** true saat tagihan baru saja menjadi lunas — pemakai memakai ini untuk mengabari pelanggan. */
  becamePaid: boolean
  customerName: string
  customerPhone: string
  vehicle: { brand: string; model: string }
  tenant: { id: string; name: string; slug: string; phone: string }
}

/**
 * Menyusun ulang angka booking dari seluruh baris pembayaran. Dipakai webhook
 * Midtrans dan pencatatan manual admin supaya keduanya menghasilkan status sama.
 */
export async function recomputeBooking(
  tx: Prisma.TransactionClient,
  bookingId: string
): Promise<AppliedPayment | null> {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: bookingSelect })
  if (!booking) return null

  const payments = await tx.payment.findMany({
    where: { bookingId },
    select: { kind: true, status: true, amount: true },
  })
  const reconciled = reconcileBooking(booking, payments)

  await tx.booking.update({
    where: { id: booking.id },
    data: { paidAmount: reconciled.paidAmount, paymentStatus: reconciled.paymentStatus, status: reconciled.status },
  })

  return {
    tenantId: booking.tenantId,
    bookingId: booking.id,
    code: booking.code,
    status: reconciled.status,
    paymentStatus: reconciled.paymentStatus,
    paidAmount: reconciled.paidAmount,
    totalAmount: booking.totalAmount,
    lateFee: booking.lateFee,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    becamePaid: reconciled.paymentStatus === "PAID" && booking.paymentStatus !== "PAID",
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    vehicle: booking.vehicle,
    tenant: booking.tenant,
  }
}

/**
 * Menerapkan satu notifikasi pembayaran. Baris Payment dicari lewat transaction_id;
 * kalau belum ada, baris PENDING dengan order_id yang sama ditulis ulang (itu
 * checkout yang baru kita buat). Selain itu baris baru dibuat, supaya dana yang
 * benar-benar masuk tidak hilang ditelan atau saling menimpa.
 */
export async function applyPaymentEvent(event: PaymentEvent): Promise<AppliedPayment | null> {
  const code = bookingCodeFromOrderId(event.orderId)
  const kind = kindFromOrderId(event.orderId)
  const status = OUTCOME_STATUS[event.outcome]
  const transactionRef = event.transactionId || event.orderId
  const now = new Date()

  // Booking dicari sekali di luar transaksi: query bebas-baca tidak perlu
  // menahan transaksi terbuka saat database remote membalas.
  const target = await prisma.booking.findFirst({ where: { code }, select: { id: true, tenantId: true } })
  if (!target) return null

  return prisma.$transaction(
    async (tx) => {
      // Baris dicari lewat transaction_id lebih dulu. Lewat order_id hanya baris
      // PENDING (checkout yang baru dibuat, belum pernah diberi tahu) boleh
      // ditulis ulang — transaksi Midtrans lain dengan order_id sama harus jadi
      // baris baru supaya dana yang masuk tidak saling menimpa.
      const existing =
        (await tx.payment.findFirst({
          where: { tenantId: target.tenantId, midtransTransactionId: transactionRef },
          select: { id: true },
        })) ??
        (await tx.payment.findFirst({
          where: { tenantId: target.tenantId, bookingId: target.id, refCode: event.orderId, status: "PENDING" },
          select: { id: true },
        }))

      const amount = Number.isFinite(event.amount) && event.amount > 0 ? Math.round(event.amount) : undefined

      if (existing) {
        await tx.payment.update({
          where: { id: existing.id },
          data: {
            status,
            midtransOrderId: event.orderId,
            midtransTransactionId: transactionRef,
            paidAt: status === "SETTLED" ? now : null,
            ...(amount ? { amount } : {}),
          },
        })
      } else {
        await tx.payment.create({
          data: {
            tenantId: target.tenantId,
            bookingId: target.id,
            kind,
            method: "MIDTRANS",
            status,
            amount: amount ?? 0,
            refCode: event.orderId,
            midtransOrderId: event.orderId,
            midtransTransactionId: transactionRef,
            paidAt: status === "SETTLED" ? now : null,
            notes: `Notifikasi Midtrans status_code ${event.statusCode}`,
          },
        })
      }

      return recomputeBooking(tx, target.id)
    },
    TX_OPTIONS
  )
}

export type AppliedInvoice = {
  tenantId: string
  invoiceId: string
  number: string
  amount: number
  status: InvoiceStatus
  periodStart: Date
  periodEnd: Date
  /** true saat invoice baru saja berubah dari belum lunas menjadi lunas. */
  becamePaid: boolean
  tenant: { id: string; name: string; slug: string }
}

const invoiceSelect = {
  id: true,
  tenantId: true,
  number: true,
  amount: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  subscription: { select: { id: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } },
  tenant: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.InvoiceSelect

/** Order_id bersistem "-I" adalah tagihan langganan, bukan tagihan sewa. */
export function isInvoiceOrder(orderId: string): boolean {
  return parseOrderId(orderId)?.kind === "SUBSCRIPTION"
}

/**
 * Melunasi invoice dari total baris Payment SUBSCRIPTION yang SETTLED. Periode
 * langganan hanya dimajukan kalau invoice ini menagih periode sesudah periode
 * berjalan, sehingga dua invoice lunas tidak bisa memajukan tanggal dua kali.
 */
export async function settleInvoice(
  tx: Prisma.TransactionClient,
  invoiceId: string
): Promise<AppliedInvoice | null> {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, select: invoiceSelect })
  if (!invoice) return null

  const settled = await tx.payment.aggregate({
    where: { invoiceId: invoice.id, kind: "SUBSCRIPTION", status: "SETTLED" },
    _sum: { amount: true },
  })
  const paidTotal = settled._sum.amount ?? 0
  const lunas = paidTotal >= invoice.amount
  const alreadyPaid = invoice.status === "PAID"

  if (lunas && !alreadyPaid) {
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } })
    if (invoice.subscription) {
      const advance = invoice.periodEnd.getTime() > invoice.subscription.currentPeriodEnd.getTime()
      await tx.subscription.update({
        where: { id: invoice.subscription.id },
        data: {
          status: "ACTIVE",
          pastDueAt: null,
          ...(advance ? { currentPeriodStart: invoice.periodStart, currentPeriodEnd: invoice.periodEnd } : {}),
          ...(invoice.subscription.cancelAtPeriodEnd ? { cancelAtPeriodEnd: false } : {}),
        },
      })
    }
  }

  return {
    tenantId: invoice.tenantId,
    invoiceId: invoice.id,
    number: invoice.number,
    amount: invoice.amount,
    status: lunas ? "PAID" : invoice.status,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    becamePaid: lunas && !alreadyPaid,
    tenant: invoice.tenant,
  }
}

/**
 * Menerapkan notifikasi Midtrans untuk tagihan langganan. Aturan pencariannya sama
 * dengan tagihan sewa: cari lewat transaction_id, baru menimpa baris PENDING dengan
 * order_id yang sama.
 */
export async function applyInvoicePaymentEvent(event: PaymentEvent): Promise<AppliedInvoice | null> {
  const parsed = parseOrderId(event.orderId)
  if (!parsed || parsed.kind !== "SUBSCRIPTION") return null

  const status = OUTCOME_STATUS[event.outcome]
  const transactionRef = event.transactionId || event.orderId
  const now = new Date()

  const target = await prisma.invoice.findFirst({
    where: { number: parsed.code },
    select: { id: true, tenantId: true },
  })
  if (!target) return null

  return prisma.$transaction(
    async (tx) => {
      const existing =
        (await tx.payment.findFirst({
          where: { tenantId: target.tenantId, midtransTransactionId: transactionRef },
          select: { id: true },
        })) ??
        (await tx.payment.findFirst({
          where: { tenantId: target.tenantId, invoiceId: target.id, refCode: event.orderId, status: "PENDING" },
          select: { id: true },
        }))

      const amount = Number.isFinite(event.amount) && event.amount > 0 ? Math.round(event.amount) : undefined

      if (existing) {
        await tx.payment.update({
          where: { id: existing.id },
          data: {
            status,
            midtransOrderId: event.orderId,
            midtransTransactionId: transactionRef,
            paidAt: status === "SETTLED" ? now : null,
            ...(amount ? { amount } : {}),
          },
        })
      } else {
        await tx.payment.create({
          data: {
            tenantId: target.tenantId,
            invoiceId: target.id,
            kind: "SUBSCRIPTION",
            method: "MIDTRANS",
            status,
            amount: amount ?? 0,
            refCode: event.orderId,
            midtransOrderId: event.orderId,
            midtransTransactionId: transactionRef,
            paidAt: status === "SETTLED" ? now : null,
            notes: `Notifikasi Midtrans status_code ${event.statusCode}`,
          },
        })
      }

      return settleInvoice(tx, target.id)
    },
    TX_OPTIONS
  )
}
