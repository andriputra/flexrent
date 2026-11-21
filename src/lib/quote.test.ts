import { describe, expect, it } from "vitest"
import { quoteRental } from "./quote"

describe("quoteRental", () => {
  it("memakai kombinasi termurah lalu menambahkan sopir per hari", () => {
    const quote = quoteRental({
      tariffs: { priceDaily: 120_000, priceWeekly: 750_000 },
      days: 10,
      withDriver: true,
      driverFeePerDay: 100_000,
    })
    // 1 minggu (750.000) + 3 hari (360.000) = 1.110.000; sopir 10 x 100.000.
    expect(quote.rentalAmount).toBe(1_110_000)
    expect(quote.driverAmount).toBe(1_000_000)
    expect(quote.totalAmount).toBe(2_110_000)
    expect(quote.rental.scheme).toBe("1 minggu + 3 hari")
  })

  it("memasukkan biaya antar sekali jalan dan deposit", () => {
    const quote = quoteRental({
      tariffs: { priceDaily: 150_000 },
      days: 3,
      deliveryFee: 50_000,
      deposit: 200_000,
    })
    expect(quote.rentalAmount).toBe(450_000)
    expect(quote.deliveryAmount).toBe(50_000)
    expect(quote.depositAmount).toBe(200_000)
    expect(quote.totalAmount).toBe(700_000)
  })

  it("tidak menghitung sopir saat layanan tidak dipilih", () => {
    const quote = quoteRental({
      tariffs: { priceDaily: 200_000 },
      days: 2,
      withDriver: false,
      driverFeePerDay: 150_000,
    })
    expect(quote.driverAmount).toBe(0)
    expect(quote.totalAmount).toBe(400_000)
  })

  it("menjepit durasi nol menjadi satu hari dan mengabaikan nilai negatif", () => {
    const quote = quoteRental({
      tariffs: { priceDaily: 100_000 },
      days: 0,
      withDriver: true,
      driverFeePerDay: -20_000,
      deliveryFee: -30_000,
      deposit: null,
    })
    expect(quote.days).toBe(1)
    expect(quote.driverAmount).toBe(0)
    expect(quote.deliveryAmount).toBe(0)
    expect(quote.depositAmount).toBe(0)
    expect(quote.totalAmount).toBe(100_000)
  })
})
