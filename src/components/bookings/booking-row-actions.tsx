"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { BookingStatus } from "@prisma/client"
import { CheckCircle2, MoreHorizontal, PlayCircle, SquareKanban, XCircle, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { CancelBookingDialog } from "@/components/bookings/cancel-booking-dialog"
import { allowedActions, type StatusAction } from "@/lib/bookings/status"
import { changeBookingStatusAction } from "@/server/actions/bookings"

const ICONS: Record<StatusAction, LucideIcon> = {
  CONFIRM: CheckCircle2,
  START: PlayCircle,
  COMPLETE: SquareKanban,
  CANCEL: XCircle,
}

const MENU_LABEL: Record<StatusAction, string> = {
  CONFIRM: "Konfirmasi pesanan",
  START: "Mulai sewa",
  COMPLETE: "Catat pengembalian",
  CANCEL: "Batalkan pesanan",
}

const DONE_MESSAGE: Record<StatusAction, string> = {
  CONFIRM: "Booking dikonfirmasi.",
  START: "Sewa dimulai — kendaraan berpindah ke status Disewa.",
  COMPLETE: "Pengembalian dicatat.",
  CANCEL: "Pesanan dibatalkan.",
}

function payloadFor(code: string, action: StatusAction): FormData {
  const payload = new FormData()
  payload.set("code", code)
  payload.set("action", action)
  return payload
}

/**
 * Menu aksi per baris daftar booking. Pengembalian dialihkan ke halaman detail
 * karena butuh form denda dan deposit.
 */
export function BookingRowActions({
  code,
  status,
  customerName,
  readOnly = false,
}: {
  code: string
  status: BookingStatus
  customerName: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const { ask, dialog } = useConfirmAction()
  const [cancelOpen, setCancelOpen] = useState(false)

  if (readOnly) return null
  const actions = allowedActions(status)
  if (actions.length === 0) return null

  function renderItem(action: StatusAction) {
    const Icon = ICONS[action]

    // Pengembalian butuh form denda/deposit, pembatalan butuh alasan: keduanya
    // menunggu di halaman detail / dialog.
    if (action === "COMPLETE") {
      return (
        <DropdownMenuItem key={action} asChild>
          <Link href={`/dashboard/bookings/${code}`}>
            <Icon aria-hidden />
            {MENU_LABEL[action]}
          </Link>
        </DropdownMenuItem>
      )
    }
    if (action === "CANCEL") {
      return (
        <DropdownMenuItem key={action} onSelect={() => setCancelOpen(true)}>
          <Icon aria-hidden />
          {MENU_LABEL[action]}
        </DropdownMenuItem>
      )
    }
    return (
      <DropdownMenuItem
        key={action}
        onSelect={() =>
          ask({
            title: `${MENU_LABEL[action]}?`,
            description: (
              <>
                Pesanan <span className="font-semibold">{code}</span> atas nama {customerName}.{" "}
                {action === "CONFIRM"
                  ? "Batas waktu otomatis kedaluwarsanya dihapus."
                  : "Checklist pengembalian baru bisa diisi setelah sewanya berjalan."}
              </>
            ),
            confirmLabel: MENU_LABEL[action],
            successMessage: DONE_MESSAGE[action],
            run: () => changeBookingStatusAction(payloadFor(code, action)),
            onSuccess: () => router.refresh(),
          })
        }
      >
        <Icon aria-hidden />
        {MENU_LABEL[action]}
      </DropdownMenuItem>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" aria-label={`Aksi untuk ${code}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{actions.map(renderItem)}</DropdownMenuContent>
      </DropdownMenu>
      {dialog}
      <CancelBookingDialog open={cancelOpen} onOpenChange={setCancelOpen} code={code} customerName={customerName} />
    </>
  )
}
