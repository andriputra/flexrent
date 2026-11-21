"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, MoreHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConfirmAction } from "@/components/shared/confirm-action"
import {
  completeMaintenanceAction,
  deleteMaintenanceAction,
} from "@/server/actions/maintenance"

function withId(id: string): FormData {
  const payload = new FormData()
  payload.set("id", id)
  return payload
}

export function MaintenanceRowActions({
  plan,
  readOnly = false,
  canDelete = false,
}: {
  plan: { id: string; title: string; isDone: boolean }
  readOnly?: boolean
  canDelete?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { ask, dialog } = useConfirmAction()

  if (readOnly) return null

  function complete() {
    startTransition(async () => {
      const result = await completeMaintenanceAction(withId(plan.id))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Perawatan ditandai selesai.")
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" aria-label={`Aksi untuk ${plan.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!plan.isDone && (
            <DropdownMenuItem disabled={pending} onSelect={complete}>
              <Check />
              Tandai selesai
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              {!plan.isDone && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  ask({
                    title: "Hapus jadwal perawatan?",
                    description: (
                      <>
                        Jadwal <span className="font-semibold">“{plan.title}”</span> dihapus dari riwayat.
                        Kendaraan tidak otomatis berpindah status.
                      </>
                    ),
                    confirmLabel: "Hapus jadwal",
                    destructive: true,
                    successMessage: "Jadwal perawatan dihapus.",
                    run: () => deleteMaintenanceAction(withId(plan.id)),
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
      {dialog}
    </>
  )
}
