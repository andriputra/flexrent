"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreditCard, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatRupiah } from "@/lib/format"
import { payInvoiceOnlineAction, recordInvoicePaymentAction } from "@/server/actions/billing"

export type InvoiceTarget = {
  id: string
  number: string
  amount: number
  /** Sisa yang masih harus dibayar, sudah dikurangi uang yang tercatat masuk. */
  remaining: number
  dueLabel: string
}

export function InvoicePayment({
  invoice,
  onlineEnabled,
  canManage,
}: {
  invoice: InvoiceTarget
  onlineEnabled: boolean
  canManage: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("BANK_TRANSFER")
  const [amount, setAmount] = useState(String(invoice.remaining))
  const [refCode, setRefCode] = useState("")
  const [notes, setNotes] = useState("")

  async function payOnline() {
    setPaying(true)
    const result = await payInvoiceOnlineAction(invoice.id)
    if (!result.ok) {
      setPaying(false)
      toast.error(result.error)
      return
    }
    window.location.assign(result.data.redirectUrl)
  }

  async function submitManual(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const payload = new FormData()
    payload.set("invoiceId", invoice.id)
    payload.set("amount", amount)
    payload.set("method", method)
    payload.set("refCode", refCode)
    payload.set("notes", notes)

    const result = await recordInvoicePaymentAction(payload)
    setSaving(false)
    if (!result.ok) {
      toast.error(result.fields ? Object.values(result.fields)[0] : result.error)
      return
    }
    toast.success(
      result.data.becamePaid
        ? `Tagihan ${result.data.number} lunas — langganan aktif lagi.`
        : `${formatRupiah(result.data.paidTotal)} tercatat untuk ${result.data.number}.`
    )
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onlineEnabled ? (
        <Button
          type="button"
          onClick={payOnline}
          disabled={!canManage || paying}
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          <CreditCard aria-hidden />
          {paying ? "Membuka…" : `Bayar ${formatRupiah(invoice.remaining)}`}
        </Button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={!canManage}>
            <Wallet aria-hidden />
            Catat pembayaran
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tagihan {invoice.number}</DialogTitle>
            <DialogDescription>
              Jatuh tempo {invoice.dueLabel}. Sisa bayar {formatRupiah(invoice.remaining)} dari total{" "}
              {formatRupiah(invoice.amount)}. Lunasi lewat transfer lalu catat di sini, atau pilih metode lain.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitManual} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-method">Metode</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as typeof method)} disabled={saving}>
                <SelectTrigger id="invoice-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Transfer bank</SelectItem>
                  <SelectItem value="CASH">Tunai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-amount">Jumlah dibayar</Label>
              <Input
                id="invoice-amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={saving}
                required
              />
              <p className="text-xs text-muted-foreground">Boleh dicicil, asalkan tidak lebih dari sisa tagihan.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-ref">Nomor referensi</Label>
              <Input
                id="invoice-ref"
                value={refCode}
                onChange={(event) => setRefCode(event.target.value)}
                placeholder="mis. 2026-11-22/BCA/009"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-notes">Catatan</Label>
              <Textarea
                id="invoice-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Opsional"
                disabled={saving}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-accent text-accent-foreground hover:bg-accent-hover"
              >
                {saving ? "Menyimpan…" : "Catat pembayaran"}
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
                Tutup
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
