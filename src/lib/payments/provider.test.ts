import { describe, expect, it } from "vitest"
import { kindFromOrderId, orderIdFor, parseOrderId } from "./provider"

describe("order_id", () => {
  it("menempelkan suffix jenis yang berbeda untuk tiap tagihan", () => {
    expect(orderIdFor("BR-2611-0001", "RENTAL")).toBe("BR-2611-0001-R")
    expect(orderIdFor("BR-2611-0001", "DEPOSIT")).toBe("BR-2611-0001-D")
    expect(orderIdFor("INV-2611-0001", "SUBSCRIPTION")).toBe("INV-2611-0001-I")
  })

  it("menambah stempel waktu saat pelanggan mencoba lagi", () => {
    const id = orderIdFor("INV-2611-0001", "SUBSCRIPTION", "261122081500")
    expect(id).toBe("INV-2611-0001-I-261122081500")
    expect(parseOrderId(id)).toEqual({ code: "INV-2611-0001", kind: "SUBSCRIPTION" })
  })

  it("nomor invoice yang berisi angka tetap terbaca utuh", () => {
    // Angka di dalam kode tidak boleh dikira stempel waktu percobaan.
    expect(parseOrderId("INV-2611-0012-R")).toEqual({ code: "INV-2611-0012", kind: "RENTAL" })
    expect(parseOrderId("BR-2611-0001-D-26112208")).toEqual({ code: "BR-2611-0001", kind: "DEPOSIT" })
  })

  it("order_id lama tanpa suffix dianggap tagihan sewa", () => {
    expect(parseOrderId("BRABCD2611001")).toBeNull()
    expect(kindFromOrderId("BRABCD2611001")).toBe("RENTAL")
    expect(kindFromOrderId("INV-2612-0004-I")).toBe("SUBSCRIPTION")
  })
})
