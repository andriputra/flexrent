/** Nama slug unik untuk /{slug} tidak boleh menabrak route aplikasi. */
export const RESERVED_SLUGS = [
  "api",
  "dashboard",
  "login",
  "register",
  "logout",
  "onboarding",
  "harga",
  "terms",
  "privacy",
  "admin",
  "auth",
  "assets",
  "static",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
]

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(value)
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.includes(value.toLowerCase())
}
