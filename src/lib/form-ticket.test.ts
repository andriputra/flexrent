import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { issueFormTicket, verifyFormTicket } from "./form-ticket"

const BINDING = "motorku:veh_1"

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "rahasia-uji")
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-22T03:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe("issueFormTicket", () => {
  it("menolak kiriman yang datang sebelum jeda baca form", () => {
    const ticket = issueFormTicket(BINDING)
    expect(verifyFormTicket(ticket, BINDING)).toBe(false)
  })

  it("menerima kiriman setelah jeda dan masih di dalam umur tiket", () => {
    const ticket = issueFormTicket(BINDING)
    vi.advanceTimersByTime(10_000)
    expect(verifyFormTicket(ticket, BINDING)).toBe(true)
  })

  it("menolak tiket yang lebih tua dari umur maksimum", () => {
    const ticket = issueFormTicket(BINDING)
    vi.advanceTimersByTime(31 * 60_000)
    expect(verifyFormTicket(ticket, BINDING)).toBe(false)
  })

  it("menolak tiket yang dipakai untuk form lain", () => {
    const ticket = issueFormTicket(BINDING)
    vi.advanceTimersByTime(10_000)
    expect(verifyFormTicket(ticket, "motorku:veh_2")).toBe(false)
  })

  it("menolak tanda tangan yang diubah dan isian asal-asalan", () => {
    const ticket = issueFormTicket(BINDING)
    vi.advanceTimersByTime(10_000)
    const [issuedAt] = ticket.split(".")
    const forgedSig = "0".repeat(64)
    expect(verifyFormTicket(`${issuedAt}.${forgedSig}`, BINDING)).toBe(false)
    expect(verifyFormTicket("bukan-tiket", BINDING)).toBe(false)
    expect(verifyFormTicket("", BINDING)).toBe(false)
  })
})
