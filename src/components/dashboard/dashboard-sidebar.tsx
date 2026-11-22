"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsLeft, ChevronsRight, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isActiveItem, NAV_GROUPS, type NavItem } from "./nav-config"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "flexrent:sidebar:collapsed"

function NavRow({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const active = isActiveItem(pathname, item)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        collapsed && "justify-center px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-all duration-200",
          active ? "h-6 opacity-100" : "h-0 opacity-0"
        )}
      />
      <Icon aria-hidden className={cn("size-[18px] shrink-0 transition-colors", active && "text-accent")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function DashboardSidebar({
  tenantName,
  tenantCity,
  publicUrl,
}: {
  tenantName: string
  tenantCity: string
  publicUrl: string
}) {
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
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-72"
      )}
      aria-label="Navigasi utama"
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[0_10px_22px_-12px_var(--accent)]">
          <Gauge aria-hidden />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{tenantName}</span>
            <span className="block truncate text-xs text-sidebar-foreground">{tenantCity}</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group, index) => (
          <div
            key={group.label}
            className={cn(
              index > 0 && (collapsed ? "mt-3 border-t border-sidebar-border/70 pt-3" : "mt-5")
            )}
          >
            <p
              className={cn(
                "overflow-hidden px-3 text-[0.68rem] leading-5 font-semibold tracking-[0.14em] text-sidebar-foreground/55 uppercase transition-all duration-200",
                collapsed ? "h-0 opacity-0" : "h-5 pb-1.5 opacity-100"
              )}
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavRow key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        {!collapsed && (
          <Button
            asChild
            variant="outline"
            className="w-full justify-start border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent"
          >
            <a href={publicUrl} target="_blank" rel="noreferrer">
              Lihat halaman publik
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={toggle}
          className={cn("text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", !collapsed && "w-full justify-start")}
          aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
        >
          {collapsed ? <ChevronsRight aria-hidden /> : <ChevronsLeft aria-hidden />}
          {!collapsed && <span>Ciutkan</span>}
        </Button>
      </div>
    </aside>
  )
}
