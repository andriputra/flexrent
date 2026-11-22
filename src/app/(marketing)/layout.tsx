import Link from "next/link"
import { Bike } from "lucide-react"
import { Providers } from "@/components/shared/providers"
import { SiteHeader } from "@/components/marketing/site-header"
import { auth } from "@/lib/auth"

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const loggedIn = Boolean(session?.user)

  return (
    <Providers>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader loggedIn={loggedIn} />

        <main className="flex-1">{children}</main>

        <footer className="border-t bg-card">
          <div className="page-container flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="flex items-center gap-2.5 font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bike aria-hidden className="size-4" />
                </span>
                Flexrent
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Sistem penyewaan motor &amp; mobil untuk usaha rental lokal: armada, pelanggan, pesanan, dan
                pembayaran dalam satu dashboard.
              </p>
            </div>
            <div className="flex gap-12 text-sm">
              <ul className="space-y-2.5">
                <li className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  Produk
                </li>
                <li>
                  <Link href="/harga" className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    Harga paket
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    Masuk
                  </Link>
                </li>
              </ul>
              <ul className="space-y-2.5">
                <li className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  Bantuan
                </li>
                <li>
                  <a href="mailto:halo@flexrent.id" className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    halo@flexrent.id
                  </a>
                </li>
                <li>
                  <Link href="/#cara-kerja" className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    Cara kerja
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t">
            <div className="page-container flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} Flexrent. Dibuat untuk usaha rental di Indonesia.</p>
              <p>
                developed by{" "}
                <a href="https://flexbox.co.id" target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  Flexbox Indonesia
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Providers>
  )
}
