"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { AlertTriangle, ImagePlus, Star, Trash2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatRupiah } from "@/lib/format"
import { MAX_VEHICLE_PHOTOS } from "@/lib/validators/vehicle"
import { saveVehicleAction } from "@/server/actions/vehicles"
import type { ActionResult } from "@/lib/result"
import { cn } from "@/lib/utils"
import type { VehiclePhoto } from "@prisma/client"

export type VehicleFormValues = {
  plate: string
  brand: string
  model: string
  year: string
  color: string
  type: "MOTOR" | "MOBIL"
  transmission: "MANUAL" | "MATIC"
  fuelType: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC"
  engineCc: string
  seats: string
  hasDriver: boolean
  driverFee: string
  priceDaily: string
  priceWeekly: string
  priceMonthly: string
  deposit: string
  odometer: string
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE" | "INACTIVE"
  description: string
  isPublished: boolean
}

const DEFAULT_VALUES: VehicleFormValues = {
  plate: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  type: "MOTOR",
  transmission: "MATIC",
  fuelType: "PETROL",
  engineCc: "",
  seats: "",
  hasDriver: false,
  driverFee: "",
  priceDaily: "",
  priceWeekly: "",
  priceMonthly: "",
  deposit: "",
  odometer: "",
  status: "AVAILABLE",
  description: "",
  isPublished: true,
}

type PendingPhoto = { id: string; file: File; preview: string }

function moneyHint(value: string): string | null {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isSafeInteger(parsed) ? formatRupiah(parsed) : null
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

export function VehicleForm({
  vehicleId,
  initialValues,
  initialPhotos = [],
  readOnly = false,
  limitNotice,
}: {
  vehicleId?: string
  initialValues?: Partial<VehicleFormValues>
  initialPhotos?: VehiclePhoto[]
  readOnly?: boolean
  limitNotice?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [limitWarning, setLimitWarning] = useState<string | null>(limitNotice ?? null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    defaultValues: useMemo(() => ({ ...DEFAULT_VALUES, ...initialValues }), [initialValues]),
    mode: "onBlur",
  })

  const type = watch("type")
  const hasDriver = watch("hasDriver")
  const priceDaily = watch("priceDaily")
  const priceWeekly = watch("priceWeekly")
  const priceMonthly = watch("priceMonthly")
  const deposit = watch("deposit")

  const isMotor = type === "MOTOR"

  // Kolom kondisional: field yang tidak relevan dibersihkan agar tidak ikut tersimpan.
  useEffect(() => {
    if (isMotor) {
      setValue("seats", "")
      setValue("hasDriver", false)
      setValue("driverFee", "")
    } else {
      setValue("engineCc", "")
    }
  }, [isMotor, setValue])

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const room = MAX_VEHICLE_PHOTOS - (initialPhotos.length + pendingPhotos.length)
    if (room <= 0) {
      toast.error(`Maksimal ${MAX_VEHICLE_PHOTOS} foto per kendaraan.`)
      return
    }
    const accepted = Array.from(files)
      .slice(0, room)
      .map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
      }))
    if (files.length > room) {
      toast.warning(`Hanya ${room} foto tambahan yang diambil (batas ${MAX_VEHICLE_PHOTOS}).`)
    }
    setPendingPhotos((current) => [...current, ...accepted])
  }

  function dropPendingPhoto(id: string) {
    setPendingPhotos((current) => {
      const target = current.find((photo) => photo.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((photo) => photo.id !== id)
    })
  }

  function applyServerErrors(result: Exclude<ActionResult<unknown>, { ok: true }>) {
    for (const [name, message] of Object.entries(result.fields ?? {})) {
      setError(name as keyof VehicleFormValues, { message })
    }
  }

  const onSubmit = handleSubmit((values) => {
    if (readOnly) return
    const formData = new FormData()
    if (vehicleId) formData.set("id", vehicleId)
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, typeof value === "boolean" ? String(value) : String(value ?? ""))
    }
    for (const photo of pendingPhotos) formData.append("photos", photo.file)

    startTransition(async () => {
      const result = await saveVehicleAction(formData)
      if (result.ok) {
        toast.success(vehicleId ? "Perubahan kendaraan disimpan." : "Kendaraan berhasil ditambahkan.")
        router.push("/dashboard/vehicles")
        router.refresh()
        return
      }
      if (result.code === "PLAN_LIMIT") setLimitWarning(result.error)
      toast.error(result.error)
      applyServerErrors(result)
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {limitWarning ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">{limitWarning}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/harga">Lihat pilihan paket</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Jenis & identitas</CardTitle>
          <CardDescription>Satu armada bisa berisi motor dan mobil; bedakan sejak awal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="type" label="Jenis kendaraan" error={errors.type?.message}>
              <Select
                value={type}
                onValueChange={(value) => setValue("type", value as VehicleFormValues["type"], { shouldDirty: true })}
                disabled={readOnly}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MOTOR">Motor</SelectItem>
                  <SelectItem value="MOBIL">Mobil</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              htmlFor="plate"
              label="Plat nomor"
              hint="Contoh: D 1234 ABC"
              error={errors.plate?.message}
            >
              <Input
                id="plate"
                placeholder="D 1234 ABC"
                aria-invalid={Boolean(errors.plate)}
                readOnly={readOnly}
                {...register("plate", { required: "Plat nomor wajib diisi" })}
              />
            </Field>

            <Field htmlFor="brand" label="Merek" error={errors.brand?.message}>
              <Input
                id="brand"
                placeholder="Honda"
                aria-invalid={Boolean(errors.brand)}
                readOnly={readOnly}
                {...register("brand", { required: "Merek wajib diisi" })}
              />
            </Field>

            <Field htmlFor="model" label="Model" error={errors.model?.message}>
              <Input
                id="model"
                placeholder="Beat ESP"
                aria-invalid={Boolean(errors.model)}
                readOnly={readOnly}
                {...register("model", { required: "Model wajib diisi" })}
              />
            </Field>

            <Field htmlFor="year" label="Tahun produksi" error={errors.year?.message}>
              <Input
                id="year"
                inputMode="numeric"
                placeholder="2023"
                aria-invalid={Boolean(errors.year)}
                readOnly={readOnly}
                {...register("year", {
                  required: "Tahun produksi wajib diisi",
                  pattern: { value: /^\d{4}$/, message: "Gunakan 4 digit tahun" },
                })}
              />
            </Field>

            <Field htmlFor="color" label="Warna" error={errors.color?.message}>
              <Input id="color" placeholder="Hitam" readOnly={readOnly} {...register("color")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Spesifikasi</CardTitle>
          <CardDescription>
            {isMotor
              ? "Untuk motor: transmisi, isi silinder (CC), dan bahan bakar."
              : "Untuk mobil: transmisi, jumlah kursi, bahan bakar, dan layanan sopir."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field htmlFor="transmission" label="Transmisi" error={errors.transmission?.message}>
              <Select
                value={watch("transmission")}
                onValueChange={(value) =>
                  setValue("transmission", value as VehicleFormValues["transmission"])
                }
                disabled={readOnly}
              >
                <SelectTrigger id="transmission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MATIC">Matic</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field htmlFor="fuelType" label="Bahan bakar" error={errors.fuelType?.message}>
              <Select
                value={watch("fuelType")}
                onValueChange={(value) => setValue("fuelType", value as VehicleFormValues["fuelType"])}
                disabled={readOnly}
              >
                <SelectTrigger id="fuelType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PETROL">Bensin</SelectItem>
                  <SelectItem value="DIESEL">Diesel</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                  <SelectItem value="ELECTRIC">Listrik</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {isMotor ? (
              <Field htmlFor="engineCc" label="Isi silinder (CC)" error={errors.engineCc?.message}>
                <Input
                  id="engineCc"
                  inputMode="numeric"
                  placeholder="110"
                  aria-invalid={Boolean(errors.engineCc)}
                  readOnly={readOnly}
                  {...register("engineCc", { required: "Isi silinder wajib untuk motor" })}
                />
              </Field>
            ) : (
              <Field htmlFor="seats" label="Jumlah kursi" error={errors.seats?.message}>
                <Input
                  id="seats"
                  inputMode="numeric"
                  placeholder="5"
                  aria-invalid={Boolean(errors.seats)}
                  readOnly={readOnly}
                  {...register("seats", { required: "Jumlah kursi wajib untuk mobil" })}
                />
              </Field>
            )}

            {!isMotor ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 sm:col-span-3">
                <div className="space-y-0.5">
                  <Label htmlFor="hasDriver">Sediakan layanan sopir</Label>
                  <p className="text-xs text-muted-foreground">
                    Pelanggan dapat menambahkan sopir saat memesan (khusus mobil).
                  </p>
                </div>
                <Switch
                  id="hasDriver"
                  checked={hasDriver}
                  disabled={readOnly}
                  onCheckedChange={(checked) => setValue("hasDriver", checked)}
                />
              </div>
            ) : null}

            {!isMotor && hasDriver ? (
              <Field
                htmlFor="driverFee"
                label="Tarif sopir per hari"
                hint={moneyHint(watch("driverFee")) ?? "Contoh: 150.000"}
                error={errors.driverFee?.message}
              >
                <Input
                  id="driverFee"
                  inputMode="numeric"
                  placeholder="150.000"
                  aria-invalid={Boolean(errors.driverFee)}
                  readOnly={readOnly}
                  {...register("driverFee", { required: "Isi tarif sopir" })}
                />
              </Field>
            ) : null}

            <Field htmlFor="odometer" label="Odometer saat ini (km)" error={errors.odometer?.message}>
              <Input
                id="odometer"
                inputMode="numeric"
                placeholder="12500"
                readOnly={readOnly}
                {...register("odometer")}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Tarif & deposit</CardTitle>
          <CardDescription>
            Sistem menghitung kombinasi termurah (harian / mingguan / bulanan) otomatis saat pelanggan
            memesan. Kosongkan tarif mingguan atau bulanan bila tidak dipakai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              htmlFor="priceDaily"
              label="Tarif harian"
              hint={moneyHint(priceDaily) ?? "Contoh: 150.000"}
              error={errors.priceDaily?.message}
            >
              <Input
                id="priceDaily"
                inputMode="numeric"
                placeholder="150000"
                aria-invalid={Boolean(errors.priceDaily)}
                readOnly={readOnly}
                {...register("priceDaily", {
                  required: "Tarif harian wajib diisi",
                  pattern: { value: /^\d{4,}$/, message: "Minimal 4 digit angka rupiah" },
                })}
              />
            </Field>

            <Field
              htmlFor="priceWeekly"
              label="Tarif mingguan"
              hint={moneyHint(priceWeekly) ?? "Opsional"}
              error={errors.priceWeekly?.message}
            >
              <Input
                id="priceWeekly"
                inputMode="numeric"
                placeholder="900000"
                readOnly={readOnly}
                {...register("priceWeekly")}
              />
            </Field>

            <Field
              htmlFor="priceMonthly"
              label="Tarif bulanan"
              hint={moneyHint(priceMonthly) ?? "Opsional"}
              error={errors.priceMonthly?.message}
            >
              <Input
                id="priceMonthly"
                inputMode="numeric"
                placeholder="3500000"
                readOnly={readOnly}
                {...register("priceMonthly")}
              />
            </Field>

            <Field
              htmlFor="deposit"
              label="Deposit"
              hint={moneyHint(deposit) ?? "Kosongkan bila tanpa deposit"}
              error={errors.deposit?.message}
            >
              <Input id="deposit" inputMode="numeric" placeholder="200000" readOnly={readOnly} {...register("deposit")} />
            </Field>
          </div>

          {priceDaily && priceWeekly && Number(priceWeekly.replace(/\D/g, "")) < Number(priceDaily.replace(/\D/g, "")) * 7 ? (
            <p className="text-xs text-warning">
              Tarif mingguan lebih murah dari 7 hari harian — pelanggan akan selalu memilih mingguan.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="status" label="Status armada" error={errors.status?.message}>
              <Select
                value={watch("status")}
                onValueChange={(value) => setValue("status", value as VehicleFormValues["status"])}
                disabled={readOnly}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                  <SelectItem value="RENTED">Disewa</SelectItem>
                  <SelectItem value="MAINTENANCE">Perawatan</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="isPublished">Tayang di halaman publik</Label>
                <p className="text-xs text-muted-foreground">
                  Matikan bila kendaraan hanya untuk pemakaian internal.
                </p>
              </div>
              <Switch
                id="isPublished"
                checked={watch("isPublished")}
                disabled={readOnly}
                onCheckedChange={(checked) => setValue("isPublished", checked)}
              />
            </div>
          </div>

          <Field
            htmlFor="description"
            label="Deskripsi singkat"
            hint="Muncul di kartu kendaraan pada halaman publik."
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              placeholder="Motor harian irit, cocok untuk keliling kota. Helm ganda tersedia."
              readOnly={readOnly}
              {...register("description")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Foto kendaraan</CardTitle>
          <CardDescription>
            Maksimal {MAX_VEHICLE_PHOTOS} foto, rasio 4:3 disarankan. Urutan dan foto utama diatur dari
            halaman detail setelah kendaraan tersimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialPhotos.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {initialPhotos.map((photo) => (
                <li
                  key={photo.id}
                  className="relative size-28 overflow-hidden rounded-xl border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" loading="lazy" className="size-full object-cover" />
                  {photo.isPrimary ? (
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
                      <Star aria-hidden className="size-3" />
                      Utama
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="flex flex-wrap gap-3">
            {pendingPhotos.map((photo) => (
              <li
                key={photo.id}
                className="relative size-28 overflow-hidden rounded-xl border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt="" className="size-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  onClick={() => dropPendingPhoto(photo.id)}
                  className="absolute right-1 top-1"
                  aria-label="Hapus foto yang baru dipilih"
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>

          {!readOnly ? (
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addFiles(event.target.files)
                  event.target.value = ""
                }}
              />
              <Label
                htmlFor="photos"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "cursor-pointer")}
              >
                <ImagePlus aria-hidden />
                Pilih foto
              </Label>
              <p className="text-sm text-muted-foreground">
                {initialPhotos.length + pendingPhotos.length} dari {MAX_VEHICLE_PHOTOS} foto
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          Dashboard sedang dalam mode baca karena langganan belum aktif. Simpan perubahan dinonaktifkan.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/vehicles")}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-accent text-accent-foreground hover:bg-accent-hover"
          >
            {pending ? "Menyimpan…" : vehicleId ? "Simpan perubahan" : "Simpan kendaraan"}
          </Button>
        </div>
      )}
    </form>
  )
}
