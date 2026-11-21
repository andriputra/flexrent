"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SELESAI_OPTIONS = [
  { value: "ALL", label: "Semua jadwal" },
  { value: "OPEN", label: "Belum selesai" },
  { value: "DONE", label: "Sudah selesai" },
]

export function MaintenanceFilterBar({
  vehicles,
  total,
  open,
}: {
  vehicles: { id: string; label: string }[]
  total: number
  open: number
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const vehicle = params.get("vehicle") ?? "ALL"
  const selesai = params.get("selesai") ?? "ALL"

  function apply(next: { vehicle?: string; selesai?: string }) {
    const query = new URLSearchParams()
    const nextVehicle = next.vehicle ?? vehicle
    if (nextVehicle && nextVehicle !== "ALL") query.set("vehicle", nextVehicle)
    const nextSelesai = next.selesai ?? selesai
    if (nextSelesai && nextSelesai !== "ALL") query.set("selesai", nextSelesai)
    const suffix = query.toString()
    startTransition(() => {
      router.replace(`/dashboard/maintenance${suffix ? `?${suffix}` : ""}`)
    })
  }

  const hasFilter = Boolean(params.get("vehicle") || params.get("selesai"))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={vehicle} onValueChange={(value) => apply({ vehicle: value })}>
        <SelectTrigger size="sm" className="w-[220px]" aria-label="Saring kendaraan">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua kendaraan</SelectItem>
          {vehicles.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selesai} onValueChange={(value) => apply({ selesai: value })}>
        <SelectTrigger size="sm" className="w-[160px]" aria-label="Saring status perawatan">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SELESAI_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total} jadwal · {open} belum selesai
        {pending ? " · memuat…" : ""}
      </p>

      {hasFilter ? (
        <Button variant="ghost" size="sm" onClick={() => apply({ vehicle: "ALL", selesai: "ALL" })}>
          <X aria-hidden />
          Reset
        </Button>
      ) : null}
    </div>
  )
}
