import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  tenantFindUnique: vi.fn(),
  planFindUnique: vi.fn(),
  tenantUpdate: vi.fn(),
  planUpdate: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock("@/lib/platform", () => ({
  requirePlatformAdmin: () => mocks.requirePlatformAdmin(),
  createAuditLog: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: (path: string, scope?: string) => mocks.revalidatePath(path, scope) }))
vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: { findUnique: (args: unknown) => mocks.tenantFindUnique(args) },
    plan: { findUnique: (args: unknown) => mocks.planFindUnique(args) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: { update: (args: unknown) => mocks.tenantUpdate(args) },
        plan: { update: (args: unknown) => mocks.planUpdate(args) },
        auditLog: { create: (args: unknown) => mocks.auditCreate(args) },
      }),
  },
}))

async function actions() {
  vi.resetModules()
  return import("./platform")
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
  mocks.requirePlatformAdmin.mockResolvedValue({ user: { id: "super" } })
})

describe("setPlatformTenantActiveAction", () => {
  function body(tenantId: string, active: boolean) {
    const form = new FormData()
    form.set("tenantId", tenantId)
    form.set("active", String(active))
    return form
  }

  it("menolak tenant yang tidak ada tanpa menulis apa pun", async () => {
    const { setPlatformTenantActiveAction } = await actions()
    mocks.tenantFindUnique.mockResolvedValue(null)
    const result = await setPlatformTenantActiveAction(body("tenant-asing", false))
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" })
    expect(mocks.tenantUpdate).not.toHaveBeenCalled()
  })

  it("tidak membuat jejak audit saat status sudah sesuai", async () => {
    const { setPlatformTenantActiveAction } = await actions()
    mocks.tenantFindUnique.mockResolvedValue({ id: "t1", name: "Bandung Ride", slug: "bandung-ride", isActive: false })
    const result = await setPlatformTenantActiveAction(body("t1", false))
    expect(result.ok).toBe(true)
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it("menyuspend tenant, mencatat audit, dan menyegarkan seluruh situs tenant", async () => {
    const { setPlatformTenantActiveAction } = await actions()
    mocks.tenantFindUnique.mockResolvedValue({ id: "t1", name: "Bandung Ride", slug: "bandung-ride", isActive: true })
    const result = await setPlatformTenantActiveAction(body("t1", false))
    expect(result.ok).toBe(true)
    expect(mocks.tenantUpdate).toHaveBeenCalledWith({ where: { id: "t1" }, data: { isActive: false } })
    expect(mocks.auditCreate.mock.calls[0][0].data).toMatchObject({
      actorId: "super",
      tenantId: "t1",
      action: "TENANT_SUSPENDED",
      metadata: { previousActive: true, nextActive: false },
    })
    // scope "layout" wajib: tanpa itu halaman kendaraan yang tercache tetap melayani tenant suspend.
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bandung-ride", "layout")
  })

  it("menolak tanpa akses platform", async () => {
    const { setPlatformTenantActiveAction } = await actions()
    // requirePlatformAdmin gagal lewat redirect Next; aman bila aksi berhenti di sini.
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/dashboard" })
    mocks.requirePlatformAdmin.mockRejectedValue(redirectError)
    const logError = vi.spyOn(console, "error").mockImplementation(() => {})
    const result = await setPlatformTenantActiveAction(body("t1", false))
    logError.mockRestore()
    expect(result.ok).toBe(false)
    expect(mocks.tenantUpdate).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })
})

describe("updatePlatformPlanAction", () => {
  function body(values: Record<string, string>) {
    const form = new FormData()
    for (const [key, value] of Object.entries(values)) form.set(key, value)
    return form
  }

  it("menolak angka negatif tanpa menyentuh basis data", async () => {
    const { updatePlatformPlanAction } = await actions()
    const result = await updatePlatformPlanAction(
      body({ planId: "p1", priceMonthly: "-1000", maxVehicles: "10", maxStaff: "3", isPublic: "true" }),
    )
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" })
    expect(mocks.planUpdate).not.toHaveBeenCalled()
  })

  it("memakai nol sebagai harga gratis dan mengosongkan harga tahunan yang dibiarkan kosong", async () => {
    const { updatePlatformPlanAction } = await actions()
    mocks.planFindUnique.mockResolvedValue({ id: "p1", name: "Starter" })
    const result = await updatePlatformPlanAction(
      body({ planId: "p1", priceMonthly: "0", priceYearly: "", maxVehicles: "3", maxStaff: "1", isPublic: "false" }),
    )
    expect(result.ok).toBe(true)
    // priceYearly kosong harus null, bukan 0: 0 berarti "gratis setahun", null berarti "tidak ada opsi tahunan".
    expect(mocks.planUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { priceMonthly: 0, priceYearly: null, maxVehicles: 3, maxStaff: 1, isPublic: false },
    })
    expect(mocks.auditCreate.mock.calls[0][0].data).toMatchObject({ action: "PLAN_UPDATED", entityId: "p1" })
  })
})
