"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { TestimonialStatus } from "@prisma/client"
import { toast } from "sonner"
import { Check, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { TestimonialForm, type TestimonialFormValue } from "@/components/testimonials/testimonial-form"
import { toDayKey } from "@/lib/datetime"
import {
  deleteTestimonialAction,
  setTestimonialStatusAction,
} from "@/server/actions/testimonials"

export type TestimonialActionRow = {
  id: string
  author: string
  rating: number
  message: string
  vehicleId: string | null
  photoUrl: string | null
  status: TestimonialStatus
  occurredAt: Date
}

function withId(id: string, extra: Record<string, string> = {}): FormData {
  const payload = new FormData()
  payload.set("id", id)
  for (const [key, value] of Object.entries(extra)) payload.set(key, value)
  return payload
}

/** Isi dropdown satu baris: terbitkan/sembunyikan, ubah, dan hapus. */
export function TestimonialRowActions({
  row,
  vehicles,
  readOnly = false,
  canDelete = false,
}: {
  row: TestimonialActionRow
  vehicles: { id: string; label: string }[]
  readOnly?: boolean
  canDelete?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const { ask, dialog } = useConfirmAction()

  if (readOnly) return null

  const published = row.status === "PUBLISHED"

  const initial: TestimonialFormValue = {
    id: row.id,
    author: row.author,
    rating: row.rating,
    message: row.message,
    vehicleId: row.vehicleId,
    occurredDay: toDayKey(row.occurredAt),
    photoUrl: row.photoUrl,
    isPublished: published,
  }

  function setStatus(next: TestimonialStatus, label: string) {
    startTransition(async () => {
      const result = await setTestimonialStatusAction(withId(row.id, { status: next }))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(label)
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" aria-label={`Aksi untuk testimoni ${row.author}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {published ? (
            <DropdownMenuItem disabled={pending} onSelect={() => setStatus("HIDDEN", "Testimoni disembunyikan.")}>
              <EyeOff />
              Sembunyikan
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => setStatus("PUBLISHED", "Testimoni tampil di halaman publik.")}
            >
              <Check />
              Terbitkan
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Ubah
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  ask({
                    title: "Hapus testimoni?",
                    description: (
                      <>
                        Ulasan dari <span className="font-semibold">“{row.author}”</span> hilang permanen,
                        termasuk fotonya.
                      </>
                    ),
                    confirmLabel: "Hapus testimoni",
                    destructive: true,
                    successMessage: "Testimoni dihapus.",
                    run: () => deleteTestimonialAction(withId(row.id)),
                    onSuccess: () => router.refresh(),
                  })
                }
              >
                <Trash2 />
                Hapus
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ubah testimoni</DialogTitle>
            <DialogDescription>
              Perbaiki ejaan atau ganti kendaraan yang disebut. Status terbit ikut sakelar di
              bawah formulir.
            </DialogDescription>
          </DialogHeader>
          <TestimonialForm
            vehicles={vehicles}
            initial={initial}
            readOnly={readOnly}
            onDone={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  )
}
