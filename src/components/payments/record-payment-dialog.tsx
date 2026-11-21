"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Wallet } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { recordManualPaymentAction } from "@/server/actions/payments"

export type PayableOption = {
  code: string
  label: string
  outstanding: number
  depositOutstanding: number
}

type FormValues = {
  bookingCode: string
  kind: "RENTAL" | "DEPOSIT"
  method: "CASH" | "BANK_TRANSFER"
  amount: string
  refCode: string
  notes: string
}

function Field({
  htmlFor,
  label,
  hint,
  error,
  className,
  children,
}: {
  htmlFor: string
  label: string
  hint?: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function PaymentForm({
  options,
  readOnly,
  onDone,
}: {
  options: PayableOption[]
  readOnly: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      bookingCode: options[0]?.code ?? "",
      kind: options[0] && options[0].outstanding > 0 ? "RENTAL" : "DEPOSIT",
      method: "CASH",
      amount: options[0] ? String(options[0].outstanding || options[0].depositOutstanding) : "",
      refCode: "",
      notes: "",
    },
  })

  const selected = options.find((option) => option.code === watch("bookingCode"))
  const kind = watch("kind")
  const remaining = selected ? (kind === "DEPOSIT" ? selected.depositOutstanding : selected.outstanding) : 0

  function pickBooking(code: string) {
    const option = options.find((item) => item.code === code)
    const nextKind: FormValues["kind"] = option && option.outstanding > 0 ? "RENTAL" : "DEPOSIT"
    setValue("bookingCode", code)
    setValue("kind", nextKind)
    setValue("amount", String(option ? (nextKind === "DEPOSIT" ? option.depositOutstanding : option.outstanding) : ""))
  }

  function pickKind(next: FormValues["kind"]) {
    setValue("kind", next)
    if (selected) setValue("amount", String(next === "DEPOSIT" ? selected.depositOutstanding : selected.outstanding))
  }

  const onSubmit = handleSubmit((values) => {
    setServerError(null)
    const payload = new FormData()
    payload.set("bookingCode", values.bookingCode)
    payload.set("kind", values.kind)
    payload.set("method", values.method)
    payload.set("amount", values.amount)
    payload.set("refCode", values.refCode)
    payload.set("notes", values.notes)

    setSaving(true)
    void (async () => {
      const result = await recordManualPaymentAction(payload)
      setSaving(false)
      if (!result.ok) {
        const pesan = result.fields ? Object.values(result.fields)[0] : result.error
        setServerError(pesan ?? result.error)
        toast.error(pesan ?? result.error)
        return
      }
      toast.success(
        `${formatRupiah(result.data.amount)} tercatat untuk ${result.data.code}${
          result.data.becamePaid ? " · pesanan lunas" : ""
        }`
      )
      router.refresh()
      onDone()
    })()
  })

  if (options.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Semua pesanan sudah lunas. Catatan pembayaran baru muncul setelah ada booking yang belum dibayar.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {serverError ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {serverError}
        </p>
      ) : null}

      <Field htmlFor="bookingCode" label="Kode booking" error={errors.bookingCode?.message}>
        <Controller
          control={control}
          name="bookingCode"
          rules={{ required: "Pilih pesanan" }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={pickBooking} disabled={saving || readOnly}>
              <SelectTrigger id="bookingCode">
                <SelectValue placeholder="Pilih pesanan" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="kind" label="Jenis pembayaran" error={errors.kind?.message}>
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => pickKind(value as FormValues["kind"])}
                disabled={saving || readOnly}
              >
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENTAL">Sewa & denda</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field htmlFor="method" label="Metode" error={errors.method?.message}>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={saving || readOnly}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Tunai</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Transfer bank</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <Field
        htmlFor="amount"
        label="Jumlah dibayar"
        hint={remaining > 0 ? `Sisa ${formatRupiah(remaining)}.` : "Isi nominal yang benar-benar diterima."}
        error={errors.amount?.message}
      >
        <Input
          id="amount"
          inputMode="numeric"
          placeholder="150.000"
          className={errors.amount ? "border-danger" : undefined}
          aria-invalid={Boolean(errors.amount)}
          {...register("amount", { required: "Jumlah wajib diisi" })}
        />
      </Field>

      <Field htmlFor="refCode" label="Nomor referensi" hint="Nomor bukti transfer atau kuitansi, boleh kosong.">
        <Input id="refCode" placeholder="mis. 2026-11-21/BCA/009" {...register("refCode")} />
      </Field>

      <Field htmlFor="notes" label="Catatan" error={errors.notes?.message}>
        <Textarea id="notes" rows={2} placeholder="Opsional" {...register("notes")} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={saving || readOnly}
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          {saving ? "Menyimpan…" : "Catat pembayaran"}
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={onDone}>
          Tutup
        </Button>
      </div>
    </form>
  )
}

export function RecordPaymentDialog({ options, readOnly = false }: { options: PayableOption[]; readOnly?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent-hover" disabled={readOnly}>
          <Wallet aria-hidden />
          Catat pembayaran
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat pembayaran tunai atau transfer</DialogTitle>
          <DialogDescription>
            Nominal dibandingkan ulang dengan sisa tagihan di server. Kalau pesanan menjadi lunas, statusnya berubah
            otomatis dan pelanggan dikabari lewat WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <PaymentForm options={options} readOnly={readOnly} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
