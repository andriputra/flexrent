"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftRight, CloudUpload, ImagePlus, Loader2, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { MAX_VEHICLE_PHOTOS } from "@/lib/validators/vehicle"
import { shrinkDoc } from "@/lib/shrink-doc"
import { formatBytes, perFileBudget } from "@/lib/upload-limits"
import {
  deleteVehiclePhotoAction,
  saveVehiclePhotoLayoutAction,
  uploadVehiclePhotosAction,
} from "@/server/actions/vehicles"

export type ManagedPhoto = { id: string; url: string; isPrimary: boolean }

type ProgressRow = { name: string; from: number; to: number }

/**
 * Dua tahap, bukan satu angka yang dibohongi: kompresi bisa diukur per berkas,
 * sedangkan Server Action tidak melaporkan berapa byte yang sudah sampai.
 */
type Progress = { stage: "kompresi" | "kirim"; done: number; total: number; rows: ProgressRow[] }

export function VehiclePhotoManager({
  vehicleId,
  photos: initialPhotos,
  readOnly = false,
}: {
  vehicleId: string
  photos: ManagedPhoto[]
  readOnly?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [photos, setPhotos] = useState(initialPhotos)
  const [syncedPhotos, setSyncedPhotos] = useState(initialPhotos)
  const [progress, setProgress] = useState<Progress | null>(null)
  const { ask, dialog } = useConfirmAction()

  // Foto hasil unggah datang lewat props saat router.refresh() selesai. Tanpa
  // penyesuaian ini, useState menahan nilai awal dan panel tetap "0 dari 6 foto".
  if (initialPhotos !== syncedPhotos) {
    setSyncedPhotos(initialPhotos)
    setPhotos(initialPhotos)
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
    after?: () => void
  ) {
    startTransition(async () => {
      try {
        const result = await action()
        if (result.ok) {
          toast.success(message)
          router.refresh()
        } else {
          toast.error(result.error ?? "Gagal menyimpan perubahan.")
        }
      } finally {
        after?.()
      }
    })
  }

  function persist(next: ManagedPhoto[], primaryId?: string) {
    const formData = new FormData()
    formData.set("vehicleId", vehicleId)
    formData.set("order", next.map((photo) => photo.id).join(","))
    formData.set("primaryPhotoId", primaryId ?? next.find((photo) => photo.isPrimary)?.id ?? "")
    setPhotos(next)
    run(() => saveVehiclePhotoLayoutAction(formData), "Susunan foto diperbarui.")
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= photos.length) return
    const next = [...photos]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    void persist(next)
  }

  function markPrimary(photoId: string) {
    void persist(
      photos.map((photo) => ({ ...photo, isPrimary: photo.id === photoId })),
      photoId
    )
  }

  async function addFiles(selected: File[]) {
    if (selected.length === 0) return
    const room = MAX_VEHICLE_PHOTOS - photos.length
    if (room <= 0) {
      toast.error(`Maksimal ${MAX_VEHICLE_PHOTOS} foto per kendaraan.`)
      return
    }
    const chosen = selected.slice(0, room)
    if (selected.length > room) toast.warning(`Hanya ${room} foto pertama yang diunggah.`)
    // Dikecilkan di browser: enam foto kamera langsung menembus plafon body
    // Server Action dan korbannya halaman error tanpa penjelasan.
    // Satu per satu, bukan paralel, supaya baris progres menyebut berkas yang
    // sedang dikerjakan alih-alih melompat tanpa urutan.
    const budget = perFileBudget(chosen.length)
    const prepared: File[] = []
    const rows: ProgressRow[] = []
    setProgress({ stage: "kompresi", done: 0, total: chosen.length, rows: [] })
    for (const file of chosen) {
      const shrunk = await shrinkDoc(file, budget)
      prepared.push(shrunk)
      rows.push({ name: file.name, from: file.size, to: shrunk.size })
      setProgress({ stage: "kompresi", done: rows.length, total: chosen.length, rows: [...rows] })
    }

    const formData = new FormData()
    formData.set("vehicleId", vehicleId)
    for (const file of prepared) formData.append("photos", file)
    setProgress({ stage: "kirim", done: 0, total: prepared.length, rows })
    run(
      () => uploadVehiclePhotosAction(formData),
      "Foto berhasil diunggah.",
      () => setProgress(null)
    )
  }

  function remove(photoId: string) {
    const formData = new FormData()
    formData.set("photoId", photoId)
    ask({
      title: "Hapus foto ini?",
      description: "Foto akan dihapus dari penyimpanan dan tidak muncul lagi di halaman publik.",
      confirmLabel: "Hapus foto",
      destructive: true,
      successMessage: "Foto dihapus.",
      run: () => deleteVehiclePhotoAction(formData),
      onSuccess: () => {
        // Baru dibuang dari daftar setelah server mengiyakan: kalau dibuang di
        // depan dan pengguna membatalkan, fotonya hilang tanpa alasan.
        setPhotos((current) => current.filter((photo) => photo.id !== photoId))
        router.refresh()
      },
    })
  }

  if (photos.length === 0 && readOnly) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada foto. Tambahkan foto dari halaman ubah kendaraan.
      </p>
    )
  }

  return (
    // @container: jumlah kolom dihitung dari lebar kartu, bukan lebar jendela.
    // Di panel kanan (sempit) satu kolom tetap muat; di halaman penuh lebar, tiga.
    <div className="@container space-y-4">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2.5 @[15rem]:grid-cols-2 @[36rem]:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card",
                photo.isPrimary && "ring-2 ring-accent"
              )}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Foto ${index + 1}`} loading="lazy" className="size-full object-cover" />
                {!readOnly ? (
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => remove(photo.id)}
                    disabled={pending}
                    aria-label="Hapus foto"
                    title="Hapus foto"
                    className="absolute right-1 top-1 shadow-pop"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <div className="flex flex-wrap items-center justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, -1)}
                    disabled={readOnly || index === 0}
                    aria-label="Geser foto ke depan"
                  >
                    <ArrowLeftRight aria-hidden className="-rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={readOnly || index === photos.length - 1}
                    aria-label="Geser foto ke belakang"
                  >
                    <ArrowLeftRight aria-hidden className="rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => markPrimary(photo.id)}
                    disabled={readOnly || photo.isPrimary}
                    aria-label="Jadikan foto utama"
                    title={photo.isPrimary ? "Foto utama" : "Jadikan foto utama"}
                  >
                    <Star aria-hidden className={photo.isPrimary ? "fill-current text-accent" : ""} />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!readOnly ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="newPhotos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                const field = event.target
                const selected = Array.from(field.files ?? [])
                field.value = ""
                field.disabled = true
                addFiles(selected).finally(() => {
                  field.disabled = false
                })
              }}
            />
            <Label
              htmlFor="newPhotos"
              className={cn(buttonVariantsLink, "cursor-pointer", progress && "pointer-events-none opacity-60")}
            >
              <ImagePlus aria-hidden />
              Tambah foto
            </Label>
            <p className="text-sm text-muted-foreground">
              {photos.length} dari {MAX_VEHICLE_PHOTOS} foto · foto pertama otomatis jadi utama
            </p>
          </div>
          {progress ? <UploadProgress progress={progress} /> : null}
        </div>
      ) : null}
      {dialog}
    </div>
  )
}

const buttonVariantsLink =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"

function UploadProgress({ progress }: { progress: Progress }) {
  const mengirim = progress.stage === "kirim"
  const pct = Math.round((progress.done / Math.max(1, progress.total)) * 100)
  const prepared = progress.rows.reduce((sum, row) => sum + row.to, 0)

  return (
    <div role="status" aria-live="polite" className="anim-fade space-y-2.5 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[0.8rem] font-medium">
          {mengirim ? (
            <CloudUpload aria-hidden className="size-3.5 text-accent" />
          ) : (
            <Loader2 aria-hidden className="size-3.5 animate-spin text-accent" />
          )}
          {mengirim
            ? `Mengunggah ${progress.total} foto ke penyimpanan…`
            : `Mengompresi foto ${progress.done} dari ${progress.total}…`}
        </span>
        <span className="text-[0.72rem] tabular-nums text-muted-foreground">
          {mengirim ? formatBytes(prepared) : `${pct}%`}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {mengirim ? (
          <div className="anim-track h-full rounded-full bg-accent" />
        ) : (
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        )}
      </div>

      {progress.rows.length > 0 ? (
        <ul className="space-y-0.5">
          {progress.rows.map((row, index) => (
            <li
              key={`${index}-${row.name}`}
              className="flex items-baseline justify-between gap-2 text-[0.72rem] text-muted-foreground"
            >
              <span className="truncate">{row.name}</span>
              <span className="shrink-0 tabular-nums">
                <span className="line-through">{formatBytes(row.from)}</span>
                {" → "}
                <span className="text-success">{formatBytes(row.to)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
