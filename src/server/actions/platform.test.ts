import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  tenantFindUnique: vi.fn(),
  planFindUnique: vi.fn(),
  tenantUpdate: vi.fn(),
  planUpdate: vi.fn(),
  auditCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  tenantCreate: vi.fn(),
  subscriptionCreate: vi.fn(),
  uniqueTenantSlug: vi.fn(),
  hashPassword: vi.fn(),
  generateHandoverPassword: vi.fn(),
}))

vi.mock("@/lib/platform", () => ({
  requirePlatformAdmin: () => mocks.requirePlatformAdmin(),
  createAuditLog: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: (path: string, scope?: string) => mocks.revalidatePath(path, scope) }))
vi.mock("@/lib/password", () => ({
  hashPassword: (value: string) => mocks.hashPassword(value),
  generateHandoverPassword: () => mocks.generateHandoverPassword(),
}))
vi.mock("@/server/tenant-provisioning", () => ({
  TRIAL_DAYS: 14,
  uniqueTenantSlug: (base: string) => mocks.uniqueTenantSlug(base),
}))
vi.mock("@/lib/db", () => ({
  TX_OPTIONS: { isolationLevel: "ReadCommitted" },
  prisma: {
    tenant: { findUnique: (args: unknown) => mocks.tenantFindUnique(args) },
    plan: { findUnique: (args: unknown) => mocks.planFindUnique(args) },
    user: {
      findUnique: (args: unknown) => mocks.userFindUnique(args),
      create: (args: unknown) => mocks.userCreate(args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        tenant: {
          update: (args: unknown) => mocks.tenantUpdate(args),
          create: (args: unknown) => mocks.tenantCreate(args),
        },
        plan: { update: (args: unknown) => mocks.planUpdate(args) },
        subscription: { create: (args: unknown) => mocks.subscriptionCreate(args) },
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
  mocks.uniqueTenantSlug.mockImplementation(async (base: string) => base)
  mocks.hashPassword.mockResolvedValue("scrypt$fake")
  mocks.generateHandoverPassword.mockReturnValue("TESTI-NG99-K7QF")
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

describe("createTenantByPlatformAction", () => {
  function body(overrides: Record<string, string> = {}) {
    const form = new FormData()
    const values = {
      name: "Sewa Jogja",
      slugInput: "sewa-jogja",
      city: "Yogyakarta",
      phone: "081234567890",
      address: "",
      email: "",
      ownerName: "Rizky Ananda",
      ownerEmail: "pemilik@sewajogja.id",
      planCode: "STARTER",
      withTrial: "true",
      ...overrides,
    }
    for (const [key, value] of Object.entries(values)) form.set(key, value)
    return form
  }

  function okPlan() {
    mocks.planFindUnique.mockResolvedValue({ id: "p1", name: "Starter" })
    mocks.tenantCreate.mockResolvedValue({ id: "t9", name: "Sewa Jogja", slug: "sewa-jogja" })
  }

  it("menolak email pemilik yang cacat tanpa menulis apa pun", async () => {
    const { createTenantByPlatformAction } = await actions()
    const result = await createTenantByPlatformAction(body({ ownerEmail: "bukan-email" }))
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" })
    expect(mocks.userCreate).not.toHaveBeenCalled()
    expect(mocks.tenantCreate).not.toHaveBeenCalled()
  })

  it("membuatkan akun pemilik baru dan mengembalikan sandi awalnya sekali", async () => {
    const { createTenantByPlatformAction } = await actions()
    okPlan()
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.userCreate.mockResolvedValue({ id: "u9" })

    const result = await createTenantByPlatformAction(body())
    expect(result).toMatchObject({
      ok: true,
      data: { tenantId: "t9", slug: "sewa-jogja", accountCreated: true, initialPassword: "TESTI-NG99-K7QF" },
    })
    expect(mocks.hashPassword).toHaveBeenCalledWith("TESTI-NG99-K7QF")
    expect(mocks.tenantCreate.mock.calls[0][0].data.memberships).toEqual({
      create: { userId: "u9", role: "OWNER", isActive: true },
    })
    expect(mocks.subscriptionCreate.mock.calls[0][0].data).toMatchObject({ tenantId: "t9", planId: "p1", status: "TRIALING" })
    expect(mocks.auditCreate.mock.calls[0][0].data).toMatchObject({
      actorId: "super",
      tenantId: "t9",
      action: "TENANT_CREATED",
      metadata: { slug: "sewa-jogja", planCode: "STARTER", ownerEmail: "pemilik@sewajogja.id", accountCreated: true },
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sewa-jogja", "layout")
  })

  it("memakai akun pemilik yang sudah ada tanpa mengubah sandinya", async () => {
    const { createTenantByPlatformAction } = await actions()
    okPlan()
    mocks.userFindUnique.mockResolvedValue({ id: "u1" })

    const result = await createTenantByPlatformAction(body({ ownerEmail: "Pemilik@SewaJogja.id" }))
    expect(result).toMatchObject({ ok: true, data: { accountCreated: false, initialPassword: null } })
    expect(mocks.userCreate).not.toHaveBeenCalled()
    // Email dinormalisasi ke huruf kecil sebelum dicari, supaya "Pemilik@..." tidak membuat akun kembar.
    expect(mocks.userFindUnique.mock.calls[0][0]).toMatchObject({ where: { email: "pemilik@sewajogja.id" } })
    expect(mocks.tenantCreate.mock.calls[0][0].data.memberships).toEqual({
      create: { userId: "u1", role: "OWNER", isActive: true },
    })
  })

  it("langsung menagih penuh saat masa uji dimatikan", async () => {
    const { createTenantByPlatformAction } = await actions()
    okPlan()
    mocks.userFindUnique.mockResolvedValue({ id: "u1" })

    const result = await createTenantByPlatformAction(body({ withTrial: "false" }))
    expect(result).toMatchObject({ ok: true, data: { trialEndsAt: null } })
    expect(mocks.subscriptionCreate.mock.calls[0][0].data).toMatchObject({
      status: "ACTIVE",
      trialEndsAt: null,
    })
  })
})
