"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, List, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "PENDING", label: "Menunggu konfirmasi" },
  { value: "CONFIRMED", label: "Dikonfirmasi" },
  { value: "ONGOING", label: "Sedang disewa" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
]

export type BookingViewMode = "daftar" | "kalender"

export function BookingFilterBar({
  mode,
  total,
  activeCount,
  vehicles,
}: {
  mode: BookingViewMode
  total: number
  activeCount: number
  vehicles: { id: string; label: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get("status") ?? "ALL"
  const vehicle = params.get("kendaraan") ?? "ALL"
  const initialQuery = params.get("cari") ?? ""
  const [query, setQuery] = useState(initialQuery)

  /** Ganti parameter tanpa membuang filter lain; pindah halaman selalu ke 1. */
  function apply(overrides: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === "ALL") search.delete(key)
      else search.set(key, value)
    }
    search.delete("page")
    const suffix = search.toString()
    router.replace(`/dashboard/bookings${suffix ? `?${suffix}` : ""}`)
  }

  function switchMode(next: BookingViewMode) {
    if (next === mode) return
    // Kalender menampilkan seluruh armada, jadi filter daftar ikut dibersihkan.
    apply(
      next === "kalender"
        ? { status: null, kendaraan: null, cari: null, tampilan: "kalender" }
        : { tampilan: null, mulai: null }
    )
  }

  const hasFilter = Boolean(params.get("status") || params.get("kendaraan") || params.get("cari"))

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
          <Button variant={mode === "daftar" ? "secondary" : "ghost"} size="sm" onClick={() => switchMode("daftar")}>
            <List aria-hidden />
            Daftar
          </Button>
          <Button
            variant={mode === "kalender" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => switchMode("kalender")}
          >
            <CalendarDays aria-hidden />
            Kalender armada
          </Button>
        </div>

        {mode === "daftar" ? (
          <>
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault()
                apply({ cari: query.trim() || null })
              }}
            >
              <Search
                aria-hidden
                className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kode, nama, WhatsApp, atau plat"
                aria-label="Cari booking"
                className="w-[280px] pl-8"
              />
            </form>

            <Select value={status} onValueChange={(value) => apply({ status: value })}>
              <SelectTrigger size="sm" className="w-[190px]" aria-label="Saring status booking">
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

            <Select value={vehicle} onValueChange={(value) => apply({ kendaraan: value })}>
              <SelectTrigger size="sm" className="w-[210px]" aria-label="Saring kendaraan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua kendaraan</SelectItem>
                {vehicles.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("")
                  apply({ status: null, kendaraan: null, cari: null })
                }}
              >
                <X aria-hidden />
                Reset
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Semua kendaraan aktif, dua minggu sekali jalan. Klik bilah untuk membuka pesanannya.
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {mode === "daftar" ? `${total} booking` : `${vehicles.length} kendaraan`} · {activeCount} masih berjalan
      </p>
    </div>
  )
}
