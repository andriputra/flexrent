"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { ImagePlus, Star, Trash2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { RatingPicker } from "@/components/testimonials/rating"
import { toDayKey } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { shrinkDoc } from "@/lib/shrink-doc"
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL, perFileBudget } from "@/lib/upload-limits"
import {
  TESTIMONIAL_MESSAGE_MAX,
  TESTIMONIAL_MESSAGE_MIN,
  testimonialInput,
} from "@/lib/validators/testimonial"
import { saveTestimonialAction } from "@/server/actions/testimonials"

export type TestimonialFormValue = {
  id: string
  author: string
  rating: number
  message: string
  vehicleId: string | null
  occurredDay: string
  photoUrl: string | null
  isPublished: boolean
}

function Field({
  htmlFor,
  label,
  hint,
  error,
  className,
  children,
}: {
  htmlFor?: string
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

/**
 * Formulir testimoni untuk staf. `initial` null berarti ulasan baru; saat mengubah
 * ulasan pengunjung, nama dan tanggal ikut bisa dibetulkan supaya salah ketik
 * masih bisa diperbaiki, bukan dibuang.
 */
export function TestimonialForm({
  vehicles,
  initial,
  readOnly = false,
  onDone,
}: {
  vehicles: { id: string; label: string }[]
  initial?: TestimonialFormValue | null
  readOnly?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? "ALL")
  const [occurredDay, setOccurredDay] = useState(initial?.occurredDay ?? toDayKey(new Date()))
  const [published, setPublished] = useState(initial?.isPublished ?? true)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)

  function showPreview(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{ author: string; message: string }>({
    defaultValues: { author: initial?.author ?? "", message: initial?.message ?? "" },
  })

  const message = watch("message") ?? ""
  const shownAvatar = preview ?? initial?.photoUrl ?? null

  async function pickAvatar(file: File) {
    // Dikecilkan di browser: foto galeri HP jarang muat utuh lewat Server Action.
    const prepared = await shrinkDoc(file, perFileBudget(1))
    if (prepared.size > MAX_IMAGE_BYTES) {
      toast.error(`Foto avatar maksimal ${MAX_IMAGE_LABEL} setelah dikompresi.`)
      return
    }
    showPreview(URL.createObjectURL(prepared))
    setAvatar(prepared)
    setRemovePhoto(false)
  }

  const onSubmit = handleSubmit((values) => {
    if (readOnly) return
    setServerError(null)

    // Cerminan validasi server memakai skema yang sama, jadi pesan salah
    // muncul tanpa perjalanan bolak-balik ke server.
    const checked = testimonialInput.safeParse({
      id: initial?.id ?? "",
      vehicleId,
      author: values.author,
      rating,
      message: values.message,
      occurredDay,
      published,
    })
    if (!checked.success) {
      const pesan = checked.error.issues[0]?.message ?? "Data belum valid."
      setServerError(pesan)
      toast.error(pesan)
      return
    }

    const payload = new FormData()
    if (initial?.id) payload.set("id", initial.id)
    payload.set("vehicleId", vehicleId)
    payload.set("author", values.author)
    payload.set("rating", String(rating))
    payload.set("message", values.message)
    payload.set("occurredDay", occurredDay)
    payload.set("published", published ? "1" : "0")
    if (avatar) payload.set("photo", avatar, avatar.name)
    if (removePhoto) payload.set("removePhoto", "1")

    startTransition(async () => {
      const result = await saveTestimonialAction(payload)
      if (!result.ok) {
        const pesan = result.fields ? Object.values(result.fields)[0] : result.error
        setServerError(pesan ?? "Data belum valid.")
        toast.error(pesan ?? "Data belum valid.")
        return
      }
      toast.success(initial ? "Testimoni diperbarui." : "Testimoni tersimpan.")
      router.refresh()
      onDone?.()
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {serverError ? (
        <p
          className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {serverError}
        </p>
      ) : null}

      <Field label="Rating">
        <RatingPicker value={rating} onChange={setRating} disabled={pending || readOnly} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="author" label="Nama pengulas" error={errors.author?.message}>
          <Input
            id="author"
            placeholder="Nama yang tampil di halaman publik"
            className={cn(errors.author && "border-danger")}
            aria-invalid={Boolean(errors.author)}
            {...register("author", {
              required: "Nama pengulas wajib diisi",
              minLength: { value: 2, message: "Nama minimal 2 karakter" },
              maxLength: { value: 60, message: "Nama maksimal 60 karakter" },
            })}
          />
        </Field>
        <Field htmlFor="occurredDay" label="Tanggal ulasan">
          <Input
            id="occurredDay"
            type="date"
            value={occurredDay}
            disabled={pending || readOnly}
            onChange={(event) => setOccurredDay(event.target.value)}
          />
        </Field>
      </div>

      <Field
        htmlFor="vehicleId"
        label="Kendaraan terkait"
        hint="Pilih kendaraan bila ulasan menyebut armada tertentu; penandanya tampil di kartu ulasan."
      >
        <Select value={vehicleId} onValueChange={setVehicleId} disabled={pending || readOnly}>
          <SelectTrigger id="vehicleId" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tanpa kendaraan</SelectItem>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        htmlFor="message"
        label="Isi ulasan"
        error={errors.message?.message}
        hint={`${message.length}/${TESTIMONIAL_MESSAGE_MAX} karakter`}
      >
        <Textarea
          id="message"
          rows={4}
          placeholder="Cerita singkat pelanggan tentang pelayanan atau kendaraannya."
          className={cn(errors.message && "border-danger")}
          aria-invalid={Boolean(errors.message)}
          {...register("message", {
            required: "Isi ulasan wajib diisi",
            minLength: {
              value: TESTIMONIAL_MESSAGE_MIN,
              message: `Ulasan minimal ${TESTIMONIAL_MESSAGE_MIN} karakter`,
            },
            maxLength: {
              value: TESTIMONIAL_MESSAGE_MAX,
              message: `Ulasan maksimal ${TESTIMONIAL_MESSAGE_MAX} karakter`,
            },
          })}
        />
      </Field>

      <Field
        htmlFor="photo"
        label="Foto pengulas"
        hint={`Opsional. JPG, PNG, atau WebP maksimal ${MAX_IMAGE_LABEL}.`}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {shownAvatar ? (
              <img src={shownAvatar} alt="" className="size-full object-cover" />
            ) : (
              <Star aria-hidden className="size-5 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pending || readOnly}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void pickAvatar(file)
                event.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || readOnly}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus aria-hidden />
              {shownAvatar ? "Ganti foto" : "Pilih foto"}
            </Button>
            {shownAvatar ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending || readOnly}
                onClick={() => {
                  showPreview(null)
                  setAvatar(null)
                  setRemovePhoto(Boolean(initial?.photoUrl))
                }}
              >
                <Trash2 aria-hidden />
                Hapus foto
              </Button>
            ) : null}
          </div>
        </div>
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          <Label htmlFor="published" className="cursor-pointer">
            Tampilkan di halaman publik
          </Label>
          <p className="text-xs text-muted-foreground">
            Mati menyembunyikan ulasan; ulasan pengunjung yang belum ditinjau tetap di antrean.
          </p>
        </div>
        <Switch
          id="published"
          checked={published}
          disabled={pending || readOnly}
          onCheckedChange={setPublished}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending || readOnly}
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          {pending ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan testimoni"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onDone?.()}>
          Tutup
        </Button>
      </div>
    </form>
  )
}
