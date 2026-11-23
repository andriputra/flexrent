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

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "PENDING", label: "Menunggu ditinjau" },
  { value: "PUBLISHED", label: "Tampil di publik" },
  { value: "HIDDEN", label: "Disembunyikan" },
]

export function TestimonialFilterBar({
  vehicles,
  total,
  pending,
}: {
  vehicles: { id: string; label: string }[]
  total: number
  pending: number
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const status = params.get("status") ?? "ALL"
  const vehicle = params.get("vehicle") ?? "ALL"

  function apply(next: { status?: string; vehicle?: string }) {
    const query = new URLSearchParams()
    const nextStatus = next.status ?? status
    if (nextStatus !== "ALL") query.set("status", nextStatus)
    const nextVehicle = next.vehicle ?? vehicle
    if (nextVehicle !== "ALL") query.set("vehicle", nextVehicle)
    const suffix = query.toString()
    startTransition(() => {
      router.replace(`/dashboard/testimonials${suffix ? `?${suffix}` : ""}`)
    })
  }

  const hasFilter = Boolean(params.get("status") || params.get("vehicle"))

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-card">
      <Select value={status} onValueChange={(value) => apply({ status: value })}>
        <SelectTrigger size="sm" className="w-[210px] bg-background font-medium" aria-label="Saring status testimoni">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={vehicle} onValueChange={(value) => apply({ vehicle: value })}>
        <SelectTrigger size="sm" className="w-[220px] bg-background font-medium" aria-label="Saring kendaraan">
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

      <p
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 text-xs font-medium tabular-nums"
        aria-live="polite"
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
        {total} ulasan · {pending} menunggu
        {isPending ? " · memuat…" : ""}
      </p>

      {hasFilter ? (
        <Button variant="outline" size="sm" onClick={() => apply({ status: "ALL", vehicle: "ALL" })}>
          <X aria-hidden />
          Reset
        </Button>
      ) : null}
    </div>
  )
}
