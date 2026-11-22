import { describe, expect, it } from "vitest"
import { addWibDays, toDayKey } from "@/lib/datetime"
import { bookingDraftInput } from "./booking"

const hariIni = toDayKey(new Date())

function dasar(overrides: Record<string, unknown> = {}) {
  return {
    vehicleId: "kendaraan-1",
    startDay: hariIni,
    startTime: "09:00",
    returnDay: addWibDays(hariIni, 1),
    returnTime: "09:00",
    name: "Agus Andri Putra",
    phone: "081234567890",
    email: "",
    idNumber: "",
    deliveryMode: "SELF_PICKUP",
    deliveryArea: "",
    deliveryAddress: "",
    withDriver: false,
    notes: "",
    agree: true,
    ...overrides,
  }
}

function pesanEmail(overrides: Record<string, unknown>) {
  const result = bookingDraftInput.safeParse(dasar(overrides))
  if (result.success) return null
  return result.error.issues.find((issue) => issue.path.join(".") === "email")?.message ?? null
}

describe("email pada pesanan", () => {
  // Regresi: regex lama menuntut TLD berupa angka (\d+), jadi "agus@gmail.com"
  // selalu ditolak dan penyewa tidak bisa menyelesaikan wizard bila mengisi email.
  it("menerima alamat dengan TLD huruf", () => {
    expect(pesanEmail({ email: "agus@gmail.com" })).toBeNull()
    expect(pesanEmail({ email: "work@kantor.co.id" })).toBeNull()
    expect(pesanEmail({ email: "a+b@sub.domain.net" })).toBeNull()
  })

  it("menolak TLD angka dan alamat yang belum lengkap", () => {
    expect(pesanEmail({ email: "agus@gmail.123" })).toBe("Email tidak valid")
    expect(pesanEmail({ email: "agus@gmail" })).toBe("Email tidak valid")
    expect(pesanEmail({ email: "agus@gmail.c" })).toBe("Email tidak valid")
    expect(pesanEmail({ email: "agus gmail@com" })).toBe("Email tidak valid")
  })

  it("tetap boleh dikosongkan", () => {
    expect(pesanEmail({ email: "" })).toBeNull()
    expect(pesanEmail({})).toBeNull()
  })

  it("dipangkas dan dikecilkan sebelum disimpan", () => {
    const result = bookingDraftInput.safeParse(dasar({ email: "  AGUS@Gmail.COM " }))
    expect(result.success).toBe(true)
    expect(result.success && result.data.email).toBe("agus@gmail.com")
  })
})
