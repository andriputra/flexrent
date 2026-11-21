"use client"

import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/format"
import { signOutAction } from "@/server/actions/auth"
import { setActiveTenantAction } from "@/server/actions/tenant"
import type { MembershipRole } from "@prisma/client"

const ROLE_LABEL: Record<MembershipRole, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  STAFF: "Staf",
}

export type MembershipOption = { tenantId: string; tenantName: string; slug: string }

export function ProfileMenu({
  name,
  email,
  image,
  role,
  tenantId,
  memberships,
}: {
  name: string | null
  email: string | null
  image: string | null
  role: MembershipRole
  tenantId: string
  memberships: MembershipOption[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label="Menu profil">
          <Avatar className="size-7">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {initials(name || email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
            {name || email || "Akun"}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block truncate text-sm font-medium">{name || "Pengguna Flexrent"}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {email ?? "tanpa email"} · {ROLE_LABEL[role]}
          </span>
        </DropdownMenuLabel>

        {memberships.length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Pindah rental</DropdownMenuLabel>
            {memberships.map((membership) => (
              <DropdownMenuItem
                key={membership.tenantId}
                disabled={membership.tenantId === tenantId}
                onSelect={() => {
                  void setActiveTenantAction(membership.tenantId)
                }}
              >
                {membership.tenantName}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

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
  )
}
