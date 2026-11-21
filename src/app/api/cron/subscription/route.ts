import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { daysToRenewal, planPrice, renewalMilestone } from "@/lib/billing"
import { addDays } from "@/lib/datetime"
import { prisma } from "@/lib/db"
import { ensureNextInvoice } from "@/lib/invoices"
import { isCronAuthorized, unauthorizedCron } from "@/lib/cron"
import { notifySubscription } from "@/lib/notifications"

export const runtime = "nodejs"

const tenantSelect = { id: true, name: true, slug: true, phone: true } satisfies Prisma.TenantSelect

type Scan = { scanned: number; changed: number; sent: number; skipped: number }

function emptyScan(scanned: number): Scan {
  return { scanned, changed: 0, sent: 0, skipped: 0 }
}

/**
 * Tagihan periode berikutnya untuk langganan yang periodenya sudah habis.
 * Sekaligus mengeksekusi penghentian yang dijadwalkan, supaya tidak ada tagihan
 * baru untuk rental yang memilih berhenti.
 */
async function issueDueInvoices(now: Date): Promise<Scan> {
  const rows = await prisma.subscription.findMany({
    where: { status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { lte: now } },
    include: { plan: true, tenant: { select: tenantSelect } },
    orderBy: { currentPeriodEnd: "asc" },
    take: 300,
  })

  const result = emptyScan(rows.length)
  for (const subscription of rows) {
    if (subscription.cancelAtPeriodEnd) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELLED", cancelledAt: now, pastDueAt: null },
      })
      result.changed += 1
      continue
    }
    await ensureNextInvoice(subscription, subscription.plan)
    result.changed += 1
  }
  return result
}

/**
 * Langganan yang tagihannya lewat tenggat bayar dibuat PAST_DUE: dashboard jadi
 * hanya-baca dan halaman publik berhenti menerima pesanan. Suratnya sekali per tagihan.
 */
async function markPastDue(now: Date): Promise<Scan> {
  const rows = await prisma.invoice.findMany({
    where: {
      status: "OPEN",
      dueAt: { lt: now },
      subscription: { status: { in: ["TRIALING", "ACTIVE"] }, tenant: { isActive: true } },
    },
    include: { subscription: { include: { tenant: { select: tenantSelect }, plan: true } } },
    orderBy: { dueAt: "asc" },
    take: 300,
  })

  const result = emptyScan(rows.length)
  for (const invoice of rows) {
    const subscription = invoice.subscription
    if (!subscription) continue

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE", pastDueAt: now },
    })
    result.changed += 1

    const status = await notifySubscription({
      tenantId: subscription.tenant.id,
      tenant: subscription.tenant,
      invoiceNumber: invoice.number,
      subscription: {
        planName: subscription.plan.name,
        amount: invoice.amount,
        periodEnd: invoice.periodEnd,
        daysLeft: daysToRenewal(invoice.dueAt, now),
      },
    })
    result[status === "SENT" ? "sent" : "skipped"] += 1
  }
  return result
}

/** Pengingat H-7, H-3, dan H-1 sebelum periode berjalan habis. */
async function remindRenewals(now: Date): Promise<Scan> {
  const rows = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIALING", "ACTIVE"] },
      cancelAtPeriodEnd: false,
      tenant: { isActive: true },
      currentPeriodEnd: { gte: now, lt: addDays(now, 8) },
    },
    include: {
      plan: true,
      tenant: { select: tenantSelect },
      invoices: { where: { status: "OPEN" }, orderBy: { periodStart: "asc" }, take: 1, select: { number: true } },
    },
    orderBy: { currentPeriodEnd: "asc" },
    take: 500,
  })

  const result = emptyScan(rows.length)
  for (const subscription of rows) {
    const milestone = renewalMilestone(subscription.currentPeriodEnd, now)
    if (milestone === null) continue

    const status = await notifySubscription({
      tenantId: subscription.tenant.id,
      tenant: subscription.tenant,
      invoiceNumber: subscription.invoices[0]?.number ?? null,
      subscription: {
        planName: subscription.plan.name,
        amount: planPrice(subscription.plan),
        periodEnd: subscription.currentPeriodEnd,
        daysLeft: milestone,
      },
    })
    result[status === "SENT" ? "sent" : "skipped"] += 1
  }
  return result
}

/**
 * Cron harian langganan: terbitkan tagihan periode baru, tandai yang telat bayar,
 * dan kirim pengingat perpanjangan. Kunci dedupe membuat rute ini aman dipanggil
 * lebih dari sekali sehari.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return unauthorizedCron()

  const now = new Date()
  return Response.json({
    ok: true,
    invoices: await issueDueInvoices(now),
    pastDue: await markPastDue(now),
    reminders: await remindRenewals(now),
  })
}
