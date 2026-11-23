import { describe, expect, it } from "vitest"
import { TESTIMONIAL_MESSAGE_MAX, testimonialInput, testimonialPublicInput } from "./testimonial"

const base = {
  id: "",
  vehicleId: "ALL",
  author: "Rudi",
  rating: "5",
  message: "Prosesnya cepat, motor bersih.",
  occurredDay: "2026-11-20",
  published: true,
}

describe("testimonialInput", () => {
  it("menormalkan kendaraan tanpa pilihan dan id kosong", () => {
    const parsed = testimonialInput.parse(base)
    expect(parsed.vehicleId).toBeNull()
    expect(parsed.id).toBeNull()
    expect(parsed.rating).toBe(5)
  })

  it("menerima angka sebagai string dari formulir", () => {
    expect(testimonialInput.parse({ ...base, rating: "4" }).rating).toBe(4)
    expect(testimonialInput.parse({ ...base, rating: 4 }).rating).toBe(4)
  })

  it("membuang rating di luar 1–5 dan tanggal salah format", () => {
    expect(testimonialInput.safeParse({ ...base, rating: "0" }).success).toBe(false)
    expect(testimonialInput.safeParse({ ...base, rating: "6" }).success).toBe(false)
    expect(testimonialInput.safeParse({ ...base, occurredDay: "20-11-2026" }).success).toBe(false)
  })

  it("memangkas nama dan menolak ulasan terlalu pendek atau terlalu panjang", () => {
    expect(testimonialInput.parse({ ...base, author: "  Rudi Hartono  " }).author).toBe("Rudi Hartono")
    expect(testimonialInput.safeParse({ ...base, message: "bagus" }).success).toBe(false)
    expect(
      testimonialInput.safeParse({ ...base, message: "a".repeat(TESTIMONIAL_MESSAGE_MAX + 1) })
        .success
    ).toBe(false)
  })

  it("membaca checkbox form sebagai status terbit", () => {
    expect(testimonialInput.parse({ ...base, published: "1" }).published).toBe(true)
    expect(testimonialInput.parse({ ...base, published: "0" }).published).toBe(false)
    expect(testimonialInput.parse({ ...base, published: "" }).published).toBe(false)
  })
})

describe("testimonialPublicInput", () => {
  it("hanya memuat isian pengirim: tanpa tanggal dan status", () => {
    const parsed = testimonialPublicInput.parse({
      vehicleId: "cmi1abc",
      author: "Sari",
      rating: "4",
      message: "Sopirnya tepat waktu, mobil wangi.",
    })
    expect(parsed).toEqual({ vehicleId: "cmi1abc", author: "Sari", rating: 4, message: expect.any(String) })
  })

  it("menolak rating kosong dan ulasan satu kata", () => {
    expect(
      testimonialPublicInput.safeParse({ vehicleId: "", author: "Sari", rating: "", message: "x".repeat(20) })
        .success
    ).toBe(false)
    expect(
      testimonialPublicInput.safeParse({ vehicleId: "", author: "Sari", rating: "5", message: "ok" }).success
    ).toBe(false)
  })
})
