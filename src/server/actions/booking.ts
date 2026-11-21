"use server"

import { Prisma } from "@prisma/client"
import { fromWib, rentalDays } from "@/lib/datetime"
import { getPublicTenant } from "@/lib/tenant-public"
import { bookingCodePrefix, buildBookingCode } from "@/lib/booking-code"
import { quoteRental } from "@/lib/quote"
import { spamRejection } from "@/lib/anti-abuse"
import { StorageError, deletePrivateFiles, uploadPrivateFile, type StoredPrivateFile } from "@/lib/storage"
import { fieldErrorsFromZod, fail, ok, safeAction, type ActionResult } from "@/lib/result"
import type { Quote } from "@/lib/quote"
import { bookingDraftInput, bookingFieldLabels, type BookingDraft } from "@/lib/validators/booking"
import { notifyBooking } from "@/lib/notifications"
import { prisma, TX_OPTIONS } from "@/lib/db"
import { findBlockedCustomer } from "@/server/queries/public"

const PENDING_TTL_MS = 2 * 60 * 60_000
const ACTIVE_STATUSES: Prisma.BookingWhereInput["status"] = { in: ["PENDING", "CONFIRMED", "ONGOING"] }

const DRAFT_KEYS = [
  "vehicleId",
  "startDay",
  "startTime",
  "returnDay",
  "returnTime",
  "name",
  "phone",
  "email",
  "idNumber",
  "deliveryMode",
  "deliveryArea",
  "deliveryAddress",
  "withDriver",
  "notes",
  "agree",
] as const

/** Bentrok terakhir di database (exclusion constraint) harus jadi penolakan, bukan 500. */
function isClashError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return true
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("bookings_no_time_overlap") || message.includes("23P01")
}

class BookingConflict extends Error {}

/** FormData hanya mengirim string; field yang hilang dianggap kosong. */
function readDraft(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {}
  for (const key of DRAFT_KEYS) {
    const value = formData.get(key)
    record[key] = typeof value === "string" ? value : ""
  }
  return record
}

function tariffsOf(vehicle: { priceDaily: number; priceWeekly: number | null; priceMonthly: number | null }) {
  return {
    priceDaily: vehicle.priceDaily,
    priceWeekly: vehicle.priceWeekly,
    priceMonthly: vehicle.priceMonthly,
  }
}

export type QuoteRequest = {
  slug: string
  vehicleId: string
  startDay: string
  startTime: string
  returnDay: string
  returnTime: string
  withDriver: boolean
}

/** Kalkulator harga di halaman publik: angka selalu dihitung ulang dari tarif di database. */
export async function quoteVehicleAction(
  request: QuoteRequest
): Promise<ActionResult<{ quote: Quote; acceptingBookings: boolean }>> {
  return safeAction(async () => {
    const tenant = await getPublicTenant(request.slug)
    if (!tenant) return fail("Rental tidak ditemukan.", { code: "NOT_FOUND" })

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: request.vehicleId, tenantId: tenant.id, isPublished: true },
      select: {
        priceDaily: true,
        priceWeekly: true,
        priceMonthly: true,
        driverFee: true,
        deposit: true,
        hasDriver: true,
      },
    })
    if (!vehicle) return fail("Kendaraan tidak tersedia.", { code: "NOT_FOUND" })

    const startsAt = fromWib(request.startDay, request.startTime)
    const endsAt = fromWib(request.returnDay, request.returnTime)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return fail("Tanggal ambil dan kembali belum benar.", { code: "VALIDATION" })
    }

    const quote = quoteRental({
      tariffs: tariffsOf(vehicle),
      days: rentalDays(startsAt, endsAt),
      withDriver: request.withDriver && vehicle.hasDriver,
      driverFeePerDay: vehicle.driverFee,
      deposit: vehicle.deposit,
    })
    return ok({ quote, acceptingBookings: tenant.acceptingBookings })
  })
}

/**
 * Membuat booking PENDING. Cek bentrok berjalan di dalam transaksi dan dilapis
 * exclusion constraint database, jadi dua pesanan serentak tidak keduanya lolos.
 */
export async function createBookingAction(
  formData: FormData
): Promise<ActionResult<{ code: string; phone: string }>> {
  return safeAction(async () => {
    const slug = String(formData.get("slug") ?? "")
    const tenant = await getPublicTenant(slug)
    if (!tenant) return fail("Rental tidak ditemukan.", { code: "NOT_FOUND" })
    if (!tenant.acceptingBookings) {
      return fail(tenant.closedMessage ?? "Rental sedang tidak menerima pesanan baru.", { code: "READ_ONLY" })
    }

    // Gerbang anti-bot ditaruh sebelum validasi & upload supaya spam tidak menyentuh DB.
    const rejected = await spamRejection(formData, {
      scope: "booking",
      identity: slug,
      ticketBinding: `${slug}:${String(formData.get("vehicleId") ?? "")}`,
    })
    if (rejected) return rejected

    const parsed = bookingDraftInput.safeParse(readDraft(formData))
    if (!parsed.success) {
      return fail("Periksa kembali isian pesanan.", {
        code: "VALIDATION",
        fields: fieldErrorsFromZod(parsed.error, bookingFieldLabels),
      })
    }
    const draft: BookingDraft = parsed.data
    const startsAt = fromWib(draft.startDay, draft.startTime)
    const endsAt = fromWib(draft.returnDay, draft.returnTime)

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: draft.vehicleId, tenantId: tenant.id, isPublished: true, status: { not: "INACTIVE" } },
    })
    if (!vehicle) return fail("Kendaraan tidak tersedia.", { code: "NOT_FOUND" })
    if (draft.withDriver && !vehicle.hasDriver) {
      return fail("Layanan sopir tidak tersedia untuk kendaraan ini.", {
        code: "VALIDATION",
        fields: { withDriver: "Kendaraan ini tidak bisa disopiri" },
      })
    }
    if (await findBlockedCustomer(tenant.id, draft.phone)) {
      return fail("Pesanan tidak dapat diproses. Silakan hubungi rental lewat WhatsApp.", { code: "FORBIDDEN" })
    }

    const quote = quoteRental({
      tariffs: tariffsOf(vehicle),
      days: rentalDays(startsAt, endsAt),
      withDriver: draft.withDriver,
      driverFeePerDay: vehicle.driverFee,
      deposit: vehicle.deposit,
    })

    const incoming = ["ktp", "sim"] as const
    const uploads: { kind: "KTP" | "SIM"; stored: StoredPrivateFile }[] = []
    try {
      for (const name of incoming) {
        const file = formData.get(name)
        if (!(file instanceof File) || file.size === 0) continue
        const stored = await uploadPrivateFile(file, `documents/${tenant.slug}`)
        uploads.push({ kind: name === "ktp" ? "KTP" : "SIM", stored })
      }

      const created = await prisma.$transaction(async (tx) => {
        const clash = await tx.booking.findFirst({
          where: { vehicleId: vehicle.id, status: ACTIVE_STATUSES, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
          select: { id: true },
        })
        if (clash) throw new BookingConflict("Kendaraan ini sudah dipesan di tanggal tersebut. Coba tanggal lain.")

        const maintenance = await tx.maintenancePlan.findFirst({
          where: { vehicleId: vehicle.id, isDone: false, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
          select: { id: true },
        })
        if (maintenance) throw new BookingConflict("Kendaraan sedang dalam perawatan pada tanggal tersebut.")

        const customer = await tx.customer.upsert({
          where: { tenantId_phone: { tenantId: tenant.id, phone: draft.phone } },
          update: { name: draft.name, email: draft.email || undefined },
          create: {
            tenantId: tenant.id,
            phone: draft.phone,
            name: draft.name,
            email: draft.email || null,
            city: tenant.city,
          },
        })

        // Nomor urut mengikuti jumlah pesanan bulan itu; dicoba ulang bila kodenya dipakai orang lain.
        const prefix = bookingCodePrefix(startsAt)
        let booking: { id: string; code: string } | null = null
        for (let attempt = 0; attempt < 5 && !booking; attempt += 1) {
          const seq = (await tx.booking.count({ where: { code: { startsWith: prefix } } })) + 1 + attempt
          try {
            booking = await tx.booking.create({
              data: {
                tenantId: tenant.id,
                code: buildBookingCode(startsAt, seq),
                vehicleId: vehicle.id,
                customerId: customer.id,
                customerName: draft.name,
                customerPhone: draft.phone,
                customerEmail: draft.email || null,
                customerIdCard: draft.idNumber || null,
                startsAt,
                endsAt,
                days: quote.days,
                status: "PENDING",
                paymentStatus: "UNPAID",
                deliveryMode: draft.deliveryMode,
                deliveryArea: draft.deliveryMode === "DELIVERY" ? draft.deliveryArea || null : null,
                deliveryAddress: draft.deliveryMode === "DELIVERY" ? draft.deliveryAddress || null : null,
                deliveryFee: 0,
                withDriver: draft.withDriver,
                driverFee: quote.driverAmount,
                rentalAmount: quote.rentalAmount,
                depositAmount: quote.depositAmount,
                totalAmount: quote.totalAmount,
                notes: draft.notes || null,
                source: "PUBLIC",
                expiresAt: new Date(Date.now() + PENDING_TTL_MS),
              },
              select: { id: true, code: true },
            })
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue
            throw error
          }
        }
        if (!booking) throw new Error("Kode booking gagal dibuat, coba lagi sebentar.")

        for (const item of uploads) {
          await tx.document.create({
            data: {
              tenantId: tenant.id,
              customerId: customer.id,
              bookingId: booking.id,
              type: item.kind,
              storageKey: item.stored.storageKey,
              fileName: item.stored.fileName,
              mimeType: item.stored.mimeType,
              sizeBytes: item.stored.sizeBytes,
            },
          })
        }
        return booking
      }, TX_OPTIONS)

      // Pelanggan dikabari setelah baris booking aman; notifikasi tidak boleh
      // membatalkan pesanan yang sudah terbentuk.
      await notifyBooking({
        tenantId: tenant.id,
        tenant: { name: tenant.name, slug: tenant.slug, phone: tenant.phone },
        bookingId: created.id,
        kind: "BOOKING_CREATED",
        booking: {
          code: created.code,
          status: "PENDING",
          customerName: draft.name,
          customerPhone: draft.phone,
          startsAt,
          endsAt,
          totalAmount: quote.totalAmount,
          paidAmount: 0,
          lateFee: 0,
          vehicle: { brand: vehicle.brand, model: vehicle.model },
        },
      })

      return ok({ code: created.code, phone: draft.phone })
    } catch (error) {
      if (uploads.length) await deletePrivateFiles(uploads.map((item) => item.stored.storageKey)).catch(() => undefined)
      if (error instanceof BookingConflict) {
        return fail(error.message, { code: "CONFLICT", fields: { startDay: error.message } })
      }
      if (error instanceof StorageError) return fail(error.message, { code: "VALIDATION" })
      if (isClashError(error)) {
        return fail("Kendaraan ini baru saja dipesan orang lain untuk tanggal tersebut. Coba tanggal lain.", {
          code: "CONFLICT",
          fields: { startDay: "Tanggal ini baru saja terisi" },
        })
      }
      throw error
    }
  })
}
