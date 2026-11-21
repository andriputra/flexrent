import { describe, expect, it } from "vitest"
import { depositRefundPlan, suggestLateFee } from "./fees"

describe("suggestLateFee", () => {
  it("mengalikan tarif denda kendaraan dengan hari telat", () => {
    expect(suggestLateFee(100_000, 2)).toBe(200_000)
  })

  it("tanpa tarif denda atau tanpa keterlambatan tidak ada denda", () => {
    expect(suggestLateFee(null, 3)).toBe(0)
    expect(suggestLateFee(0, 3)).toBe(0)
    expect(suggestLateFee(100_000, 0)).toBe(0)
  })
})

describe("depositRefundPlan", () => {
  it("mengembalikan seluruh deposit bila tidak ada denda", () => {
    expect(
      depositRefundPlan({ depositHeld: 200_000, outstandingRent: 0, lateFee: 0, damageFee: 0 })
    ).toEqual({ deduction: 0, refund: 200_000, depositStatus: "REFUNDED" })
  })

  it("tidak menganggap deposit yang belum pernah diterima", () => {
    expect(
      depositRefundPlan({ depositHeld: 0, outstandingRent: 0, lateFee: 50_000, damageFee: 0 })
    ).toEqual({ deduction: 0, refund: 0, depositStatus: "HELD" })
  })

  it("denda menutup kekurangan bayar sewa lebih dulu", () => {
    const plan = depositRefundPlan({ depositHeld: 200_000, outstandingRent: 300_000, lateFee: 150_000, damageFee: 0 })
    expect(plan.deduction).toBe(0)
    expect(plan.refund).toBe(200_000)
    expect(plan.depositStatus).toBe("REFUNDED")
  })

  it("sisanya memotong deposit dan statusnya jadi sebagian", () => {
    const plan = depositRefundPlan({ depositHeld: 200_000, outstandingRent: 50_000, lateFee: 150_000, damageFee: 0 })
    expect(plan).toEqual({ deduction: 100_000, refund: 100_000, depositStatus: "PARTIAL_REFUNDED" })
  })

  it("denda melebihi deposit membuat deposit hangus, tidak minus", () => {
    const plan = depositRefundPlan({ depositHeld: 200_000, outstandingRent: 0, lateFee: 300_000, damageFee: 200_000 })
    expect(plan.deduction).toBe(200_000)
    expect(plan.refund).toBe(0)
    expect(plan.depositStatus).toBe("FORFEITED")
  })

  it("angka negatif dari input rusak tidak mengurangi deposit", () => {
    const plan = depositRefundPlan({ depositHeld: 200_000, outstandingRent: -500_000, lateFee: -50_000, damageFee: 0 })
    expect(plan).toEqual({ deduction: 0, refund: 200_000, depositStatus: "REFUNDED" })
  })
})
