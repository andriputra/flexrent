import Link from "next/link"
import { Bike } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { auth } from "@/lib/auth"

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const loggedIn = Boolean(session?.user)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bike aria-hidden className="size-4.5" />
            </span>
            Flexrent
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/#fitur" className="text-muted-foreground transition-colors hover:text-foreground">
              Fitur
            </Link>
            <Link href="/#cara-kerja" className="text-muted-foreground transition-colors hover:text-foreground">
              Cara kerja
            </Link>
            <Link href="/harga" className="text-muted-foreground transition-colors hover:text-foreground">
              Harga
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loggedIn ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Buka dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent-hover">
                  <Link href="/login?mode=register">Coba gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card">
        <div className="page-container flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bike aria-hidden className="size-4" />
              </span>
              Flexrent
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Sistem penyewaan motor &amp; mobil untuk usaha rental lokal: armada, pelanggan, pesanan, dan
              pembayaran dalam satu dashboard.
            </p>
          </div>
          <div className="flex gap-10 text-sm">
            <ul className="space-y-2">
              <li className="text-muted-foreground">Produk</li>
              <li>
                <Link href="/harga" className="hover:underline">
                  Harga paket
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:underline">
                  Masuk
                </Link>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="text-muted-foreground">Bantuan</li>
              <li>
                <a href="mailto:halo@flexrent.id" className="hover:underline">
                  halo@flexrent.id
                </a>
              </li>
              <li>
                <Link href="/#cara-kerja" className="hover:underline">
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
  )
}
