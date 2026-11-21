import { expect, test } from "@playwright/test"
import { dayKey, openWizard, tenantSlugFromSitemap } from "./support"

// Jendela jauh ke depan supaya tidak bentrok dengan booking contoh, dan diacak
// per jalan supaya pesanan PENDING buatan tes sebelumnya tidak menghalangi lagi.
const mulai = 30 + Math.floor(Math.random() * 150)
const ambil = dayKey(mulai)
const kembali = dayKey(mulai + 2)

test("penyewa publik menyelesaikan wizard sampai mendapat kode booking", async ({ page, request }) => {
  const slug = await tenantSlugFromSitemap(request)
  await openWizard(page, slug, ambil, kembali)
  const wizardTerbit = Date.now()

  // Langkah 1 sudah terisi dari parameter tanggal pada tautan katalog.
  await expect(page.getByLabel("Tanggal ambil")).toHaveValue(ambil)
  await page.getByRole("button", { name: "Lanjut" }).click()

  // Langkah 2: data diri, tanpa unggah dokumen (boleh menyusul saat serah terima).
  const nama = `E2E Penyewa ${ambil}`
  await page.getByLabel("Nama lengkap").fill(nama)
  await page.getByLabel("Nomor WhatsApp aktif").fill(`0812${String(Date.now()).slice(-8)}`)
  await page.getByRole("button", { name: "Lanjut" }).click()

  // Langkah 3: rincian biaya hasil kalkulasi server.
  await expect(page.getByRole("heading", { name: "Rincian biaya" })).toBeVisible()
  await page.getByRole("button", { name: "Lanjut" }).click()

  // Langkah 4: ringkasan lalu persetujuan syarat.
  await expect(page.getByRole("heading", { name: "Periksa pesanan" })).toBeVisible()
  await page.getByLabel(/Saya menyetujui syarat sewa/).check()

  // Tiket form baru dianggap sah 5 detik setelah halaman terbit, jadi jeda ini
  // mewakili pembacaan ringkasan oleh manusia sebelum kirim.
  await page.waitForTimeout(Math.max(0, 7_000 - (Date.now() - wizardTerbit)))

  await page.getByRole("button", { name: "Pesan sekarang" }).click()

  await expect(page).toHaveURL(/\/booking\/BR-\d{4}-\d{4}\?phone=/, { timeout: 30_000 })
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/BR-\d{4}-\d{4}/)
  await expect(page.getByText("Pesanan menunggu konfirmasi staf")).toBeVisible()
  await expect(page.getByText("Menunggu konfirmasi", { exact: true })).toBeVisible()
  // Halaman status dibuka hanya dengan kode, jadi identitas penyewa tidak boleh tampil.
  await expect(page.getByText(nama)).toHaveCount(0)
})

test("langkah data diri menolak nama dan nomor yang belum sah", async ({ page, request }) => {
  const slug = await tenantSlugFromSitemap(request)
  await openWizard(page, slug, ambil, kembali)

  await page.getByRole("button", { name: "Lanjut" }).click()
  await page.getByLabel("Nama lengkap").fill("E")
  await page.getByLabel("Nomor WhatsApp aktif").fill("12345")
  await page.getByRole("button", { name: "Lanjut" }).click()

  await expect(page.getByRole("alert").filter({ hasText: "Nama lengkap minimal 2 karakter" })).toBeVisible()
  await expect(page.getByRole("alert").filter({ hasText: "Nomor WhatsApp tidak valid" })).toBeVisible()
  await expect(page).toHaveURL(/\/pesan\//)
})

test("kirim lewat jebakan bot ditolak tanpa membuat pesanan", async ({ page, request }) => {
  const slug = await tenantSlugFromSitemap(request)
  await openWizard(page, slug, ambil, kembali)

  await page.getByRole("button", { name: "Lanjut" }).click()
  await page.getByLabel("Nama lengkap").fill("E2E Bot")
  await page.getByLabel("Nomor WhatsApp aktif").fill(`0812${String(Date.now()).slice(-8)}`)
  await page.getByRole("button", { name: "Lanjut" }).click()
  await page.getByRole("button", { name: "Lanjut" }).click()
  await page.getByLabel(/Saya menyetujui syarat sewa/).check()

  // Bot pengisi otomatis menulis di semua input, termasuk yang tersembunyi.
  // Setter asal prototype dipakai supaya React ikut mengubah state-nya.
  await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>('input[name="company"]')
    if (!field) throw new Error('jebakan input[name="company"] tidak ada di form')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    setter?.call(field, "promo@spam.test")
    field.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await page.getByRole("button", { name: "Pesan sekarang" }).click()

  await expect(page.getByText("Pesanan tidak dapat diproses")).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/pesan\//)
})
