"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { BookingStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { CancelBookingDialog } from "@/components/bookings/cancel-booking-dialog"
import { CloseBookingDialog, type ClosingContext } from "@/components/bookings/close-booking-dialog"
import { allowedActions, type StatusAction } from "@/lib/bookings/status"
import { changeBookingStatusAction } from "@/server/actions/bookings"

const BUTTON_LABEL: Record<StatusAction, string> = {
  CONFIRM: "Konfirmasi pesanan",
  START: "Mulai sewa",
  COMPLETE: "Selesaikan sewa",
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

/** Panel aksi staf di halaman detail: status, pembatalan, dan penutupan sewa. */
export function BookingActionBar({
  code,
  status,
  customerName,
  closing,
  readOnly = false,
}: {
  code: string
  status: BookingStatus
  customerName: string
  closing: ClosingContext | null
  readOnly?: boolean
}) {
  const router = useRouter()
  const { ask, dialog } = useConfirmAction()
  const [cancelOpen, setCancelOpen] = useState(false)

  const actions = allowedActions(status)
  if (actions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
        Pesanan ini sudah berstatus final — tidak ada aksi lanjutan.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          if (action === "COMPLETE") {
            return closing ? (
              <CloseBookingDialog key={action} context={closing} readOnly={readOnly} />
            ) : null
          }
          if (action === "CANCEL") {
            return (
              <Button
                key={action}
                variant="destructive"
                size="sm"
                disabled={readOnly}
                onClick={() => setCancelOpen(true)}
              >
                {BUTTON_LABEL[action]}
              </Button>
            )
          }
          return (
            <Button
              key={action}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent-hover"
              disabled={readOnly}
              onClick={() =>
                ask({
                  title: `${BUTTON_LABEL[action]}?`,
                  description: (
                    <>
                      {code} atas nama {customerName}.{" "}
                      {action === "CONFIRM"
                        ? "Setelah dikonfirmasi, checklist serah-terima boleh diisi."
                        : "Kendaraan menjadi Disewa dan checklist pengembalian terbuka."}
                    </>
                  ),
                  confirmLabel: BUTTON_LABEL[action],
                  successMessage: DONE_MESSAGE[action],
                  run: () => changeBookingStatusAction(payloadFor(code, action)),
                  onSuccess: () => router.refresh(),
                })
              }
            >
              {BUTTON_LABEL[action]}
            </Button>
          )
        })}
      </div>

      <CancelBookingDialog open={cancelOpen} onOpenChange={setCancelOpen} code={code} customerName={customerName} />
      {dialog}
    </div>
  )
}
