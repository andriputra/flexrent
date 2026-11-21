import type { APIRequestContext, Page } from "@playwright/test"
import { expect } from "@playwright/test"

/** Kunci hari "YYYY-MM-DD" dalam WIB, mengikuti cara aplikasi menghitung tanggal sewa. */
export function dayKey(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Tenant diambil dari sitemap, bukan dari seed yang dihafal: kalau data contoh
 * berubah, tes tetap mencari rental aktif sendiri dan gagal dengan pesan yang jelas.
 */
export async function tenantSlugFromSitemap(request: APIRequestContext): Promise<string> {
  const response = await request.get("/sitemap.xml")
  if (!response.ok()) throw new Error(`sitemap.xml menjawab ${response.status()}`)

  const paths = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  const slug = paths.map((p) => p.slice(1)).find((p) => p && !p.includes("/") && p !== "harga")
  if (!slug) throw new Error("sitemap tidak memuat tenant aktif — jalankan `npm run db:seed` lebih dulu")
  return slug
}

/** Katalog bertanggal → detail kendaraan → wizard langkah 1. */
export async function openWizard(page: Page, slug: string, ambil: string, kembali: string) {
  await page.goto(`/${slug}?ambil=${ambil}&kembali=${kembali}`)
  await page.getByRole("link", { name: "Pesan" }).first().click()
  await page.getByRole("link", { name: "Lanjut isi data penyewaan" }).click()
  // Rute wizard bisa dikompilasi saat sentuhan pertama, jadi jangan pakai timeout default.
  await expect(page).toHaveURL(/\/pesan\//, { timeout: 90_000 })
}
