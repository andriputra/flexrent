"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, ChevronsLeft, ChevronsRight, LayoutDashboard, ListChecks, Package, ShieldCheck, Store, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Semua tenant", icon: Store },
  { href: "/admin/users", label: "Akun rental", icon: Users },
  { href: "/admin/plans", label: "Paket langganan", icon: Package },
  { href: "/admin/audit", label: "Audit log", icon: ListChecks },
] as const

const STORAGE_KEY = "flexrent:platform-sidebar:collapsed"

function activeItem(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href)
}

export function PlatformSidebar({ userName }: { userName: string | null }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1")
  }, [])

  function toggle() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      return next
    })
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-ink text-ink-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-72"
      )}
      aria-label="Navigasi platform"
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-white/10 px-4", collapsed && "justify-center px-2")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[0_10px_22px_-12px_var(--accent)]">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Flexrent Platform</span>
            <span className="block truncate text-xs text-ink-muted">{userName ?? "Super-admin"}</span>
          </span>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = activeItem(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active ? "bg-accent text-accent-foreground" : "text-ink-muted hover:bg-white/10 hover:text-ink-foreground"
              )}
            >
              <Icon aria-hidden className="size-[18px] shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-white/10 hover:text-ink-foreground">
            <Activity aria-hidden className="size-4" />
            Dashboard rental
          </Link>
        ) : null}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={toggle}
          className={cn("text-ink-muted hover:bg-white/10 hover:text-ink-foreground", !collapsed && "w-full justify-start")}
          aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
        >
          {collapsed ? <ChevronsRight aria-hidden /> : <ChevronsLeft aria-hidden />}
          {!collapsed ? <span>Ciutkan</span> : null}
        </Button>
      </div>
    </aside>
  )
}
