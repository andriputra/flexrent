import { describe, expect, it } from "vitest"
import { calculateRentalPrice } from "./pricing"
import { vehicleInput } from "./validators/vehicle"

describe("calculateRentalPrice", () => {
  it("memakai tarif harian bila hanya itu yang diisi", () => {
    const result = calculateRentalPrice({ priceDaily: 120_000 }, 3)
    expect(result.amount).toBe(360_000)
    expect(result.scheme).toBe("3 hari")
  })

  it("memilih mingguan saat lebih murah dari 7 hari harian", () => {
    const result = calculateRentalPrice({ priceDaily: 120_000, priceWeekly: 750_000 }, 7)
    expect(result.amount).toBe(750_000)
    expect(result.weeks).toBe(1)
    expect(result.remainderDays).toBe(0)
  })

  it("menggabungkan minggu dan hari sisa", () => {
    const result = calculateRentalPrice({ priceDaily: 120_000, priceWeekly: 750_000 }, 10)
    expect(result.weeks).toBe(1)
    expect(result.remainderDays).toBe(3)
    expect(result.amount).toBe(750_000 + 3 * 120_000)
    expect(result.scheme).toBe("1 minggu + 3 hari")
  })

  it("memilih bulanan untuk durasi panjang meski melebihi durasi", () => {
    // 25 hari: 25 x 120.000 = 3.000.000; sebulan 2.600.000 -> bulanan menang.
    const result = calculateRentalPrice(
      { priceDaily: 120_000, priceWeekly: 750_000, priceMonthly: 2_600_000 },
      25
    )
    expect(result.months).toBe(1)
    expect(result.amount).toBe(2_600_000)
    expect(result.scheme).toBe("1 bulan")
  })

  it("mengkombinasikan bulan, minggu, dan hari", () => {
    const result = calculateRentalPrice(
      { priceDaily: 100_000, priceWeekly: 600_000, priceMonthly: 2_200_000 },
      38
    )
    // 1 bulan (30) + 1 minggu (7) + 1 hari = 2.200.000 + 600.000 + 100.000
    expect(result.amount).toBe(2_900_000)
    expect(result.months).toBe(1)
    expect(result.weeks).toBe(1)
    expect(result.remainderDays).toBe(1)
    expect(result.scheme).toBe("1 bulan + 1 minggu + 1 hari")
  })

  it("membulatkan ke bawah dan menjepit durasi tidak masuk akal", () => {
    const short = calculateRentalPrice({ priceDaily: 50_000 }, 0)
    expect(short.days).toBe(1)
    expect(short.amount).toBe(50_000)

    const long = calculateRentalPrice({ priceDaily: 50_000 }, 5_000)
    expect(long.days).toBe(366)
    expect(long.amount).toBe(366 * 50_000)
  })

  it("mengabaikan nol hari durasi sewa dengan tetap mengembalikan satu hari", () => {
    const result = calculateRentalPrice({ priceDaily: 150_000, priceMonthly: 3_000_000 }, -4)
    expect(result.amount).toBe(150_000)
  })
})

// Rule tariknya di validator: diskon per periode dilarang jadi lebih mahal.
// Semua key ikut diisi seperti FormData dari form kendaraan.
describe("sanity tarif pada vehicleInput", () => {
  const mobil = {
    type: "MOBIL",
    plate: "D 9090 INI",
    brand: "Toyota",
    model: "Innova Reborn",
    year: "2021",
    color: "Hitam",
    transmission: "MANUAL",
    fuelType: "PETROL",
    engineCc: "",
    seats: "7",
    hasDriver: "true",
    driverFee: "150000",
    priceDaily: "650000",
    priceWeekly: "",
    priceMonthly: "",
    deposit: "1500000",
    odometer: "112400",
    status: "AVAILABLE",
    description: "",
    isPublished: "true",
  }

  it("menerima tarif mingguan dan bulanan yang lebih murah dari ekuivalen hariannya", () => {
    const parsed = vehicleInput.safeParse({
      ...mobil,
      priceWeekly: "4100000",
      priceMonthly: "16000000",
    })
    expect(parsed.success).toBe(true)
  })

  it("menolak tarif mingguan yang lebih mahal dari 7 hari", () => {
    const parsed = vehicleInput.safeParse({ ...mobil, priceWeekly: "5000000" })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path[0])).toContain("priceWeekly")
    }
  })

  it("menolak tarif bulanan yang lebih mahal dari 30 hari", () => {
    const parsed = vehicleInput.safeParse({ ...mobil, priceMonthly: "21000000" })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path[0])).toContain("priceMonthly")
    }
  })
})
