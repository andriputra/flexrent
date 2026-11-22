"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bike } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"

const NAV = [
  { href: "/#fitur", label: "Fitur" },
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/harga", label: "Harga" },
]

export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-[height,background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "h-14 border-border/70 bg-background/85 shadow-[0_10px_30px_-24px_var(--primary)]"
          : "h-16 border-transparent bg-background/55"
      )}
    >
      <div className="page-container flex h-full items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_22px_-12px_var(--primary)] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105">
            <Bike aria-hidden className="size-5" />
          </span>
          Flexrent
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-7 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loggedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Buka dashboard</Link>
            </Button>
          ) : (
            <>
              {/* Di layar sempit cukup satu pintu: tautan Masuk ada di halaman /login. */}
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Masuk</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="h-8 rounded-full bg-accent px-3.5 text-accent-foreground shadow-[0_10px_22px_-12px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                <Link href="/login?mode=register">Coba gratis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
