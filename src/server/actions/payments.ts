"use server"

import { revalidatePath } from "next/cache"
import type { BookingPaymentStatus } from "@prisma/client"
import { formatDateId } from "@/lib/datetime"
import { formatRupiah } from "@/lib/format"
import { textOf } from "@/lib/form"
import { notifyBooking } from "@/lib/notifications"
import { recomputeBooking } from "@/lib/payments/apply"
import { getPaymentProvider } from "@/lib/payments/midtrans"
import { PaymentProviderError, orderIdFor, type PaymentKindKey } from "@/lib/payments/provider"
import { rentDueOf } from "@/lib/payments/reconcile"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { requireTenant, requireWritable } from "@/lib/tenant"
import { getPublicTenant } from "@/lib/tenant-public"
import { bookingLookupInput } from "@/lib/validators/booking"
import { manualPaymentInput, paymentFieldLabels } from "@/lib/validators/payment"
import { findPublicBooking } from "@/server/queries/public"

export type ManualPaymentResult = {
  code: string
  amount: number
  paymentStatus: BookingPaymentStatus
  becamePaid: boolean
}

/**
 * Pencatatan pembayaran tunai/transfer oleh staf. Jumlah tidak pernah dipercaya
 * begitu saja: dibandingkan dengan sisa tagihan yang dihitung ulang di server.
 */
export async function recordManualPaymentAction(formData: FormData): Promise<ActionResult<ManualPaymentResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const parsed = manualPaymentInput.safeParse({
      bookingCode: textOf(formData, "bookingCode"),
      kind: textOf(formData, "kind"),
      method: textOf(formData, "method"),
      amount: textOf(formData, "amount"),
      refCode: textOf(formData, "refCode"),
      notes: textOf(formData, "notes"),
    })
    if (!parsed.success) {
      return fail("Periksa isian pembayaran.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, paymentFieldLabels),
      })
    }
    const input = parsed.data

    const booking = await prisma.booking.findFirst({
      where: { tenantId: context.tenant.id, code: input.bookingCode },
      select: {
        id: true,
        code: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        lateFee: true,
        damageFee: true,
        paidAmount: true,
        customerName: true,
        customerPhone: true,
        startsAt: true,
        endsAt: true,
        vehicle: { select: { brand: true, model: true } },
      },
    })
    if (!booking) {
      return fail(`Kode booking ${input.bookingCode} tidak ditemukan di rental ini.`, {
        code: "NOT_FOUND",
        fields: { bookingCode: "Kode ini tidak dikenal" },
      })
    }
    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
      return fail("Pesanan sudah ditutup, pembayarannya tidak bisa dicatat.", { code: "VALIDATION" })
    }

    const cap = input.kind === "DEPOSIT" ? booking.depositAmount : rentDueOf(booking)
    const settled = await prisma.payment.aggregate({
      where: { tenantId: context.tenant.id, bookingId: booking.id, kind: input.kind, status: "SETTLED" },
      _sum: { amount: true },
    })
    const remaining = cap - (settled._sum.amount ?? 0)
    if (input.amount > remaining) {
      return fail(`Melebihi sisa ${input.kind === "DEPOSIT" ? "deposit" : "tagihan"} ${formatRupiah(Math.max(0, remaining))}.`, {
        code: "VALIDATION",
        fields: { amount: `Maksimal ${formatRupiah(Math.max(0, remaining))}` },
      })
    }

    const applied = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          tenantId: context.tenant.id,
          bookingId: booking.id,
          kind: input.kind,
          method: input.method,
          status: "SETTLED",
          amount: input.amount,
          refCode: input.refCode || null,
          recordedById: context.user.id,
          notes: input.notes || null,
          paidAt: new Date(),
        },
      })
      return recomputeBooking(tx, booking.id)
    }, TX_OPTIONS)

    revalidatePath("/dashboard/payments")
    revalidatePath(`/${context.tenant.slug}/booking/${booking.code}`)

    if (applied?.becamePaid) {
      await notifyBooking({
        tenantId: context.tenant.id,
        tenant: { name: context.tenant.name, slug: context.tenant.slug, phone: context.tenant.phone },
        bookingId: booking.id,
        kind: "PAYMENT_SETTLED",
        booking: {
          code: booking.code,
          status: applied.status,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          totalAmount: booking.totalAmount,
          paidAmount: applied.paidAmount,
          lateFee: booking.lateFee,
          vehicle: booking.vehicle,
        },
      })
    }

    return ok({
      code: booking.code,
      amount: input.amount,
      paymentStatus: applied?.paymentStatus ?? "UNPAID",
      becamePaid: applied?.becamePaid ?? false,
    })
  })
}

export type CheckoutInput = {
  slug: string
  code: string
  phone: string
  /** RENTAL = sisa tagihan sewa + denda; DEPOSIT = uang jaminan. */
  kind: PaymentKindKey
}

export type CheckoutSuccess = {
  orderId: string
  redirectUrl: string
  amount: number
}

const CLOSED = new Set(["CANCELLED", "EXPIRED", "COMPLETED"])

function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

/** 261121213000 — cukup pendek untuk order_id, cukup unik untuk percobaan ulang. */
function attemptStamp(): string {
  return new Date().toISOString().replace(/\D/g, "").slice(2, 14)
}

/**
 * Bayar lewat Midtrans dari halaman status publik. Otoritasnya sama dengan
 * halaman itu: kode booking + nomor WhatsApp pelanggan, bukan sesi admin.
 */
export async function createCheckoutAction(input: CheckoutInput): Promise<ActionResult<CheckoutSuccess>> {
  return safeAction(async () => {
    const tenant = await getPublicTenant(input.slug)
    if (!tenant) return fail("Rental tidak ditemukan.", { code: "NOT_FOUND" })

    const parsed = bookingLookupInput.safeParse({ code: input.code, phone: input.phone })
    if (!parsed.success) {
      return fail("Kode booking atau nomor WhatsApp belum benar.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, { code: "Kode booking", phone: "Nomor WhatsApp" }),
      })
    }
    const { code, phone } = parsed.data

    const booking = await findPublicBooking(tenant.id, code, phone)
    if (!booking) {
      return fail("Pesanan tidak ditemukan untuk nomor WhatsApp ini.", { code: "FORBIDDEN" })
    }
    if (CLOSED.has(booking.status)) {
      return fail("Pesanan ini sudah ditutup, tidak bisa dibayar lagi.", { code: "VALIDATION" })
    }

    const provider = getPaymentProvider()
    if (!provider) {
      return fail("Pembayaran online belum aktif di rental ini. Silakan bayar tunai atau transfer.", {
        code: "READ_ONLY",
      })
    }

    const amount = input.kind === "DEPOSIT" ? booking.depositAmount : rentDueOf(booking) - booking.paidAmount
    if (amount <= 0) {
      return fail(
        input.kind === "DEPOSIT" ? "Deposit untuk pesanan ini belum diatur." : "Sisa tagihan pesanan ini nol.",
        { code: "VALIDATION" }
      )
    }
    if (input.kind === "RENTAL" && booking.paymentStatus === "PAID") {
      return fail("Tagihan sewa pesanan ini sudah lunas.", { code: "VALIDATION" })
    }
    if (input.kind === "DEPOSIT") {
      const paidDeposit = await prisma.payment.findFirst({
        where: { tenantId: tenant.id, bookingId: booking.id, kind: "DEPOSIT", status: "SETTLED" },
        select: { id: true },
      })
      if (paidDeposit) return fail("Deposit pesanan ini sudah dibayar.", { code: "VALIDATION" })
    }

    const orderId = orderIdFor(booking.code, input.kind, attemptStamp())
    const title = `${input.kind === "DEPOSIT" ? "Deposit" : "Sewa"} ${booking.vehicle.brand} ${booking.vehicle.model}`

    let checkout
    try {
      checkout = await provider.createCheckout({
        orderId,
        amount,
        title,
        description: `${tenant.name} · ${formatDateId(booking.startsAt, "d MMM yyyy")} – ${formatDateId(booking.endsAt, "d MMM yyyy")} · ${formatRupiah(amount)}`,
        customer: { name: booking.customerName, phone, email: null },
        finishUrl: `${appOrigin()}/${tenant.slug}/booking/${booking.code}?phone=${phone}&paid=1`,
      })
    } catch (error) {
      if (error instanceof PaymentProviderError) return fail(error.message, { code: "UNKNOWN" })
      throw error
    }

    // Baris PENDING ditulis setelah Snap berhasil: jejak percobaan terlihat di
    // dashboard, dan webhook cukup mencari refCode yang sama.
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        bookingId: booking.id,
        kind: input.kind,
        method: "MIDTRANS",
        status: "PENDING",
        amount,
        refCode: orderId,
        midtransOrderId: orderId,
        notes: "Checkout dari halaman status publik",
      },
    })

    return ok({ orderId, redirectUrl: checkout.redirectUrl, amount })
  })
}
