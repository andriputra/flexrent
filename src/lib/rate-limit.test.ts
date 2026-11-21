import { describe, expect, it } from "vitest"
import { RATE_RULES, clientIp } from "./rate-limit"

describe("clientIp", () => {
  it("mengambil alamat pertama dari rantai proxy", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })
    expect(clientIp(headers)).toBe("203.0.113.7")
  })

  it("memakai x-real-ip bila rantai proxy tidak ada", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4 " }))).toBe("198.51.100.4")
  })

  it("tidak pernah kosong walau header pembawa alamat absen", () => {
    expect(clientIp(new Headers())).toBe("alamat-tak-diketahui")
  })
})

describe("RATE_RULES", () => {
  it("setiap ambang memakai jendela minimal satu menit agar hitungan NAT wajar", () => {
    for (const rule of Object.values(RATE_RULES)) {
      expect(rule.windowMs).toBeGreaterThanOrEqual(60_000)
      expect(rule.limit).toBeGreaterThan(0)
    }
  })
})
