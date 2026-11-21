"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { fromWib, toDayKey, toTimeKey } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { saveMaintenanceAction } from "@/server/actions/maintenance"

const PERIODE = [
  { menit: 120, label: "2 jam" },
  { menit: 240, label: "4 jam" },
  { menit: 480, label: "8 jam" },
  { menit: 1440, label: "1 hari" },
  { menit: 2880, label: "2 hari" },
  { menit: 4320, label: "3 hari" },
  { menit: 10080, label: "1 minggu" },
]

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

/** Jadwal perawatan: kendaraan, judul, mulai + durasi. Slot ini memblokir pemesanan. */
export function MaintenanceForm({
  vehicles,
  defaultVehicleId,
  readOnly = false,
  onDone,
}: {
  vehicles: { id: string; label: string }[]
  defaultVehicleId?: string
  readOnly?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [startDay, setStartDay] = useState(() => toDayKey(new Date()))
  const [startTime, setStartTime] = useState("08:00")
  const [menit, setMenit] = useState(240)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<{ vehicleId: string; title: string; notes: string }>({
    defaultValues: {
      vehicleId: defaultVehicleId ?? vehicles[0]?.id ?? "",
      title: "",
      notes: "",
    },
  })

  const startsAt = fromWib(startDay, startTime)
  const endsAt = Number.isNaN(startsAt.getTime()) ? null : new Date(startsAt.getTime() + menit * 60_000)

  const onSubmit = handleSubmit((values) => {
    if (readOnly) return
    setServerError(null)
    if (!endsAt) {
      setServerError("Tanggal atau jam mulai belum lengkap.")
      return
    }

    const payload = new FormData()
    payload.set("vehicleId", values.vehicleId)
    payload.set("title", values.title)
    payload.set("notes", values.notes)
    payload.set("startDay", startDay)
    payload.set("startTime", startTime)
    payload.set("endDay", toDayKey(endsAt))
    payload.set("endTime", toTimeKey(endsAt))

    startTransition(async () => {
      const result = await saveMaintenanceAction(payload)
      if (!result.ok) {
        const pesan = result.fields ? Object.values(result.fields)[0] : result.error
        setServerError(pesan ?? "Data belum valid.")
        toast.error(pesan ?? "Data belum valid.")
        return
      }
      toast.success("Jadwal perawatan tersimpan.")
      router.refresh()
      onDone?.()
    })
  })

  if (vehicles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Tambahkan kendaraan dulu sebelum menjadwalkan perawatan.
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

      <Field htmlFor="vehicleId" label="Kendaraan" error={errors.vehicleId?.message}>
        <Controller
          control={control}
          name="vehicleId"
          rules={{ required: "Pilih kendaraan" }}
          render={({ field, fieldState }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={pending || readOnly}
            >
              <SelectTrigger
                id="vehicleId"
                aria-invalid={fieldState.invalid}
              >
                <SelectValue placeholder="Pilih kendaraan" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field htmlFor="title" label="Judul perawatan" error={errors.title?.message}>
        <Input
          id="title"
          placeholder="Ganti oli, servis berkala, ban"
          className={errors.title ? "border-danger" : undefined}
          aria-invalid={Boolean(errors.title)}
          {...register("title", {
            required: "Judul perawatan wajib diisi",
            minLength: { value: 3, message: "Judul minimal 3 karakter" },
            maxLength: { value: 80, message: "Judul maksimal 80 karakter" },
          })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="startDay" label="Tanggal mulai">
          <Input
            id="startDay"
            type="date"
            value={startDay}
            disabled={pending || readOnly}
            onChange={(event) => setStartDay(event.target.value)}
          />
        </Field>
        <Field htmlFor="startTime" label="Jam mulai">
          <Input
            id="startTime"
            type="time"
            step={900}
            value={startTime}
            disabled={pending || readOnly}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </Field>
        <Field htmlFor="periode" label="Perkiraan durasi" className="sm:col-span-2">
          <Select value={String(menit)} onValueChange={(value) => setMenit(Number(value))}>
            <SelectTrigger id="periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODE.map((item) => (
                <SelectItem key={item.menit} value={String(item.menit)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <p className="text-sm text-muted-foreground tabular-nums">
        {endsAt
          ? `Kendaraan terkunci ${toDayKey(startsAt)} ${startTime} sampai ${toDayKey(endsAt)} ${toTimeKey(endsAt)}.`
          : "Isi tanggal dan jam mulai."}
      </p>

      <Field
        htmlFor="notes"
        label="Catatan"
        hint="Nama bengkel, kilometer terakhir, atau temuan kerusakan."
        error={errors.notes?.message}
      >
        <Textarea
          id="notes"
          rows={2}
          placeholder="Opsional"
          {...register("notes", {
            maxLength: { value: 300, message: "Catatan maksimal 300 karakter" },
          })}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending || readOnly}
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          {pending ? "Menyimpan…" : "Simpan jadwal"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onDone?.()}>
          Tutup
        </Button>
      </div>
    </form>
  )
}
