import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/shared/providers"
import { SITE_URL } from "@/lib/seo"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Flexrent — Kelola rental motor & mobil dalam satu tempat",
    template: "%s · Flexrent",
  },
  description:
    "SaaS booking dan manajemen armada untuk usaha penyewaan motor dan mobil di Indonesia. Kelola kendaraan, pelanggan, dan pembayaran tanpa spreadsheet.",
  metadataBase: new URL(SITE_URL),
  openGraph: { type: "website", siteName: "Flexrent", locale: "id_ID" },
  twitter: { card: "summary_large_image" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={plusJakarta.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
