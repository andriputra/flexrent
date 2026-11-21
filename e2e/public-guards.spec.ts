import { expect, test } from "@playwright/test"
import { dayKey, openWizard, tenantSlugFromSitemap } from "./support"

// Keberadaan tenant diperiksa di layout /[slug], jadi slug asing jatuh ke penjaga root.
test("slug tenant asing menjawab 404 lewat penjaga root", async ({ page }) => {
  const response = await page.goto("/rental-bukan-flexrent")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible()
})

test("ID kendaraan asing menjawab 404 lewat penjaga rute tenant", async ({ page, request }) => {
  const slug = await tenantSlugFromSitemap(request)
  const response = await page.goto(`/${slug}/kendaraan/kendaraan-tidak-ada`)
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Halaman rental tidak ditemukan" })).toBeVisible()
})

test("rute di luar tenant menjawab 404 lewat penjaga root", async ({ page }) => {
  const response = await page.goto("/rute-yang-tidak-ada")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible()
})

test("robots dan sitemap hanya membuka halaman publik", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text()
  for (const path of ["/dashboard", "/api", "/login", "/onboarding"]) {
    expect(robots).toContain(`Disallow: ${path}`)
  }

  const sitemap = await (await request.get("/sitemap.xml")).text()
  expect(sitemap).toContain("<urlset")
  expect(sitemap).not.toContain("/dashboard")
  expect(sitemap).not.toContain("/api/")
})

test("halaman pemesanan tidak diindeks dan jebakan bot tidak terlihat", async ({ page, request }) => {
  const slug = await tenantSlugFromSitemap(request)
  await openWizard(page, slug, dayKey(30), dayKey(31))

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  await expect(page.locator('input[name="company"]')).toBeHidden()
})

test("halaman tenant membawa canonical dan kartu open graph", async ({ page, request }) => {
  const slug = await tenantSlugFromSitemap(request)
  await page.goto(`/${slug}`)

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${slug}$`))
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new RegExp(`/${slug}$`))
})
