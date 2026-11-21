import { describe, expect, it } from "vitest"
import { reconcileBooking, rentDueOf, type ReconcileBooking, type ReconcilePayment } from "./reconcile"

const base: ReconcileBooking = {
  status: "PENDING",
  totalAmount: 1_700_000,
  depositAmount: 200_000,
  lateFee: 0,
  damageFee: 0,
}

function rental(amount: number, status: ReconcilePayment["status"] = "SETTLED"): ReconcilePayment {
  return { kind: "RENTAL", status, amount }
}

describe("rentDueOf", () => {
  it("memisahkan deposit dari tagihan sewa", () => {
    expect(rentDueOf(base)).toBe(1_500_000)
  })

  it("menambahkan denda", () => {
    expect(rentDueOf({ ...base, lateFee: 50_000, damageFee: 100_000 })).toBe(1_650_000)
  })

  it("tidak pernah negatif untuk booking tanpa deposit", () => {
    expect(rentDueOf({ ...base, depositAmount: 9_000_000 })).toBe(0)
  })
})

describe("reconcileBooking", () => {
  it("UNPAID saat belum ada pembayaran lunas", () => {
    const result = reconcileBooking(base, [rental(500_000, "PENDING"), rental(0, "FAILED")])
    expect(result).toMatchObject({ dueAmount: 1_500_000, paidAmount: 0, paymentStatus: "UNPAID", status: "PENDING" })
  })

  it("PARTIAL untuk sebagian dan tidak mengubah status", () => {
    const result = reconcileBooking(base, [rental(900_000), rental(100_000, "REFUNDED")])
    expect(result).toMatchObject({ paidAmount: 900_000, paymentStatus: "PARTIAL", status: "PENDING" })
  })

  it("PAID saat lunas dan mengonfirmasi booking PENDING", () => {
    const result = reconcileBooking(base, [rental(1_000_000), rental(500_000)])
    expect(result).toMatchObject({ paidAmount: 1_500_000, paymentStatus: "PAID", status: "CONFIRMED" })
  })

  it("kelebihan bayar tetap PAID", () => {
    expect(reconcileBooking(base, [rental(2_000_000)]).paymentStatus).toBe("PAID")
  })

  it("tidak mengubah status selain PENDING", () => {
    for (const status of ["CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED"] as const) {
      expect(reconcileBooking({ ...base, status }, [rental(1_500_000)]).status).toBe(status)
    }
  })

  it("booking tanpa deposit langsung PAID bila total terbayar", () => {
    const result = reconcileBooking({ ...base, depositAmount: 0, totalAmount: 1_500_000 }, [rental(1_500_000)])
    expect(result).toMatchObject({ paymentStatus: "PAID", status: "CONFIRMED" })
  })

  it("mengabaikan pembayaran deposit dan langganan", () => {
    const payments: ReconcilePayment[] = [
      { kind: "DEPOSIT", status: "SETTLED", amount: 200_000 },
      { kind: "SUBSCRIPTION", status: "SETTLED", amount: 150_000 },
    ]
    expect(reconcileBooking(base, payments)).toMatchObject({ paidAmount: 0, paymentStatus: "UNPAID" })
  })
})
