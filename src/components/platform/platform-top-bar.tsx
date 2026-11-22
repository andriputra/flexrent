"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { initials } from "@/lib/format"
import { signOutAction } from "@/server/actions/auth"

const NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/tenants", label: "Tenant" },
  { href: "/admin/users", label: "Akun" },
  { href: "/admin/plans", label: "Paket" },
  { href: "/admin/audit", label: "Audit" },
] as const

function titleFor(pathname: string) {
  if (pathname.startsWith("/admin/tenants")) return "Semua tenant"
  if (pathname.startsWith("/admin/users")) return "Akun rental"
  if (pathname.startsWith("/admin/plans")) return "Paket langganan"
  if (pathname.startsWith("/admin/audit")) return "Audit log"
  return "Ringkasan platform"
}

export function PlatformTopBar({ user }: { user: { name: string | null; email: string | null; image: string | null } }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-ink-foreground lg:hidden">
            <ShieldCheck aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-5 font-semibold">{titleFor(pathname)}</p>
            <p className="truncate text-xs leading-4 text-muted-foreground">Control center platform</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" aria-label="Menu profil platform">
                <Avatar className="size-7">
                  {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                  <AvatarFallback className="bg-ink text-ink-foreground">{initials(user.name || user.email)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[160px] truncate text-sm font-medium sm:inline">{user.name || user.email || "Super-admin"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-0.5">
                <span className="block truncate text-sm font-medium">{user.name || "Pengelola platform"}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{user.email ?? "tanpa email"} · Super-admin</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={signOutAction} className="w-full">
                  <button type="submit" className="flex w-full items-center gap-2">
                    <LogOut aria-hidden />
                    Keluar
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Navigasi platform">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
