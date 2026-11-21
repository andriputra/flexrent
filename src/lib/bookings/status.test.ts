import { describe, expect, it } from "vitest"
import {
  ACTION_LABEL,
  allowedActions,
  isActionAllowed,
  isStatusAction,
  statusAfterAction,
  vehicleStatusAfterAction,
} from "./status"

describe("allowedActions", () => {
  it("menawarkan konfirmasi hanya untuk pesanan menunggu", () => {
    expect(allowedActions("PENDING")).toEqual(["CONFIRM", "CANCEL"])
  })

  it("sesudah dikonfirmasi tinggal mulai atau batalkan", () => {
    expect(allowedActions("CONFIRMED")).toEqual(["START", "CANCEL"])
  })

  it("sewa berjalan hanya bisa diselesaikan", () => {
    expect(allowedActions("ONGOING")).toEqual(["COMPLETE"])
  })

  it("status akhir tidak punya aksi lagi", () => {
    expect(allowedActions("COMPLETED")).toEqual([])
    expect(allowedActions("CANCELLED")).toEqual([])
    expect(allowedActions("EXPIRED")).toEqual([])
  })
})

describe("isActionAllowed", () => {
  it("menolak aksi yang urutannya dilewati", () => {
    expect(isActionAllowed("START", "PENDING")).toBe(false)
    expect(isActionAllowed("COMPLETE", "CONFIRMED")).toBe(false)
    expect(isActionAllowed("CONFIRM", "ONGOING")).toBe(false)
  })

  it("membatalkan pesanan yang sedang berjalan tidak diizinkan", () => {
    expect(isActionAllowed("CANCEL", "ONGOING")).toBe(false)
  })
})

describe("statusAfterAction", () => {
  it("memetakan aksi ke status tujuan", () => {
    expect(statusAfterAction("CONFIRM")).toBe("CONFIRMED")
    expect(statusAfterAction("START")).toBe("ONGOING")
    expect(statusAfterAction("COMPLETE")).toBe("COMPLETED")
    expect(statusAfterAction("CANCEL")).toBe("CANCELLED")
  })
})

describe("vehicleStatusAfterAction", () => {
  it("hanya mulai dan selesai yang mengubah armada", () => {
    expect(vehicleStatusAfterAction("START")).toBe("RENTED")
    expect(vehicleStatusAfterAction("COMPLETE")).toBe("AVAILABLE")
    expect(vehicleStatusAfterAction("CONFIRM")).toBeNull()
    expect(vehicleStatusAfterAction("CANCEL")).toBeNull()
  })
})

describe("isStatusAction", () => {
  it("menyaring nilai asing dari form", () => {
    expect(isStatusAction("CONFIRM")).toBe(true)
    expect(isStatusAction("REFUND")).toBe(false)
    expect(isStatusAction("")).toBe(false)
  })

  it("label aksinya berbahasa Indonesia", () => {
    expect(Object.values(ACTION_LABEL)).toEqual(["Konfirmasi", "Mulai sewa", "Selesai", "Batalkan"])
  })
})
