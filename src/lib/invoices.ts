import type { Invoice, Plan, Subscription } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import {
  invoiceDueAt,
  invoiceMonthRange,
  invoiceNumberFor,
  nextBillingPeriod,
  planPrice,
} from "./billing"

export type SubscriptionForInvoice = Pick<Subscription, "id" | "tenantId" | "currentPeriodEnd">
export type PlanForInvoice = Pick<Plan, "name" | "priceMonthly">

function isDuplicateNumber(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

/**
 * Invoice untuk periode tagihan berikutnya. Kalau tagihan periode itu sudah ada,
 * yang lama dikembalikan, jadi cron boleh jalan berkali-kali dalam sehari tanpa
 * menghasilkan dua surat piutang.
 */
export async function ensureNextInvoice(
  subscription: SubscriptionForInvoice,
  plan: PlanForInvoice
): Promise<Invoice> {
  const period = nextBillingPeriod(subscription.currentPeriodEnd)

  const existing = await prisma.invoice.findFirst({
    where: { tenantId: subscription.tenantId, periodStart: period.start },
    orderBy: { createdAt: "asc" },
  })
  if (existing) return existing

  // Nomor invoice unik global, jadi urutannya dihitung per bulan di seluruh tenant
  // dan diulang sampai nomor yang belum dipakai.
  const sequence = (await prisma.invoice.count({ where: { periodStart: invoiceMonthRange(period.start) } })) + 1
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      return await prisma.invoice.create({
        data: {
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          number: invoiceNumberFor(period.start, sequence + attempt),
          periodStart: period.start,
          periodEnd: period.end,
          amount: planPrice(plan),
          status: "OPEN",
          dueAt: invoiceDueAt(period.start),
        },
      })
    } catch (error) {
      if (!isDuplicateNumber(error)) throw error
    }
  }

  throw new Error("Nomor tagihan selalu bentrok — periksa isi tabel invoices.")
}

/**
 * Total yang benar-benar masuk untuk satu invoice. Sama seperti booking: angka
 * dibaca dari baris Payment, bukan dari kolom `paid`.
 */
export async function invoicePaidTotal(invoiceId: string): Promise<number> {
  const settled = await prisma.payment.aggregate({
    where: { invoiceId, kind: "SUBSCRIPTION", status: "SETTLED" },
    _sum: { amount: true },
  })
  return settled._sum.amount ?? 0
}
