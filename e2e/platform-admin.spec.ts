import { expect, test, type Page } from "@playwright/test"
import { tenantSlugFromSitemap } from "./support"

// Akun ini harus punya akses platform: `npm run account:platform-admin -- <email> on`.
const DEMO_EMAIL = "demo@flexrent.local"
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "Flexrent-Demo-2026!"

/**
 * Ambang masuk 10 percobaan per 5 menit per alamat IP dibagi dengan suite lain
 * (login-flow juga mengirim formulir yang sama), jadi tunggu dan coba lagi bila
 * server menolak karena terlalu sering alih-alih menggagalkan tes.
 */
async function masuk(page: Page) {
  for (let percobaan = 0; percobaan < 3; percobaan++) {
    await page.goto("/login")
    await page.getByLabel("Email").fill(DEMO_EMAIL)
    await page.getByLabel("Sandi").fill(DEMO_PASSWORD)
    await page.getByRole("button", { name: "Masuk" }).click()

    const ditahan = page.locator('p[role="alert"]', { hasText: "Terlalu sering mengirim" })
    await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 60_000 }),
      ditahan.waitFor({ state: "visible", timeout: 60_000 }),
    ]).catch(() => {})
    if (await ditahan.isVisible().catch(() => false)) {
      await page.waitForTimeout(65_000)
      continue
    }
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 })
    return
  }
  throw new Error("Halaman masuk masih menolak karena pembatasan laju setelah 3 percobaan.")
}

/** Baris tenant di /admin/tenants dikenali dari kolom `/{slug}` di bawah namanya. */
function barisTenant(page: Page, slug: string) {
  return page.getByRole("row").filter({ hasText: `/${slug}` })
}

test.describe("control center platform", () => {
  // Suspend mengubah data bersama, jadi alur jalan berurutan dan selalu diakhiri
  // dengan mengaktifkan tenant kembali.
  test.describe.configure({ mode: "serial" })

  test("penjaga: /admin tanpa sesi diarahkan ke halaman masuk", async ({ browser }) => {
    const anonim = await browser.newContext()
    const page = await anonim.newPage()
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/login/, { timeout: 60_000 })
    await anonim.close()
  })

  test("mengunjungi ringkasan, daftar tenant, detail tenant, akun, dan paket", async ({ page, request }) => {
    const slug = await tenantSlugFromSitemap(request)
    await masuk(page)

    await page.goto("/admin")
    await expect(page.getByRole("heading", { name: "Control center platform" })).toBeVisible()
    await expect(page.getByRole("complementary", { name: "Navigasi platform" })).toBeVisible()
    for (const label of ["Total tenant", "Pengguna", "Kendaraan", "Booking", "MRR indikatif"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.locator("main")).toContainText(`/${slug}`)

    await page.getByRole("link", { name: "Semua tenant" }).click()
    await expect(page.getByRole("heading", { name: "Semua tenant" })).toBeVisible()
    const baris = barisTenant(page, slug)
    await expect(baris).toHaveCount(1)

    await baris.getByRole("link", { name: "Detail" }).click()
    await expect(page).toHaveURL(/\/admin\/tenants\/[A-Za-z0-9]+/, { timeout: 60_000 })
    await expect(page.getByText(`/${slug} ·`)).toBeVisible()
    await expect(page.getByRole("heading", { name: "Pengguna tenant" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Kembali ke tenant" })).toBeVisible()

    await page.getByRole("link", { name: "Akun rental" }).click()
    await expect(page.getByRole("heading", { name: "Akun rental" })).toBeVisible()
    await expect(page.locator("main")).toContainText(DEMO_EMAIL)

    await page.getByRole("link", { name: "Paket langganan" }).click()
    await expect(page.getByRole("heading", { name: "Paket langganan" })).toBeVisible()
    await expect(page.getByLabel("Bulanan").first()).not.toHaveValue("")
  })

  test("suspend lalu aktifkan ulang tenant dan tercatat di audit log", async ({ page, request }) => {
    const slug = await tenantSlugFromSitemap(request)
    await masuk(page)

    await page.goto("/admin/tenants")
    const baris = barisTenant(page, slug)

    await baris.getByRole("button", { name: "Suspend" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Suspend tenant ini?" })).toBeVisible()
    await dialog.getByRole("button", { name: "Suspend tenant" }).click()

    await expect(baris.getByRole("button", { name: "Aktifkan" })).toBeVisible({ timeout: 60_000 })
    await expect
      .poll(async () => (await request.get(`/${slug}`)).status(), { timeout: 60_000 })
      .toBe(404)

    await baris.getByRole("button", { name: "Aktifkan" }).click()
    await expect(dialog.getByRole("heading", { name: "Aktifkan tenant ini?" })).toBeVisible()
    await dialog.getByRole("button", { name: "Aktifkan tenant" }).click()

    await expect(baris.getByRole("button", { name: "Suspend" })).toBeVisible({ timeout: 60_000 })
    await expect
      .poll(async () => (await request.get(`/${slug}`)).status(), { timeout: 60_000 })
      .toBe(200)

    await page.goto("/admin/audit")
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible()
    await expect(page.getByText("TENANT_SUSPENDED").first()).toBeVisible()
    await expect(page.getByText("TENANT_REACTIVATED").first()).toBeVisible()
  })

  test("harga paket dapat disimpan dan aksinya tercatat", async ({ page }) => {
    await masuk(page)
    await page.goto("/admin/plans")

    // Kirim nilai yang sedang terpakai: membuktikan jalur tulis + audit tanpa
    // mengubah isi basis data bersama.
    const bulanan = page.getByLabel("Bulanan").first()
    const hargaSemula = await bulanan.inputValue()
    await page.getByRole("button", { name: "Simpan paket" }).first().click()

    await expect(page.getByText("Paket berhasil diperbarui.")).toBeVisible({ timeout: 60_000 })
    await expect(bulanan).toHaveValue(hargaSemula)

    await page.getByRole("link", { name: "Audit log" }).click()
    await expect(page.getByText("PLAN_UPDATED").first()).toBeVisible()
  })
})
