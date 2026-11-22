import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn(), auditCreate: vi.fn() }))

// `cache()` dari React akan menyimpan hasil getPlatformContext antar tes, jadi
// module react dipalsukan agar fungsi aslinya dijalankan ulang tiap kasus.
vi.mock("react", () => ({ cache: (fn: unknown) => fn }))
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))
vi.mock("@/lib/auth", () => ({ auth: () => mocks.auth() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (args: unknown) => mocks.findUnique(args) },
    auditLog: { create: (args: unknown) => mocks.auditCreate(args) },
  },
}))

describe("requirePlatformAdmin", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.auth.mockReset()
    mocks.findUnique.mockReset()
  })

  it("mengirim tamu ke halaman masuk", async () => {
    const { requirePlatformAdmin } = await import("./platform")
    mocks.auth.mockResolvedValue(null)
    await expect(requirePlatformAdmin()).rejects.toThrow("redirect:/login")
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it("mengembalikan pemilik rental biasa ke dashboard-nya", async () => {
    const { requirePlatformAdmin } = await import("./platform")
    mocks.auth.mockResolvedValue({ user: { id: "user-biasa" } })
    mocks.findUnique.mockResolvedValue({ id: "user-biasa", isPlatformAdmin: false })
    await expect(requirePlatformAdmin()).rejects.toThrow("redirect:/dashboard")
  })

  it("menolak akun yang flag platformnya berubah menjadi nonaktif", async () => {
    // Sesi JWT lama tetap berisi id user, jadi keputusan harus dari basis data.
    const { requirePlatformAdmin } = await import("./platform")
    mocks.auth.mockResolvedValue({ user: { id: "user-dicabut" } })
    mocks.findUnique.mockResolvedValue({ id: "user-dicabut", isPlatformAdmin: false })
    await expect(requirePlatformAdmin()).rejects.toThrow("redirect:/dashboard")
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-dicabut" } }))
  })

  it("memberi admin platform konteksnya", async () => {
    const { requirePlatformAdmin } = await import("./platform")
    mocks.auth.mockResolvedValue({ user: { id: "super" } })
    mocks.findUnique.mockResolvedValue({ id: "super", isPlatformAdmin: true })
    await expect(requirePlatformAdmin()).resolves.toEqual({ user: { id: "super", isPlatformAdmin: true } })
  })
})

describe("createAuditLog", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.auditCreate.mockReset()
  })

  it("menormalkan kolom opsional yang absen menjadi null", async () => {
    const { createAuditLog } = await import("./platform")
    mocks.auditCreate.mockResolvedValue({ id: "log-1" })
    await createAuditLog({ actorId: "super", action: "PLAN_UPDATED", entityType: "Plan" })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: { actorId: "super", tenantId: null, action: "PLAN_UPDATED", entityType: "Plan", entityId: null },
    })
  })

  it("menyertakan metadata hanya bila diisi", async () => {
    const { createAuditLog } = await import("./platform")
    mocks.auditCreate.mockResolvedValue({ id: "log-2" })
    await createAuditLog({ actorId: "super", action: "X", entityType: "Y", metadata: { alasan: "manual" } })
    expect(mocks.auditCreate.mock.calls[0][0].data.metadata).toEqual({ alasan: "manual" })
  })
})
