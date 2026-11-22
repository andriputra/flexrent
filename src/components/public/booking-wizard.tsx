"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react"
import { Stepper } from "@/components/shared/stepper"
import { SectionHeading } from "@/components/shared/layout-parts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useVehicleQuote } from "@/components/public/use-vehicle-quote"
import { addDays, fromWib, rentalDays, toDayKey } from "@/lib/datetime"
import { formatRupiah, normalizePhone } from "@/lib/format"
import { MAX_RENTAL_DAYS } from "@/lib/validators/booking"
import { createBookingAction } from "@/server/actions/booking"
import type { ActionResult } from "@/lib/result"

const STEPS = [
  { title: "Pilih tanggal", description: "Durasi, sopir, antar-jemput" },
  { title: "Data diri & dokumen", description: "Nama, WhatsApp, KTP/SIM" },
  { title: "Pembayaran", description: "Rincian biaya & deposit" },
  { title: "Konfirmasi", description: "Periksa lalu kirim" },
]

const MAX_DOC_BYTES = 5 * 1024 * 1024
const DOC_HINT = "JPG, PNG, WebP, atau PDF maksimal 5 MB"

type Values = {
  startDay: string
  startTime: string
  returnDay: string
  returnTime: string
  name: string
  phone: string
  email: string
  idNumber: string
  deliveryMode: "SELF_PICKUP" | "DELIVERY"
  deliveryArea: string
  deliveryAddress: string
  withDriver: boolean
  notes: string
  agree: boolean
}

type Docs = { ktp: File | null; sim: File | null }

export function BookingWizard({
  slug,
  tenantName,
  vehicle,
  terms,
  ticket,
  initial,
}: {
  slug: string
  tenantName: string
  vehicle: { id: string; name: string; plate: string; hasDriver: boolean }
  terms: string[]
  ticket: string
  initial: { ambil: string; kembali: string; jamAmbil: string; jamKembali: string; sopir: boolean }
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>({
    startDay: initial.ambil || toDayKey(new Date()),
    startTime: initial.jamAmbil || "09:00",
    returnDay: initial.kembali || toDayKey(addDays(new Date(), 1)),
    returnTime: initial.jamKembali || "09:00",
    name: "",
    phone: "",
    email: "",
    idNumber: "",
    deliveryMode: "SELF_PICKUP",
    deliveryArea: "",
    deliveryAddress: "",
    withDriver: initial.sopir && vehicle.hasDriver,
    notes: "",
    agree: false,
  })
  const [docs, setDocs] = useState<Docs>({ ktp: null, sim: null })
  const [honeypot, setHoneypot] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const quote = useVehicleQuote({
    slug,
    vehicleId: vehicle.id,
    startDay: values.startDay,
    startTime: values.startTime,
    returnDay: values.returnDay,
    returnTime: values.returnTime,
    withDriver: values.withDriver,
  })

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {}
    const today = toDayKey(new Date())
    if (step === 0) {
      if (values.startDay < today) found.startDay = "Tanggal ambil tidak boleh sebelum hari ini"
      if (values.returnDay <= values.startDay) found.returnDay = "Tanggal kembali harus setelah tanggal ambil"
      else if (rentalDays(fromWib(values.startDay, values.startTime), fromWib(values.returnDay, values.returnTime)) > MAX_RENTAL_DAYS) {
        found.returnDay = `Durasi maksimal ${MAX_RENTAL_DAYS} hari. Hubungi WhatsApp untuk sewa lebih lama.`
      }
      if (values.deliveryMode === "DELIVERY" && values.deliveryAddress.trim().length < 8) {
        found.deliveryAddress = "Isi alamat antar-jemput lebih lengkap (minimal 8 karakter)"
      }
    }
    if (step === 1) {
      if (values.name.trim().length < 2) found.name = "Nama lengkap minimal 2 karakter"
      const phone = normalizePhone(values.phone)
      if (!/^0\d{8,13}$/.test(phone)) found.phone = "Nomor WhatsApp tidak valid, contoh 081234567890"
    }
    if (step === 3 && !values.agree) found.agree = "Setujui syarat sewa untuk melanjutkan"
    return found
  }

  function goNext() {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function submit() {
    const found = validate()
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }
    setErrors({})

    const formData = new FormData()
    formData.set("slug", slug)
    formData.set("vehicleId", vehicle.id)
    formData.set("startDay", values.startDay)
    formData.set("startTime", values.startTime)
    formData.set("returnDay", values.returnDay)
    formData.set("returnTime", values.returnTime)
    formData.set("name", values.name.trim())
    formData.set("phone", values.phone.trim())
    formData.set("email", values.email.trim())
    formData.set("idNumber", values.idNumber.trim())
    formData.set("deliveryMode", values.deliveryMode)
    formData.set("deliveryArea", values.deliveryArea.trim())
    formData.set("deliveryAddress", values.deliveryAddress.trim())
    formData.set("withDriver", values.withDriver ? "true" : "false")
    formData.set("notes", values.notes.trim())
    formData.set("agree", "true")
    formData.set("ticket", ticket)
    formData.set("company", honeypot)
    if (docs.ktp) formData.set("ktp", docs.ktp)
    if (docs.sim) formData.set("sim", docs.sim)

    start(async () => {
      const result: ActionResult<{ code: string; phone: string }> = await createBookingAction(formData)
      if (result.ok) {
        router.push(`/${slug}/booking/${result.data.code}?phone=${encodeURIComponent(result.data.phone)}`)
        return
      }
      // Bentrok tanggal: kembalikan pemakai ke langkah tanggal supaya bisa diubah.
      const fieldKeys = Object.keys(result.fields ?? {})
      setErrors(result.fields ?? {})
      if (result.code === "CONFLICT" || fieldKeys.includes("startDay") || fieldKeys.includes("returnDay")) {
        setStep(0)
      }
      toast.error(result.error)
    })
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-pop sm:p-6">
      <Stepper steps={STEPS} current={step} />

      {errors.startDay || errors.returnDay ? (
        <p
          role="alert"
          className="anim-fade mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {errors.startDay ?? errors.returnDay}
        </p>
      ) : null}

      {/* Kunci pada langkah supaya animasi masuk diputar ulang tiap ganti langkah. */}
      <div key={step} className="anim-rise mt-4 sm:mt-5">
        {step === 0 ? <DateStep values={values} set={set} errors={errors} hasDriver={vehicle.hasDriver} /> : null}
        {step === 1 ? <IdentityStep values={values} set={set} docs={docs} setDocs={setDocs} errors={errors} /> : null}
        {step === 2 ? <PaymentStep quote={quote} values={values} tenantName={tenantName} /> : null}
        {step === 3 ? (
          <ConfirmStep values={values} quote={quote} docs={docs} tenantName={tenantName} terms={terms} set={set} errors={errors} />
        ) : null}
      </div>

      {/* Jebakan bot: manusia tidak pernah melihat atau mengisi input ini. */}
      <input
        name="company"
        aria-hidden
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        className="hidden"
      />

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="h-10 rounded-full px-4 transition-transform duration-300 hover:-translate-x-0.5 motion-reduce:transition-none"
        >
          <ChevronLeft aria-hidden />
          Sebelumnya
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={goNext}
            className="h-10 rounded-full bg-primary px-5 text-[0.9rem] font-semibold text-primary-foreground shadow-[0_16px_32px_-18px_var(--primary)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Lanjut
            <ChevronRight aria-hidden data-icon="inline-end" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={pending}
            className="h-10 rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
            Pesan sekarang
          </Button>
        )}
      </div>
    </div>
  )
}

function Segmented({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string
  icon?: ReactNode
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex w-full gap-1 rounded-full border border-border/70 bg-muted/50 p-1"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? "flex-1 rounded-full bg-primary px-2 py-1.5 text-[0.82rem] font-medium text-primary-foreground shadow-[0_8px_18px_-10px_var(--primary)] transition-colors duration-200 sm:px-3 sm:text-sm"
                : "flex-1 rounded-full px-2 py-1.5 text-[0.82rem] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground sm:px-3 sm:text-sm"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

function DateStep({
  values,
  set,
  errors,
  hasDriver,
}: {
  values: Values
  set: <K extends keyof Values>(key: K, value: Values[K]) => void
  errors: Record<string, string>
  hasDriver: boolean
}) {
  const today = toDayKey(new Date())
  const days = rentalDays(fromWib(values.startDay, values.startTime), fromWib(values.returnDay, values.returnTime))

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="start-day" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays aria-hidden className="size-3.5" />
            Tanggal ambil
          </Label>
          <Input id="start-day" type="date" min={today} value={values.startDay} onChange={(e) => set("startDay", e.target.value)} />
          <FieldError message={errors.startDay} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start-time" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock aria-hidden className="size-3.5" />
            Jam ambil
          </Label>
          <Input id="start-time" type="time" value={values.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="return-day" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays aria-hidden className="size-3.5" />
            Tanggal kembali
          </Label>
          <Input
            id="return-day"
            type="date"
            min={values.startDay || today}
            value={values.returnDay}
            onChange={(e) => set("returnDay", e.target.value)}
          />
          <FieldError message={errors.returnDay} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="return-time" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock aria-hidden className="size-3.5" />
            Jam kembali
          </Label>
          <Input id="return-time" type="time" value={values.returnTime} onChange={(e) => set("returnTime", e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/12 px-2.5 py-1 text-xs font-semibold tabular-nums">
          <CalendarDays aria-hidden className="size-3.5" />
          {days} hari
        </span>
        <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
          Durasi dihitung otomatis dari tanggal dan jam ambil sampai tanggal dan jam kembali.
        </p>
      </div>

      {hasDriver ? (
        <Segmented
          label="Layanan sopir"
          icon={<UserRound aria-hidden className="size-3.5" />}
          value={values.withDriver ? "ya" : "tidak"}
          options={[
            { value: "tidak", label: "Tanpa sopir" },
            { value: "ya", label: "Dengan sopir" },
          ]}
          onChange={(value) => set("withDriver", value === "ya")}
        />
      ) : null}

      <Segmented
        label="Cara pengambilan"
        icon={<MapPin aria-hidden className="size-3.5" />}
        value={values.deliveryMode}
        options={[
          { value: "SELF_PICKUP", label: "Ambil di kantor" },
          { value: "DELIVERY", label: "Antar-jemput" },
        ]}
        onChange={(value) => set("deliveryMode", value as Values["deliveryMode"])}
      />

      {values.deliveryMode === "DELIVERY" ? (
        <div className="anim-rise space-y-3 rounded-xl border border-border/60 bg-muted/25 p-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="delivery-area" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin aria-hidden className="size-3.5" />
              Area antar (opsional)
            </Label>
            <Input
              id="delivery-area"
              value={values.deliveryArea}
              onChange={(e) => set("deliveryArea", e.target.value)}
              placeholder="mis. Dago, Bandung"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delivery-address">Alamat tujuan</Label>
            <Textarea
              id="delivery-address"
              rows={3}
              value={values.deliveryAddress}
              onChange={(e) => set("deliveryAddress", e.target.value)}
              placeholder="Nama jalan, nomor, kelurahan, kota, patokan"
            />
            <FieldError message={errors.deliveryAddress} />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Biaya antar-jemput dikonfirmasi staf lewat WhatsApp sebelum kendaraan berangkat.
          </p>
        </div>
      ) : null}
    </section>
  )
}

function DocInput({
  id,
  label,
  file,
  onSelect,
  error,
}: {
  id: "ktp" | "sim"
  label: string
  file: File | null
  onSelect: (file: File | null) => void
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText aria-hidden className="size-3.5" />
        {label}
      </Label>
      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-success/30 bg-success/8 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-success shadow-card">
              <Check aria-hidden className="size-4" />
            </span>
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {Math.round(file.size / 1024)} KB
            </span>
          </span>
          <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${label}`} onClick={() => onSelect(null)}>
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-border px-3 py-3.5 text-sm text-muted-foreground transition-colors duration-300 hover:border-accent/50 hover:bg-muted/40 hover:text-foreground motion-reduce:transition-none"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <Upload aria-hidden className="size-4" />
          </span>
          {DOC_HINT}
        </label>
      )}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null
          if (next && next.size > MAX_DOC_BYTES) {
            toast.error(`${label} maksimal 5 MB`)
            event.target.value = ""
            onSelect(null)
            return
          }
          onSelect(next)
        }}
      />
      <FieldError message={error} />
    </div>
  )
}

function IdentityStep({
  values,
  set,
  docs,
  setDocs,
  errors,
}: {
  values: Values
  set: <K extends keyof Values>(key: K, value: Values[K]) => void
  docs: Docs
  setDocs: (docs: Docs) => void
  errors: Record<string, string>
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <UserRound aria-hidden className="size-3.5" />
            Nama lengkap
          </Label>
          <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageCircle aria-hidden className="size-3.5" />
            Nomor WhatsApp aktif
          </Label>
          <Input
            id="phone"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="081234567890"
            autoComplete="tel"
          />
          <FieldError message={errors.phone} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Mail aria-hidden className="size-3.5" />
            Email (opsional)
          </Label>
          <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
          <FieldError message={errors.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="idNumber" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CreditCard aria-hidden className="size-3.5" />
            Nomor KTP (opsional)
          </Label>
          <Input
            id="idNumber"
            inputMode="numeric"
            value={values.idNumber}
            onChange={(e) => set("idNumber", e.target.value.replace(/[^\d]/g, "").slice(0, 16))}
            placeholder="16 digit"
          />
          <FieldError message={errors.idNumber} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DocInput id="ktp" label="Foto KTP" file={docs.ktp} error={errors.ktp} onSelect={(file) => setDocs({ ...docs, ktp: file })} />
        <DocInput
          id="sim"
          label="Foto SIM"
          file={docs.sim}
          error={errors.sim}
          onSelect={(file) => setDocs({ ...docs, sim: file })}
        />
      </div>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Dokumen boleh diunggah nanti saat serah terima. File disimpan di ruang privat dan hanya dibuka staf rental
        lewat tautan singkat.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Catatan untuk staf</Label>
        <Textarea
          id="notes"
          rows={3}
          maxLength={300}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="mis. mohon siapkan helm dua"
        />
        <FieldError message={errors.notes} />
      </div>
    </section>
  )
}

function QuoteLines({ quote }: { quote: ReturnType<typeof useVehicleQuote> }) {
  if (quote.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        {quote.error}
      </p>
    )
  }
  if (!quote.quote) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden className={`size-4 ${quote.computing ? "animate-spin" : ""}`} />
        Menghitung harga…
      </p>
    )
  }
  const data = quote.quote
  return (
    <ul className="space-y-1 text-sm">
      <li className="flex justify-between gap-3">
        <span className="text-muted-foreground">Sewa {data.rental.scheme}</span>
        <span className="tabular-nums">{formatRupiah(data.rentalAmount)}</span>
      </li>
      {data.driverAmount ? (
        <li className="flex justify-between gap-3">
          <span className="text-muted-foreground">Sopir ({data.days} hari)</span>
          <span className="tabular-nums">{formatRupiah(data.driverAmount)}</span>
        </li>
      ) : null}
      <li className="flex justify-between gap-3">
        <span className="text-muted-foreground">Deposit (kembali setelah kendaraan lunas)</span>
        <span className="tabular-nums">{formatRupiah(data.depositAmount)}</span>
      </li>
      <li className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-border/60 pt-2.5 font-semibold">
        <span>Total bayar</span>
        <span className="text-[1.15rem] leading-6 tabular-nums">{formatRupiah(data.totalAmount)}</span>
      </li>
    </ul>
  )
}

function PaymentStep({
  quote,
  values,
  tenantName,
}: {
  quote: ReturnType<typeof useVehicleQuote>
  values: Values
  tenantName: string
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/25 p-3.5 sm:p-4">
        <SectionHeading icon={<Receipt aria-hidden />}>Rincian biaya</SectionHeading>
        <QuoteLines quote={quote} />
      </div>

      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3.5 text-sm sm:p-4">
        <SectionHeading icon={<CreditCard aria-hidden />} className="mb-1">
          Cara pembayaran
        </SectionHeading>
        <p className="text-muted-foreground">
          Setelah pesanan dikirim, staf {tenantName} menghubungi nomor WhatsApp Anda untuk konfirmasi stok dan
          memberitahu rekening atau QRIS pembayaran. Pesanan berstatus menunggu pembayaran selama 2 jam.
        </p>
        <p className="text-muted-foreground">
          Pembayaran online lewat Midtrans tersedia segera — saat ini pesanan dibayar tunai atau transfer ke
          rental.
        </p>
        {values.deliveryMode === "DELIVERY" ? (
          <p className="text-muted-foreground">
            Biaya antar-jemput dihitung terpisah oleh staf dan diinformasikan sebelum kendaraan berangkat.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function ConfirmStep({
  values,
  quote,
  docs,
  tenantName,
  terms,
  set,
  errors,
}: {
  values: Values
  quote: ReturnType<typeof useVehicleQuote>
  docs: Docs
  tenantName: string
  terms: string[]
  set: <K extends keyof Values>(key: K, value: Values[K]) => void
  errors: Record<string, string>
}) {
  const rows = [
    { label: "Tanggal ambil", value: `${values.startDay} ${values.startTime}` },
    { label: "Tanggal kembali", value: `${values.returnDay} ${values.returnTime}` },
    { label: "Nama", value: values.name },
    { label: "WhatsApp", value: values.phone },
    ...(values.email ? [{ label: "Email", value: values.email }] : []),
    ...(values.idNumber ? [{ label: "Nomor KTP", value: "disimpan" }] : []),
    { label: "Sopir", value: values.withDriver ? "Dengan sopir" : "Tanpa sopir" },
    {
      label: "Pengambilan",
      value: values.deliveryMode === "DELIVERY" ? `Antar-jemput: ${values.deliveryAddress || values.deliveryArea}` : "Ambil di kantor",
    },
    { label: "Dokumen", value: [docs.ktp && "KTP", docs.sim && "SIM"].filter(Boolean).join(", ") || "belum diunggah" },
    ...(values.notes ? [{ label: "Catatan", value: values.notes }] : []),
  ]

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/25 p-3.5 sm:p-4">
        <SectionHeading icon={<ClipboardCheck aria-hidden />}>Periksa pesanan</SectionHeading>
        <dl className="divide-y divide-border/50">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 py-2 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[60%] text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 border-t border-border/50 pt-3">
          <QuoteLines quote={quote} />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/25 p-3.5 sm:p-4">
        <SectionHeading icon={<ShieldCheck aria-hidden />}>Syarat sewa {tenantName}</SectionHeading>
        <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          {terms.map((term) => (
            <li key={term} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{term}</span>
            </li>
          ))}
        </ul>
        <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3 text-sm transition-colors duration-300 hover:border-accent/40 motion-reduce:transition-none">
          <input
            type="checkbox"
            checked={values.agree}
            onChange={(event) => set("agree", event.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-[var(--accent)]"
          />
          <span>Saya menyetujui syarat sewa di atas dan data yang saya isi benar.</span>
        </label>
        <FieldError message={errors.agree} />
      </div>
    </section>
  )
}
