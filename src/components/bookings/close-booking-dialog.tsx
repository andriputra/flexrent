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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { depositRefundPlan, suggestLateFee } from "@/lib/payments/fees"
import { formatRupiah, parseRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"
import { recordBookingClosingAction } from "@/server/actions/bookings"

export type ClosingContext = {
  code: string
  customerName: string
  vehicleLabel: string
  /** Hari keterlambatan dihitung server dari kalender WIB. */
  lateDays: number
  lateFeeDaily: number | null
  /** Kekurangan bayar sewa sebelum denda baru. */
  outstandingRent: number
  /** Deposit yang masih dipegang saat ini. */
  depositHeld: number
  damageFee: number
}

function amountOf(value: string): number {
  return parseRupiah(value) ?? 0
}

export function CloseBookingDialog({
  context,
  readOnly = false,
}: {
  context: ClosingContext
  readOnly?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const suggestedLateFee = suggestLateFee(context.lateFeeDaily, context.lateDays)
  const [lateFee, setLateFee] = useState(String(suggestedLateFee || ""))
  const [damageFee, setDamageFee] = useState(String(context.damageFee || ""))
  const [refund, setRefund] = useState("")
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH")
  const [notes, setNotes] = useState("")

  const plan = depositRefundPlan({
    depositHeld: context.depositHeld,
    outstandingRent: context.outstandingRent,
    lateFee: amountOf(lateFee),
    damageFee: amountOf(damageFee),
  })

  async function submit() {
    const payload = new FormData()
    payload.set("code", context.code)
    payload.set("lateFee", lateFee)
    payload.set("damageFee", damageFee)
    payload.set("depositRefund", refund)
    payload.set("method", method)
    payload.set("notes", notes)

    setServerError(null)
    setFields({})
    setSaving(true)
    const result = await recordBookingClosingAction(payload)
    setSaving(false)

    if (!result.ok) {
      setServerError(result.error)
      setFields(result.fields ?? {})
      toast.error(result.error)
      return
    }
    toast.success(
      `${result.data.code} selesai · denda ${formatRupiah(result.data.lateFee + result.data.damageFee)} · deposit kembali ${formatRupiah(result.data.refund)}`
    )
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return
        setOpen(next)
        if (!next) setServerError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent-hover" disabled={readOnly}>
          Selesaikan sewa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selesaikan sewa {context.code}</DialogTitle>
          <DialogDescription>
            {context.customerName} · {context.vehicleLabel}. Hitung denda dan deposit di sini supaya pembukuannya
            langsung tertutup; kendaraan kembali ke status Tersedia.
          </DialogDescription>
        </DialogHeader>

        {serverError ? (
          <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            {serverError}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`late-${context.code}`}>Denda keterlambatan</Label>
              <Input
                id={`late-${context.code}`}
                inputMode="numeric"
                value={lateFee}
                onChange={(event) => setLateFee(event.target.value)}
                placeholder="0"
                className={cn(fields.lateFee ? "border-danger" : undefined)}
              />
              <p className="text-xs text-muted-foreground">
                {context.lateDays > 0
                  ? `${context.lateDays} hari telat${
                      context.lateFeeDaily
                        ? ` × ${formatRupiah(context.lateFeeDaily)} = ${formatRupiah(suggestedLateFee)}`
                        : " · tarif denda kendaraan belum diisi"
                    }`
                  : "Kembali tepat waktu, tidak ada denda."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`damage-${context.code}`}>Biaya kerusakan</Label>
              <Input
                id={`damage-${context.code}`}
                inputMode="numeric"
                value={damageFee}
                onChange={(event) => setDamageFee(event.target.value)}
                placeholder="0"
                className={cn(fields.damageFee ? "border-danger" : undefined)}
              />
              <p className="text-xs text-muted-foreground">Isi dari catatan kerusakan pada checklist.</p>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Perhitungan deposit
            </p>
            <ul className="mt-2 space-y-1 tabular-nums">
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Sewa kurang dibayar</span>
                <span>{formatRupiah(context.outstandingRent)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Deposit dipegang</span>
                <span>{formatRupiah(context.depositHeld)}</span>
              </li>
              <li className="flex justify-between gap-3 font-medium">
                <span>Potongan dari deposit</span>
                <span>{formatRupiah(plan.deduction)}</span>
              </li>
              <li className="flex justify-between gap-3 font-medium">
                <span>Kembali ke pelanggan</span>
                <span className="text-success">{formatRupiah(plan.refund)}</span>
              </li>
            </ul>
            {plan.refund > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setRefund(String(plan.refund))}
              >
                Pakai Rp {plan.refund.toLocaleString("id-ID")}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`refund-${context.code}`}>Deposit dikembalikan</Label>
              <Input
                id={`refund-${context.code}`}
                inputMode="numeric"
                value={refund}
                onChange={(event) => setRefund(event.target.value)}
                placeholder={String(plan.refund)}
                className={cn(fields.depositRefund ? "border-danger" : undefined)}
              />
              <p className="text-xs text-muted-foreground">
                Kosong = tidak dikembalikan. Maksimal {formatRupiah(context.depositHeld)}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`method-${context.code}`}>Metode pengembalian</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
                <SelectTrigger id={`method-${context.code}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Tunai di tempat</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Transfer bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`notes-${context.code}`}>Catatan penutupan</Label>
            <Textarea
              id={`notes-${context.code}`}
              rows={2}
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="mis. Baret di bumper kiri, deposit kembali tunai Rp 200.000"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving || readOnly} className="bg-accent text-accent-foreground hover:bg-accent-hover">
            {saving ? "Menyimpan…" : "Simpan & tutup sewa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
