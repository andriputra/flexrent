"use client"

import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ActionResult } from "@/lib/result"

export type ConfirmRequest = {
  title: string
  description: ReactNode
  confirmLabel?: string
  destructive?: boolean
  successMessage?: string
  run: () => Promise<ActionResult<unknown>>
  onSuccess?: () => void
}

/** Dialog konfirmasi untuk aksi destruktif — pengganti window.confirm. */
export function useConfirmAction() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const [pending, setPending] = useState(false)

  const ask = (next: ConfirmRequest) => setRequest(next)

  async function handleConfirm() {
    if (!request) return
    setPending(true)
    try {
      const result = await request.run()
      if (result.ok) {
        if (request.successMessage) toast.success(request.successMessage)
        request.onSuccess?.()
        setRequest(null)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Terjadi kesalahan di server. Coba lagi sebentar.")
    } finally {
      setPending(false)
    }
  }

  const dialog = (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open && !pending) setRequest(null)
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{request?.title ?? ""}</DialogTitle>
          <DialogDescription>{request?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRequest(null)} disabled={pending}>
            Batal
          </Button>
          <Button
            variant={request?.destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Memproses…" : (request?.confirmLabel ?? "Ya, lanjutkan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { ask, dialog }
}
