"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsLeft, ChevronsRight, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isActiveItem, NAV_ITEMS } from "./nav-config"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "flexrent:sidebar:collapsed"

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
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Gauge aria-hidden />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{tenantName}</span>
            <span className="block truncate text-xs text-sidebar-foreground">{tenantCity}</span>
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActiveItem(pathname, item)
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
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon aria-hidden className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
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
