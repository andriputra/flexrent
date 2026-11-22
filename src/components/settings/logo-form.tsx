"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImageIcon, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { removeTenantLogoAction, uploadTenantLogoAction } from "@/server/actions/settings"
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/upload-limits"
import { cn } from "@/lib/utils"

export function LogoForm({ logoUrl, readOnly }: { logoUrl: string | null; readOnly: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const { ask, dialog } = useConfirmAction()

  function upload(event: React.FormEvent) {
    event.preventDefault()
    if (!file) {
      toast.error("Pilih berkas logo lebih dulu.")
      return
    }
    const formData = new FormData()
    formData.set("logo", file)
    startTransition(async () => {
      const result = await uploadTenantLogoAction(formData)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setFile(null)
      toast.success("Logo diperbarui.")
      router.refresh()
    })
  }

  function remove() {
    ask({
      title: "Hapus logo rental?",
      description: "Halaman publik akan kembali memakai nama rental tanpa logo.",
      confirmLabel: "Hapus logo",
      destructive: true,
      successMessage: "Logo dihapus.",
      run: () => removeTenantLogoAction(),
      onSuccess: () => router.refresh(),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo rental" className="size-full object-contain" />
          ) : (
            <ImageIcon aria-hidden className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium">{logoUrl ? "Logo aktif" : "Belum ada logo"}</p>
          <p className="text-muted-foreground">JPG, PNG, atau WebP sampai {MAX_IMAGE_LABEL}. Tampil di header halaman publik.</p>
        </div>
      </div>

      {!readOnly ? (
        <form onSubmit={upload} className="flex flex-wrap items-center gap-3">
          <input
            id="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null
              // Logo tidak ikut dikecilkan di browser: konversi ke JPEG membuang
              // transparansi. Yang di atas plafon ditolak sebelum dikirim supaya
              // request tidak pernah menembus batas body Server Action.
              if (next && next.size > MAX_IMAGE_BYTES) {
                toast.error(`Logo maksimal ${MAX_IMAGE_LABEL} — kompres dulu agar transparansinya tetap utuh`)
                event.target.value = ""
                setFile(null)
                return
              }
              setFile(next)
              if (next) toast.info(`${next.name} siap diunggah.`)
            }}
          />
          <label
            htmlFor="logo"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Upload aria-hidden />
            Pilih berkas
          </label>
          <Button type="submit" size="sm" disabled={pending || !file}>
            {pending ? "Mengunggah…" : "Unggah logo"}
          </Button>
          <span className={cn("text-sm", file ? "text-foreground" : "text-muted-foreground")}>
            {file ? file.name : "Belum ada berkas dipilih"}
          </span>
        </form>
      ) : null}

      {logoUrl && !readOnly ? (
        <Button type="button" variant="outline" size="sm" onClick={remove} disabled={pending}>
          <Trash2 aria-hidden />
          Hapus logo
        </Button>
      ) : null}

      {dialog}
    </div>
  )
}
