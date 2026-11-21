"use client"

import { usePathname } from "next/navigation"
import { Gauge } from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { ProfileMenu, type MembershipOption } from "./profile-menu"
import { isActiveItem, NAV_ITEMS } from "./nav-config"
import type { MembershipRole } from "@prisma/client"

export function DashboardTopBar(props: {
  tenantName: string
  tenantId: string
  memberships: MembershipOption[]
  user: { name: string | null; email: string | null; image: string | null }
  role: MembershipRole
}) {
  const pathname = usePathname()
  const active = NAV_ITEMS.find((item) => isActiveItem(pathname, item))
  const title = active?.label ?? "Dashboard"

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
            <Gauge aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-5 font-semibold">{title}</p>
            <p className="truncate text-xs leading-4 text-muted-foreground">{props.tenantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <ProfileMenu
            name={props.user.name}
            email={props.user.email}
            image={props.user.image}
            role={props.role}
            tenantId={props.tenantId}
            memberships={props.memberships}
          />
        </div>
      </div>
    </header>
  )
}
