"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeftRight, ImagePlus, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { MAX_VEHICLE_PHOTOS } from "@/lib/validators/vehicle"
import {
  deleteVehiclePhotoAction,
  saveVehiclePhotoLayoutAction,
  uploadVehiclePhotosAction,
} from "@/server/actions/vehicles"

export type ManagedPhoto = { id: string; url: string; isPrimary: boolean }

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
  const { ask, dialog } = useConfirmAction()

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(message)
        router.refresh()
      } else {
        toast.error(result.error ?? "Gagal menyimpan perubahan.")
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

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const room = MAX_VEHICLE_PHOTOS - photos.length
    if (room <= 0) {
      toast.error(`Maksimal ${MAX_VEHICLE_PHOTOS} foto per kendaraan.`)
      return
    }
    const formData = new FormData()
    formData.set("vehicleId", vehicleId)
    for (const file of Array.from(files).slice(0, room)) formData.append("photos", file)
    if (files.length > room) toast.warning(`Hanya ${room} foto pertama yang diunggah.`)
    run(() => uploadVehiclePhotosAction(formData), "Foto berhasil diunggah.")
  }

  function remove(photoId: string) {
    const formData = new FormData()
    formData.set("photoId", photoId)
    setPhotos((current) => current.filter((photo) => photo.id !== photoId))
    ask({
      title: "Hapus foto ini?",
      description: "Foto akan dihapus dari penyimpanan dan tidak muncul lagi di halaman publik.",
      confirmLabel: "Hapus foto",
      destructive: true,
      successMessage: "Foto dihapus.",
      run: () => deleteVehiclePhotoAction(formData),
      onSuccess: () => router.refresh(),
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
    <div className="space-y-4">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card",
                photo.isPrimary && "ring-2 ring-accent"
              )}
            >
              <div className="aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={`Foto ${index + 1}`} loading="lazy" className="size-full object-cover" />
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <div className="flex items-center gap-0.5">
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
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => remove(photo.id)}
                    disabled={readOnly || pending}
                    aria-label="Hapus foto"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="newPhotos"
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
            htmlFor="newPhotos"
            className={cn(buttonVariantsLink, "cursor-pointer")}
          >
            <ImagePlus aria-hidden />
            Tambah foto
          </Label>
          <p className="text-sm text-muted-foreground">
            {photos.length} dari {MAX_VEHICLE_PHOTOS} foto · foto pertama otomatis jadi utama
          </p>
        </div>
      ) : null}
      {dialog}
    </div>
  )
}

const buttonVariantsLink =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
