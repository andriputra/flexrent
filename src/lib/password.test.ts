import { scryptSync } from "node:crypto"
import { describe, expect, it } from "vitest"
import { hashPassword, passwordWeakness, verifyPassword } from "./password"

describe("hashPassword", () => {
  it("menyimpan salt sehingga dua hash dari sandi yang sama berbeda", async () => {
    const a = await hashPassword("sandi-kuat-1")
    const b = await hashPassword("sandi-kuat-1")
    expect(a).not.toBe(b)
    expect(a.startsWith("scrypt$16384$8$1$")).toBe(true)
  })

  it("verifikasi bolak-balik", async () => {
    const hash = await hashPassword("sandi-kuat-1")
    expect(await verifyPassword("sandi-kuat-1", hash)).toBe(true)
    expect(await verifyPassword("Sandi-kuat-1", hash)).toBe(false)
    expect(await verifyPassword("sandi-kuat-1 ", hash)).toBe(false)
  })
})

describe("verifyPassword", () => {
  it("menolak tanpa hash", async () => {
    expect(await verifyPassword("apa-apa", null)).toBe(false)
    expect(await verifyPassword("apa-apa", undefined)).toBe(false)
    expect(await verifyPassword("apa-apa", "")).toBe(false)
  })

  it("menolak hash yang bentuknya tidak dikenal atau dirusak", async () => {
    const hash = await hashPassword("sandi-kuat-1")
    expect(await verifyPassword("sandi-kuat-1", "md5$sandi-kuat-1")).toBe(false)
    expect(await verifyPassword("sandi-kuat-1", "scrypt$abc$8$1$00$00")).toBe(false)
    expect(await verifyPassword("sandi-kuat-1", hash.replace(/.$/, "0"))).toBe(false)
  })

  it("menghormati parameter yang tersimpan di dalam hash", async () => {
    // Hash dengan N lebih rendah harus tetap bisa diverifikasi, jadi menaikkan
    // biaya di masa depan tidak mengunci akun yang sudah ada.
    const salt = Buffer.from("ab".repeat(16), "hex")
    const digest = scryptSync("sandi-kuat-1", salt, 64, { N: 4096, r: 8, p: 1, maxmem: 128 * 4096 * 8 * 2 })
    const hashLama = ["scrypt", 4096, 8, 1, salt.toString("hex"), digest.toString("hex")].join("$")
    expect(await verifyPassword("sandi-kuat-1", hashLama)).toBe(true)
    expect(await verifyPassword("sali-kuat-1", hashLama)).toBe(false)
  })

  it("menormalkan unicode agar sandi seragam di kedua sisi", async () => {
    const hash = await hashPassword("pässwort")
    expect(await verifyPassword("pässwort", hash)).toBe(true)
  })
})

describe("passwordWeakness", () => {
  it("meminta minimal 8 karakter", () => {
    expect(passwordWeakness("1234567")).toBe("Sandi minimal 8 karakter.")
    expect(passwordWeakness("12345678")).toBeNull()
    expect(passwordWeakness("--------")).toBe("Sandi harus mengandung huruf atau angka.")
  })
})
