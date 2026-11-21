"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { setCancelAtPeriodEndAction } from "@/server/actions/billing"

/**
 * Penghentian dijadwalkan, tidak langsung: periode yang sudah dibayar tetap
 * bisa dipakai sampai habis dan cron tidak menagih lagi sesudahnya.
 */
export function CancelSchedule({
  cancelAtPeriodEnd,
  endsLabel,
  canManage,
}: {
  cancelAtPeriodEnd: boolean
  endsLabel: string
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function setCancel(cancel: boolean) {
    setPending(true)
    const result = await setCancelAtPeriodEndAction(cancel)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      result.data.cancelAtPeriodEnd
        ? `Langganan berhenti setelah ${endsLabel}.`
        : "Penghentian dibatalkan, langganan berlanjut otomatis."
    )
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {cancelAtPeriodEnd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canManage || pending}
          onClick={() => setCancel(false)}
        >
          {pending ? "Memperbarui…" : "Lanjutkan langganan"}
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={!canManage || pending} onClick={() => setCancel(true)}>
          {pending ? "Memperbarui…" : "Berhenti di akhir periode"}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        {cancelAtPeriodEnd
          ? `Sudah dijadwalkan berhenti setelah ${endsLabel}; tagihan berikutnya tidak terbit.`
          : "Sampai akhir periode ini tidak ada tagihan baru."}
      </p>
    </div>
  )
}
