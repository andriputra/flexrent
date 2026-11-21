import { expect, test } from "@playwright/test"

// Sandi ini berasal dari prisma/seed.ts (DEMO_PASSWORD ?? nilai bawaan).
const DEMO_EMAIL = "demo@flexrent.local"
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "Flexrent-Demo-2026!"

test.describe("masuk dengan email + sandi", () => {
  test("sandi salah ditolak dan tetap di halaman masuk", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(DEMO_EMAIL)
    await page.getByLabel("Sandi").fill("sandi-bukan-ini")
    await page.getByRole("button", { name: "Masuk" }).click()

    // `p[role=alert]` khusus banner formulir: toast dan pengumuman rute Next.js
    // juga memakai role=alert sehingga getByRole saja akan ambigu.
    await expect(page.locator('p[role="alert"]')).toHaveText("Email atau sandi tidak cocok.", {
      timeout: 30_000,
    })
    expect(page.url()).toContain("/login")
  })

  test("email tanpa akun ditolak dengan pesan yang sama", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(`tidak-ada-${Date.now()}@flexrent.test`)
    await page.getByLabel("Sandi").fill("sandi-coba-123")
    await page.getByRole("button", { name: "Masuk" }).click()
    // Pesan sengaja identik supaya halaman masuk tidak membocorkan email mana
    // yang sudah terdaftar.
    await expect(page.locator('p[role="alert"]')).toHaveText("Email atau sandi tidak cocok.", {
      timeout: 30_000,
    })
  })

  test("sandi benar membuka dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(DEMO_EMAIL)
    await page.getByLabel("Sandi").fill(DEMO_PASSWORD)
    await page.getByRole("button", { name: "Masuk" }).click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 })
    // Sesi harus membawa id user supaya tenant aktif terbaca dari membership.
    await expect(page.getByText(/Bandung Ride/).first()).toBeVisible()
  })

  test("halaman masuk tidak lagi menawarkan tautan email tanpa SMTP", async ({ page }) => {
    await page.goto("/login")
    // Tombol tautan email hanya muncul kalau SMTP_HOST terisi; di mesin tes kosong.
    if (!process.env.SMTP_HOST) {
      await expect(page.getByRole("button", { name: "Kirim tautan masuk" })).toHaveCount(0)
    }
    await expect(page.getByLabel("Sandi")).toBeVisible()
  })

  test("form pendaftaran menolak sandi pendek sebelum mengirim apa pun", async ({ page }) => {
    await page.goto("/login?mode=register")
    await page.getByLabel("Nama Anda").fill("Calon Pemilik")
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@flexrent.test`)
    await page.getByLabel("Sandi").fill("pendek")
    await page.getByRole("button", { name: "Buat akun" }).click()

    await expect(page.locator('p[role="alert"]')).toHaveText("Sandi minimal 8 karakter.")
    expect(page.url()).toContain("/login?mode=register")
  })

  test("tanpa sesi, dashboard diarahkan ke halaman masuk", async ({ browser }) => {
    // Konteks baru tidak mewarisi cookie sesi, jadi ini memeriksa penjaga server.
    const anonim = await browser.newContext()
    const page = await anonim.newPage()
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 })
    await anonim.close()
  })
})
