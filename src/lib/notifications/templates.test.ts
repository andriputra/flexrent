import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { BookingStatus } from "@prisma/client"
import { buildNotificationMessage, dedupeKeyFor, statusUrl, type NotifyBooking, type NotifyTenant } from "./templates"

const tenant: NotifyTenant = { name: "Bandung Ride Rental", slug: "bandung-ride", phone: "0812-3456-7890" }

const booking: NotifyBooking = {
  code: "BR-2611-0001",
  status: "PENDING" as BookingStatus,
  customerName: "Rizky Pratama",
  customerPhone: "08991234567",
  startsAt: new Date("2026-11-22T08:00:00+07:00"),
  endsAt: new Date("2026-11-25T17:00:00+07:00"),
  totalAmount: 1_700_000,
  paidAmount: 1_500_000,
  lateFee: 50_000,
  vehicle: { brand: "Toyota", model: "Avanza" },
}

// "Hari ini" 21 November 2026 jam 09.00 WIB.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-21T09:00:00+07:00"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("template WhatsApp", () => {
  it("konfirmasi pesanan menyebut kode, kendaraan, dan tautan status", () => {
    const message = buildNotificationMessage("BOOKING_CREATED", { tenant, booking })
    expect(message).toContain("BR-2611-0001")
    expect(message).toContain("Toyota Avanza")
    expect(message).toContain("Rp 1.700.000")
    expect(message).toContain("Rizky")
    expect(message).toContain("http://localhost:3000/bandung-ride/booking/BR-2611-0001?phone=08991234567")
  })

  it("pembayaran lunas memakai sisa nominal, bukan total", () => {
    const message = buildNotificationMessage("PAYMENT_SETTLED", { tenant, booking })
    expect(message).toContain("pembayaran Rp 1.500.000")
    expect(message).toContain("besok")
  })

  it("pengingat ambil memakai hitungan hari, bukan kata baku", () => {
    expect(buildNotificationMessage("PICKUP_REMINDER", { tenant, booking })).toContain("pengambilan Toyota Avanza besok")
    const sameDay = { ...booking, startsAt: new Date("2026-11-21T15:00:00+07:00") }
    expect(buildNotificationMessage("PICKUP_REMINDER", { tenant, booking: sameDay })).toContain(
      "pengambilan Toyota Avanza hari ini"
    )
  })

  it("pengingat pengembalian menyebut tanggal kembali", () => {
    const message = buildNotificationMessage("RETURN_REMINDER", { tenant, booking })
    expect(message).toContain("Rabu, 25 November 2026")
    expect(message).toContain("denda keterlambatan")
  })

  it("notifikasi keterlambatan menghitung hari lewat", () => {
    const late = { ...booking, endsAt: new Date("2026-11-19T17:00:00+07:00") }
    const message = buildNotificationMessage("LATE_NOTICE", { tenant, booking: late })
    expect(message).toContain("sudah lewat 2 hari")
    expect(message).toContain("Rp 50.000")
  })

  it("tidak meninggalkan token format mentah", () => {
    for (const kind of ["BOOKING_CREATED", "PAYMENT_SETTLED", "PICKUP_REMINDER", "RETURN_REMINDER", "LATE_NOTICE"] as const) {
      const message = buildNotificationMessage(kind, { tenant, booking })
      expect(message).not.toMatch(/yyyy|MMMM|HH:mm|'pukul'/)
      expect(message).not.toContain("NaN")
    }
  })
})

describe("dedupeKeyFor", () => {
  it("konfirmasi hanya sekali seumur booking", () => {
    const key = dedupeKeyFor("BOOKING_CREATED", booking, new Date("2026-11-21T00:00:00+07:00"))
    expect(key).toBe("BR-2611-0001:created")
    expect(dedupeKeyFor("BOOKING_CREATED", booking, new Date("2026-11-22T00:00:00+07:00"))).toBe(key)
  })

  it("pengingat harian berbeda per tanggal", () => {
    const yesterday = dedupeKeyFor("LATE_NOTICE", booking, new Date("2026-11-20T12:00:00+07:00"))
    const today = dedupeKeyFor("LATE_NOTICE", booking, new Date("2026-11-21T01:00:00+07:00"))
    expect(today).toBe("BR-2611-0001:late:2026-11-21")
    expect(yesterday).not.toBe(today)
  })

  it("pengingat H-1 dan pengembalian terkunci ke tanggal kejadian", () => {
    expect(dedupeKeyFor("PICKUP_REMINDER", booking)).toBe("BR-2611-0001:pickup:2026-11-22")
    expect(dedupeKeyFor("RETURN_REMINDER", booking)).toBe("BR-2611-0001:return:2026-11-25")
  })
})

describe("statusUrl", () => {
  it("memakai nomor ternormalisasi supaya halaman status langsung cocok", () => {
    expect(statusUrl({ tenant, booking })).toContain("phone=08991234567")
  })
})
