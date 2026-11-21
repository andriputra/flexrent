"use server"

import { revalidatePath } from "next/cache"
import type { InvoiceStatus } from "@prisma/client"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { textOf } from "@/lib/form"
import { settleInvoice } from "@/lib/payments/apply"
import { getPaymentProvider } from "@/lib/payments/midtrans"
import { PaymentProviderError, orderIdFor } from "@/lib/payments/provider"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { requireTenant, type TenantContext } from "@/lib/tenant"
import { invoicePaymentFieldLabels, invoicePaymentInput, planChangeInput } from "@/lib/validators/billing"

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

/** 261122081500 — percobaan bayar baru tidak menabrak order_id yang sudah dipakai. */
function attemptStamp(): string {
  return new Date().toISOString().replace(/\D/g, "").slice(2, 14)
}

/**
 * Langganan adalah urusan pemilik rental. Sengaja tidak memakai `requireWritable`:
 * dashboard yang diblokir justru harus bisa membayar tagihan supaya akses terbuka lagi.
 */
function onlyManager(context: TenantContext): ReturnType<typeof fail> | null {
  return context.canManage
    ? null
    : fail("Hanya pemilik atau admin rental yang bisa mengatur langganan.", { code: "FORBIDDEN" })
}

function paidTotalOf(invoiceId: string): Promise<number> {
  return prisma.payment
    .aggregate({ where: { invoiceId, kind: "SUBSCRIPTION", status: "SETTLED" }, _sum: { amount: true } })
    .then((result) => result._sum.amount ?? 0)
}

export type InvoiceCheckoutSuccess = {
  orderId: string
  redirectUrl: string
  amount: number
}

/** Bayar tagihan langganan lewat Midtrans. Sisa tagihan dihitung di server. */
export async function payInvoiceOnlineAction(invoiceId: string): Promise<ActionResult<InvoiceCheckoutSuccess>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context)
    if (blocked) return blocked

    const invoice = await prisma.invoice.findFirst({
      where: { tenantId: context.tenant.id, id: invoiceId },
      select: { id: true, number: true, amount: true, status: true, periodStart: true, periodEnd: true },
    })
    if (!invoice) return fail("Tagihan tidak ditemukan.", { code: "NOT_FOUND" })
    if (invoice.status === "PAID") return fail("Tagihan ini sudah lunas.", { code: "VALIDATION" })
    if (invoice.status === "CANCELLED") return fail("Tagihan ini sudah dibatalkan.", { code: "VALIDATION" })

    const remaining = invoice.amount - (await paidTotalOf(invoice.id))
    if (remaining <= 0) return fail("Sisa tagihan ini nol.", { code: "VALIDATION" })

    const provider = getPaymentProvider()
    if (!provider) {
      return fail("Pembayaran online belum aktif. Catat pembayarannya manual saja.", { code: "READ_ONLY" })
    }

    const orderId = orderIdFor(invoice.number, "SUBSCRIPTION", attemptStamp())
    let checkout
    try {
      checkout = await provider.createCheckout({
        orderId,
        amount: remaining,
        title: `Langganan Flexrent ${invoice.number}`,
        description: `${context.tenant.name} · periode ${formatDateId(invoice.periodStart, "d MMM yyyy")} – ${formatDateId(invoice.periodEnd, "d MMM yyyy")} · ${formatRupiah(remaining)}`,
        customer: { name: context.tenant.name, phone: context.tenant.phone, email: context.tenant.email },
        finishUrl: `${appOrigin()}/dashboard/billing?invoice=${invoice.id}&paid=1`,
      })
    } catch (error) {
      if (error instanceof PaymentProviderError) return fail(error.message, { code: "UNKNOWN" })
      throw error
    }

    await prisma.payment.create({
      data: {
        tenantId: context.tenant.id,
        invoiceId: invoice.id,
        kind: "SUBSCRIPTION",
        method: "MIDTRANS",
        status: "PENDING",
        amount: remaining,
        refCode: orderId,
        midtransOrderId: orderId,
        notes: "Checkout dari halaman Langganan",
      },
    })

    return ok({ orderId, redirectUrl: checkout.redirectUrl, amount: remaining })
  })
}

export type InvoicePaymentResult = {
  number: string
  paidTotal: number
  status: InvoiceStatus
  becamePaid: boolean
}

/** Pencatatan pembayaran transfer/tunai untuk tagihan langganan. */
export async function recordInvoicePaymentAction(formData: FormData): Promise<ActionResult<InvoicePaymentResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context)
    if (blocked) return blocked

    const parsed = invoicePaymentInput.safeParse({
      invoiceId: textOf(formData, "invoiceId"),
      amount: textOf(formData, "amount"),
      method: textOf(formData, "method"),
      refCode: textOf(formData, "refCode"),
      notes: textOf(formData, "notes"),
    })
    if (!parsed.success) {
      return fail("Periksa isian pembayaran langganan.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, invoicePaymentFieldLabels),
      })
    }
    const input = parsed.data

    const invoice = await prisma.invoice.findFirst({
      where: { tenantId: context.tenant.id, id: input.invoiceId },
      select: { id: true, number: true, amount: true, status: true },
    })
    if (!invoice) return fail("Tagihan tidak ditemukan.", { code: "NOT_FOUND" })
    if (invoice.status === "PAID") return fail("Tagihan ini sudah lunas.", { code: "VALIDATION" })
    if (invoice.status === "CANCELLED") return fail("Tagihan ini sudah dibatalkan.", { code: "VALIDATION" })

    const already = await paidTotalOf(invoice.id)
    const remaining = invoice.amount - already
    if (input.amount > remaining) {
      return fail(`Melebihi sisa tagihan ${formatRupiah(Math.max(0, remaining))}.`, {
        code: "VALIDATION",
        fields: { amount: `Maksimal ${formatRupiah(Math.max(0, remaining))}` },
      })
    }

    const applied = await prisma.$transaction(
      async (tx) => {
        await tx.payment.create({
          data: {
            tenantId: context.tenant.id,
            invoiceId: invoice.id,
            kind: "SUBSCRIPTION",
            method: input.method,
            status: "SETTLED",
            amount: input.amount,
            refCode: input.refCode || null,
            recordedById: context.user.id,
            notes: input.notes || null,
            paidAt: new Date(),
          },
        })
        return settleInvoice(tx, invoice.id)
      },
      TX_OPTIONS
    )

    revalidatePath("/dashboard/billing")
    revalidatePath("/dashboard")

    return ok({
      number: invoice.number,
      paidTotal: already + input.amount,
      status: applied?.status ?? invoice.status,
      becamePaid: applied?.becamePaid ?? false,
    })
  })
}

export type PlanChangeResult = { name: string; priceMonthly: number }

/**
 * Ganti paket. Perubahan berlaku mulai tagihan periode berikutnya — tagihan yang
 * sudah terbit tidak diubah nilainya, jadi tidak ada selisih yang harus dihitung ulang.
 */
export async function changePlanAction(planCode: string): Promise<ActionResult<PlanChangeResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context)
    if (blocked) return blocked

    const parsed = planChangeInput.safeParse({ code: planCode })
    if (!parsed.success) return fail("Paket tidak dikenali.", { code: "VALIDATION" })

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: context.tenant.id },
      select: { id: true, planId: true },
    })
    if (!subscription) return fail("Langganan belum tersedia untuk rental ini.", { code: "NOT_FOUND" })

    const target = await prisma.plan.findUnique({ where: { code: parsed.data.code } })
    if (!target) return fail("Paket tidak dikenali.", { code: "NOT_FOUND" })
    if (target.id === subscription.planId) {
      return fail(`Langganan Anda sudah paket ${target.name}.`, { code: "VALIDATION" })
    }

    const [vehicles, staff] = await Promise.all([
      prisma.vehicle.count({ where: { tenantId: context.tenant.id } }),
      prisma.membership.count({ where: { tenantId: context.tenant.id, isActive: true } }),
    ])
    if (vehicles > target.maxVehicles) {
      return fail(
        `Paket ${target.name} hanya menampung ${target.maxVehicles} kendaraan, armada Anda ${vehicles}. Kurangi armada atau pilih paket lain.`,
        { code: "PLAN_LIMIT" }
      )
    }
    if (staff > target.maxStaff) {
      return fail(
        `Paket ${target.name} hanya mengizinkan ${target.maxStaff} staf, Anda punya ${staff}. Nonaktifkan staf dulu atau pilih paket lain.`,
        { code: "PLAN_LIMIT" }
      )
    }

    await prisma.subscription.update({ where: { id: subscription.id }, data: { planId: target.id } })

    revalidatePath("/dashboard/billing")
    revalidatePath("/dashboard")

    return ok({ name: target.name, priceMonthly: target.priceMonthly })
  })
}

/** Berhenti otomatis di akhir periode, atau batalkan rencana penghentian itu. */
export async function setCancelAtPeriodEndAction(cancel: boolean): Promise<ActionResult<{ cancelAtPeriodEnd: boolean }>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = onlyManager(context)
    if (blocked) return blocked

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: context.tenant.id },
      select: { id: true, status: true },
    })
    if (!subscription) return fail("Langganan belum tersedia untuk rental ini.", { code: "NOT_FOUND" })
    if (subscription.status === "CANCELLED") {
      return fail("Langganan sudah berhenti. Buat rental baru atau hubungi dukungan.", { code: "VALIDATION" })
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: Boolean(cancel) },
    })

    revalidatePath("/dashboard/billing")
    revalidatePath("/dashboard")

    return ok({ cancelAtPeriodEnd: Boolean(cancel) })
  })
}
