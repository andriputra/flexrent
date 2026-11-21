"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, MoreHorizontal, Pencil, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConfirmAction } from "@/components/shared/confirm-action"
import { deleteVehicleAction, setVehiclePublishedAction } from "@/server/actions/vehicles"
import type { ActionResult } from "@/lib/result"

function withId(id: string, extra: Record<string, string> = {}): FormData {
  const payload = new FormData()
  payload.set("id", id)
  for (const [key, value] of Object.entries(extra)) payload.set(key, value)
  return payload
}

export function VehicleRowActions({
  vehicle,
  readOnly = false,
  canDelete = false,
}: {
  vehicle: { id: string; plate: string; isPublished: boolean }
  readOnly?: boolean
  canDelete?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { ask, dialog } = useConfirmAction()

  function togglePublished() {
    startTransition(async () => {
      const result: ActionResult<null> = await setVehiclePublishedAction(
        withId(vehicle.id, { isPublished: String(!vehicle.isPublished) })
      )
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        vehicle.isPublished
          ? `${vehicle.plate} disembunyikan dari halaman publik.`
          : `${vehicle.plate} ditampilkan lagi.`
      )
      router.refresh()
    })
  }

  if (readOnly) {
    return (
      <Button asChild size="xs" variant="outline">
        <Link href={`/dashboard/vehicles/${vehicle.id}`}>Lihat</Link>
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" aria-label={`Aksi untuk ${vehicle.plate}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/vehicles/${vehicle.id}`}>
              <Pencil />
              Ubah data
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={togglePublished} disabled={pending}>
            {vehicle.isPublished ? <XCircle /> : <CheckCircle2 />}
            {vehicle.isPublished ? "Sembunyikan dari publik" : "Tampilkan di publik"}
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  ask({
                    title: "Hapus kendaraan?",
                    description: (
                      <>
                        <span className="font-semibold">{vehicle.plate}</span> berikut foto dan jadwal
                        perawatannya akan dihapus permanen. Kendaraan yang masih punya pesanan aktif tidak
                        bisa dihapus.
                      </>
                    ),
                    confirmLabel: "Hapus kendaraan",
                    destructive: true,
                    successMessage: "Kendaraan dihapus.",
                    run: () => deleteVehicleAction(withId(vehicle.id)),
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
