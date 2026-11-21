"use server"

import { revalidatePath } from "next/cache"
import type { BookingPaymentStatus, Prisma } from "@prisma/client"
import {
  actionRejection,
  allowedActions,
  isActionAllowed,
  statusAfterAction,
  vehicleStatusAfterAction,
} from "@/lib/bookings/status"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { textOf } from "@/lib/form"
import { formatRupiah } from "@/lib/format"
import { depositStatusAfterRefund } from "@/lib/payments/fees"
import { recomputeBooking } from "@/lib/payments/apply"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import { requireTenant, requireWritable } from "@/lib/tenant"
import { bookingStatusFieldLabels, bookingStatusInput } from "@/lib/validators/booking"
import { closingFieldLabels, closingInput } from "@/lib/validators/handover"

export type StatusChangeResult = {
  code: string
  status: string
  paymentStatus: BookingPaymentStatus
}

function revalidateBookingPages(slug: string, code: string) {
  revalidatePath("/dashboard/bookings")
  revalidatePath(`/dashboard/bookings/${code}`)
  revalidatePath("/dashboard")
  revalidatePath(`/${slug}/booking/${code}`)
  revalidatePath(`/${slug}`)
}

/** Jumlah per jenis & status pembayaran, dihitung dari barisnya langsung. */
async function paymentSums(tx: Prisma.TransactionClient, bookingId: string) {
  const grouped = await tx.payment.groupBy({
    by: ["kind", "status"],
    where: { bookingId, kind: { in: ["RENTAL", "DEPOSIT"] } },
    _sum: { amount: true },
  })
  const sumOf = (kind: "RENTAL" | "DEPOSIT", status: "SETTLED" | "REFUNDED") =>
    grouped.find((row) => row.kind === kind && row.status === status)?._sum.amount ?? 0

  return {
    rentPaid: sumOf("RENTAL", "SETTLED"),
    depositHeld: sumOf("DEPOSIT", "SETTLED"),
    depositReturned: sumOf("DEPOSIT", "REFUNDED"),
  }
}

/**
 * Aksi status staf: konfirmasi, mulai sewa, atau batalkan. Penyelesaian sewa lewat
 * aksi terpisah karena butuh pencatatan denda dan pengembalian deposit.
 */
export async function changeBookingStatusAction(
  formData: FormData
): Promise<ActionResult<StatusChangeResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const parsed = bookingStatusInput.safeParse({
      code: textOf(formData, "code"),
      action: textOf(formData, "action"),
      reason: textOf(formData, "reason"),
    })
    if (!parsed.success) {
      return fail("Aksi tidak dikenali.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, bookingStatusFieldLabels),
      })
    }
    const { code, action, reason } = parsed.data

    if (action === "COMPLETE") {
      return fail("Selesaikan sewa lewat formulir pengembalian agar denda dan deposit ikut tercatat.", {
        code: "VALIDATION",
      })
    }

    const booking = await prisma.booking.findFirst({
      where: { tenantId: context.tenant.id, code },
      select: { id: true, code: true, status: true, vehicleId: true },
    })
    if (!booking) {
      return fail(`Kode booking ${code} tidak ditemukan di rental ini.`, {
        code: "NOT_FOUND",
        fields: { code: "Kode ini tidak dikenal" },
      })
    }
    if (!isActionAllowed(action, booking.status)) {
      const masihBisaDiatasi = allowedActions(booking.status).length > 0
      return fail(
        `${actionRejection(action)}${masihBisaDiatasi ? "" : " Pesanan ini sudah tidak bisa diubah."}`,
        { code: "CONFLICT" }
      )
    }

    const applied = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: statusAfterAction(action),
          ...(action === "CONFIRM" ? { expiresAt: null } : {}),
          ...(action === "CANCEL" ? { cancelledAt: new Date(), cancelReason: reason || null } : {}),
        },
      })

      const vehicleStatus = vehicleStatusAfterAction(action)
      if (vehicleStatus) {
        await tx.vehicle.updateMany({
          where: { id: booking.vehicleId, tenantId: context.tenant.id },
          data: { status: vehicleStatus },
        })
      }

      return recomputeBooking(tx, booking.id)
    }, TX_OPTIONS)

    revalidateBookingPages(context.tenant.slug, booking.code)
    return ok({
      code: booking.code,
      status: applied?.status ?? statusAfterAction(action),
      paymentStatus: applied?.paymentStatus ?? "UNPAID",
    })
  })
}

export type ClosingResult = {
  code: string
  lateFee: number
  damageFee: number
  refund: number
  paymentStatus: BookingPaymentStatus
}

/**
 * Mencatat pengembalian: denda keterlambatan, biaya kerusakan, deposit yang
 * dikembalikan, lalu pesanan ditutup. Angka tidak dipercaya dari form — pengembalian
 * dibatasi deposit yang benar-benar masih dipegang.
 */
export async function recordBookingClosingAction(formData: FormData): Promise<ActionResult<ClosingResult>> {
  return safeAction(async () => {
    const context = await requireTenant()
    const blocked = requireWritable(context)
    if (blocked) return fail(blocked, { code: "READ_ONLY" })

    const parsed = closingInput.safeParse({
      code: textOf(formData, "code"),
      lateFee: formData.get("lateFee") ?? "",
      damageFee: formData.get("damageFee") ?? "",
      depositRefund: formData.get("depositRefund") ?? "",
      method: textOf(formData, "method"),
      notes: textOf(formData, "notes"),
    })
    if (!parsed.success) {
      return fail("Periksa isian pengembalian.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, closingFieldLabels),
      })
    }
    const input = parsed.data

    const booking = await prisma.booking.findFirst({
      where: { tenantId: context.tenant.id, code: input.code },
      select: {
        id: true,
        code: true,
        status: true,
        vehicleId: true,
        totalAmount: true,
        depositAmount: true,
        lateFee: true,
        damageFee: true,
      },
    })
    if (!booking) {
      return fail(`Kode booking ${input.code} tidak ditemukan di rental ini.`, {
        code: "NOT_FOUND",
        fields: { code: "Kode ini tidak dikenal" },
      })
    }
    if (!isActionAllowed("COMPLETE", booking.status)) {
      return fail("Pengembalian hanya bisa dicatat untuk sewa yang sedang berjalan.", { code: "CONFLICT" })
    }

    const sums = await paymentSums(prisma, booking.id)
    const depositStillHeld = Math.max(0, sums.depositHeld - sums.depositReturned)
    // Kekurangan bayar sebelum denda baru: denda lama masih bagian dari tagihan.
    const dueBeforeNewFines = Math.max(
      0,
      booking.totalAmount - booking.depositAmount + booking.lateFee + booking.damageFee - sums.rentPaid
    )

    const lateFee = input.lateFee ?? 0
    const damageFee = input.damageFee ?? 0
    const refund = Math.max(0, input.depositRefund ?? 0)

    if (refund > depositStillHeld) {
      return fail(
        `Pengembalian melebihi deposit yang masih dipegang ${formatRupiah(depositStillHeld)}.`,
        { code: "VALIDATION", fields: { depositRefund: `Maksimal ${formatRupiah(depositStillHeld)}` } }
      )
    }

    const depositStatus = depositStatusAfterRefund({
      depositHeld: sums.depositHeld,
      depositReturned: sums.depositReturned,
      refund,
      outstandingRent: dueBeforeNewFines,
      lateFee,
      damageFee,
    })

    const applied = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "COMPLETED",
          lateFee,
          damageFee,
          depositStatus,
          depositRefunded: sums.depositReturned + refund,
        },
      })

      if (refund > 0) {
        await tx.payment.create({
          data: {
            tenantId: context.tenant.id,
            bookingId: booking.id,
            kind: "DEPOSIT",
            method: input.method,
            status: "REFUNDED",
            amount: refund,
            recordedById: context.user.id,
            notes: input.notes || "Pengembalian deposit saat kendaraan kembali",
            paidAt: new Date(),
          },
        })
      }

      // Kendaraan kembali tersedia kecuali sedang dijadwalkan perawatan.
      await tx.vehicle.updateMany({
        where: { id: booking.vehicleId, tenantId: context.tenant.id, status: "RENTED" },
        data: { status: "AVAILABLE" },
      })

      return recomputeBooking(tx, booking.id)
    }, TX_OPTIONS)

    revalidateBookingPages(context.tenant.slug, booking.code)
    revalidatePath("/dashboard/vehicles")
    revalidatePath("/dashboard/payments")

    return ok({
      code: booking.code,
      lateFee,
      damageFee,
      refund,
      paymentStatus: applied?.paymentStatus ?? "UNPAID",
    })
  })
}
