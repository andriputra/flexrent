import type { InvoiceStatus, PaymentMethod, PlanCode, SubscriptionStatus } from "@prisma/client"
import { Prisma } from "@prisma/client"
import { daysToRenewal } from "@/lib/billing"
import { prisma } from "@/lib/db"

const invoiceInclude = {
  payments: {
    select: { status: true, amount: true, method: true, paidAt: true, createdAt: true },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.InvoiceInclude

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>

export type BillingInvoice = {
  id: string
  number: string
  periodStart: Date
  periodEnd: Date
  amount: number
  status: InvoiceStatus
  dueAt: Date
  paidAt: Date | null
  /** Uang yang benar-benar tercatat masuk untuk tagihan ini. */
  paidTotal: number
  methods: PaymentMethod[]
}

function invoiceOf(row: InvoiceRow): BillingInvoice {
  const settled = row.payments.filter((payment) => payment.status === "SETTLED")
  return {
    id: row.id,
    number: row.number,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    amount: row.amount,
    status: row.status,
    dueAt: row.dueAt,
    paidAt: row.paidAt,
    paidTotal: settled.reduce((sum, payment) => sum + payment.amount, 0),
    methods: [...new Set(settled.map((payment) => payment.method))],
  }
}

export type BillingOverview = {
  subscription: {
    status: SubscriptionStatus
    plan: { code: PlanCode; name: string; priceMonthly: number; maxVehicles: number; maxStaff: number }
    trialEndsAt: Date | null
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    pastDueAt: Date | null
  } | null
  /** Negatif kalau jatuh tempo sudah lewat. */
  daysToRenewal: number | null
  /** Tagihan yang masih terbuka (termasuk periode berjalan yang belum lunas). */
  openInvoice: BillingInvoice | null
  /** Riwayat terbaru dulu, maksimal 12 tagihan. */
  invoices: BillingInvoice[]
  plans: {
    code: PlanCode
    name: string
    description: string | null
    priceMonthly: number
    maxVehicles: number
    maxStaff: number
    features: Prisma.JsonValue
    sortOrder: number
  }[]
  usage: { vehicles: number; staff: number }
}

/**
 * Semua angka yang dibutuhkan halaman Langganan. Pemakaian (jumlah kendaraan dan
 * staf) ikut dibaca supaya tombol downgrade bisa menolak paket yang terlalu kecil.
 */
export async function getBillingOverview(tenantId: string): Promise<BillingOverview> {
  const [subscription, invoiceRows, openRows, plans, vehicles, staff] = await Promise.all([
    prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { code: true, name: true, priceMonthly: true, maxVehicles: true, maxStaff: true } } },
    }),
    prisma.invoice.findMany({
      where: { tenantId },
      include: invoiceInclude,
      orderBy: { periodStart: "desc" },
      take: 12,
    }),
    prisma.invoice.findFirst({
      where: { tenantId, status: "OPEN" },
      include: invoiceInclude,
      orderBy: { periodStart: "asc" },
    }),
    prisma.plan.findMany({
      where: { isPublic: true },
      select: {
        code: true,
        name: true,
        description: true,
        priceMonthly: true,
        maxVehicles: true,
        maxStaff: true,
        features: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.vehicle.count({ where: { tenantId } }),
    prisma.membership.count({ where: { tenantId, isActive: true } }),
  ])

  return {
    subscription: subscription
      ? {
          status: subscription.status,
          plan: subscription.plan,
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          pastDueAt: subscription.pastDueAt,
        }
      : null,
    daysToRenewal: subscription ? daysToRenewal(subscription.currentPeriodEnd) : null,
    openInvoice: openRows ? invoiceOf(openRows) : null,
    invoices: invoiceRows.map(invoiceOf),
    plans,
    usage: { vehicles, staff },
  }
}

/** Satu tagihan milik tenant, lengkap dengan uang yang sudah masuk. */
export async function getBillingInvoice(tenantId: string, invoiceId: string): Promise<BillingInvoice | null> {
  const row = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: invoiceInclude })
  return row ? invoiceOf(row) : null
}
