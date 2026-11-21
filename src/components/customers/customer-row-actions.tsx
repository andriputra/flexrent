"use client"

import { useState } from "react"
import Link from "next/link"
import { Ban, Eye, MoreHorizontal, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BlacklistDialog } from "@/components/customers/blacklist-dialog"

/** Tombol blokir/cabut blokir untuk halaman detail pelanggan. */
export function BlacklistButton({
  customer,
  readOnly = false,
  canManage = true,
}: {
  customer: { id: string; name: string; isBlacklisted: boolean; blacklistReason: string | null }
  readOnly?: boolean
  canManage?: boolean
}) {
  const [open, setOpen] = useState(false)

  // Aksi daftar hitam ditolak server untuk STAFF, jadi kendali tidak ditampilkan.
  if (!canManage) return null

  return (
    <>
      <Button
        variant={customer.isBlacklisted ? "outline" : "destructive"}
        size="sm"
        disabled={readOnly}
        onClick={() => setOpen(true)}
      >
        {customer.isBlacklisted ? <UserCheck aria-hidden /> : <Ban aria-hidden />}
        {customer.isBlacklisted ? "Cabut daftar hitam" : "Masukkan daftar hitam"}
      </Button>
      <BlacklistDialog
        open={open}
        onOpenChange={setOpen}
        customerId={customer.id}
        customerName={customer.name}
        blacklisted={customer.isBlacklisted}
        reason={customer.blacklistReason}
      />
    </>
  )
}

/** Menu baris daftar pelanggan: buka profil dan blokir/cabut blokir. */
export function CustomerRowActions({
  customer,
  readOnly = false,
  canManage = true,
}: {
  customer: { id: string; name: string; isBlacklisted: boolean; blacklistReason: string | null }
  readOnly?: boolean
  canManage?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (readOnly) return null

  if (!canManage) {
    return (
      <Button asChild size="icon-xs" variant="ghost" aria-label={`Buka profil ${customer.name}`}>
        <Link href={`/dashboard/customers/${customer.id}`}>
          <Eye />
        </Link>
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" aria-label={`Aksi untuk ${customer.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/customers/${customer.id}`}>
              <Eye aria-hidden />
              Buka profil &amp; riwayat
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={customer.isBlacklisted ? "default" : "destructive"}
            onSelect={() => setOpen(true)}
          >
            {customer.isBlacklisted ? <UserCheck aria-hidden /> : <Ban aria-hidden />}
            {customer.isBlacklisted ? "Cabut daftar hitam" : "Masukkan daftar hitam"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BlacklistDialog
        open={open}
        onOpenChange={setOpen}
        customerId={customer.id}
        customerName={customer.name}
        blacklisted={customer.isBlacklisted}
        reason={customer.blacklistReason}
      />
    </>
  )
}
