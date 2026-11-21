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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { setCustomerBlacklistAction } from "@/server/actions/customers"

/**
 * Satu dialog untuk dua arah: memasukkan dan mengeluarkan pelanggan dari daftar hitam.
 * Alasan wajib saat memblokir supaya keputusan bisa dibaca staf lain.
 */
export function BlacklistDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  blacklisted,
  reason,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  customerName: string
  blacklisted: boolean
  reason?: string | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(reason ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const payload = new FormData()
    payload.set("id", customerId)
    payload.set("isBlacklisted", blacklisted ? "false" : "true")
    payload.set("reason", draft.trim())

    setError(null)
    setSaving(true)
    const result = await setCustomerBlacklistAction(payload)
    setSaving(false)

    if (!result.ok) {
      const pesan = result.fields?.reason ?? result.error
      setError(pesan)
      toast.error(pesan)
      return
    }
    toast.success(
      result.data.isBlacklisted
        ? `${customerName} masuk daftar hitam — pesanan baru diblokir.`
        : `Daftar hitam ${customerName} dicabut.`
    )
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{blacklisted ? "Cabut daftar hitam" : "Masukkan ke daftar hitam"}</DialogTitle>
          <DialogDescription>
            {blacklisted
              ? `${customerName} boleh memesan lagi lewat halaman publik.`
              : `${customerName} tidak bisa membuat pesanan baru sampai daftar hitamnya dicabut. Pesanan yang sudah berjalan tidak berubah.`}
          </DialogDescription>
        </DialogHeader>

        {blacklisted ? null : (
          <div className="space-y-1.5">
            <Label htmlFor={`blacklist-${customerId}`}>Alasan</Label>
            <Textarea
              id={`blacklist-${customerId}`}
              rows={3}
              value={draft}
              maxLength={200}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="mis. Kendaraan tidak kembali tepat waktu dua kali"
              className={error ? "border-danger" : undefined}
            />
            {error ? (
              <p className="text-xs font-medium text-danger" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Wajib diisi, maksimal 200 karakter.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button
            variant={blacklisted ? "secondary" : "destructive"}
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Menyimpan…" : blacklisted ? "Cabut blokir" : "Blokir pelanggan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
