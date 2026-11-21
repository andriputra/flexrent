import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Halaman milik akun & endpoint tidak boleh masuk indeks mesin pencari.
        disallow: ["/dashboard", "/api", "/login", "/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
