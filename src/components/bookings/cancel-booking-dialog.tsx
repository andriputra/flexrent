"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { changeBookingStatusAction } from "@/server/actions/bookings"

/** Pembatalan selalu lewat dialog ini supaya alasannya tersimpan di riwayat. */
export function CancelBookingDialog({
  open,
  onOpenChange,
  code,
  customerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  code: string
  customerName: string
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    const payload = new FormData()
    payload.set("code", code)
    payload.set("action", "CANCEL")
    payload.set("reason", reason.trim())

    setSaving(true)
    const result = await changeBookingStatusAction(payload)
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`${result.data.code} dibatalkan.`)
    setReason("")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batalkan booking {code}</DialogTitle>
          <DialogDescription>
            Pesanan atas nama {customerName} dibatalkan dan kendaraannya kembali tersedia. Pembayaran yang sudah
            masuk tidak otomatis dikembalikan — catat pengembaliannya di halaman Pembayaran.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor={`cancel-${code}`} className="text-sm font-medium">
            Alasan pembatalan
          </label>
          <Textarea
            id={`cancel-${code}`}
            rows={3}
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
            placeholder="mis. Pelanggan membatalkan sendiri lewat WhatsApp"
          />
          <p className="text-xs text-muted-foreground">Boleh kosong, maksimal 200 karakter.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Kembali
          </Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? "Membatalkan…" : "Ya, batalkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
