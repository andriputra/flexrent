"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOutAction } from "@/server/actions/auth"
import { isActiveItem, NAV_GROUPS, NAV_ITEMS } from "./nav-config"
import { cn } from "@/lib/utils"

const PINNED_COUNT = 3

export function DashboardBottomNav({ publicUrl }: { publicUrl: string }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.slice(0, PINNED_COUNT)
  const pinnedHrefs = new Set(items.map((item) => item.href))
  const moreGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => !pinnedHrefs.has(item.href)),
  })).filter((group) => group.items.length > 0)
  const moreItems = moreGroups.flatMap((group) => group.items)
  const moreActive = moreItems.some((item) => isActiveItem(pathname, item)) || items.every((item) => !isActiveItem(pathname, item))

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/90 lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active = isActiveItem(pathname, item)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2.5 text-[0.7rem] font-medium transition-colors",
                  active ? "text-accent" : "text-sidebar-foreground hover:text-white"
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          )
        })}
        <li className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-[0.7rem] font-medium text-sidebar-foreground transition-colors hover:text-white",
                moreActive && "text-accent"
              )}
              aria-label="Menu lainnya"
            >
              <MoreHorizontal aria-hidden className="size-5" />
              Lainnya
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="max-h-[70dvh] w-56 overflow-y-auto">
              {moreGroups.map((group) => (
                <DropdownMenuGroup key={group.label}>
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href}>
                          <Icon aria-hidden />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
              ))}
              <DropdownMenuItem asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Halaman publik
                </a>
              </DropdownMenuItem>
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
        </li>
      </ul>
    </nav>
  )
}
