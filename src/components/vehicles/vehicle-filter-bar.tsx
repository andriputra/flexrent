"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "AVAILABLE", label: "Tersedia" },
  { value: "RENTED", label: "Disewa" },
  { value: "MAINTENANCE", label: "Perawatan" },
  { value: "INACTIVE", label: "Nonaktif" },
]

const TYPE_OPTIONS = [
  { value: "ALL", label: "Motor & mobil" },
  { value: "MOTOR", label: "Motor" },
  { value: "MOBIL", label: "Mobil" },
]

export function VehicleFilterBar({ total }: { total: number }) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [search, setSearch] = useState(params.get("q") ?? "")
  const type = params.get("type") ?? "ALL"
  const status = params.get("status") ?? "ALL"
  const firstRender = useRef(true)

  // Kolom pencarian memakai debounce agar tidak bertanya ke server tiap ketikan.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      apply({ q: search.trim() || undefined, type, status })
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function apply(next: { q?: string; type?: string; status?: string }) {
    const query = new URLSearchParams()
    const q = next.q ?? (search.trim() || undefined)
    if (q) query.set("q", q)
    const nextType = next.type ?? type
    if (nextType && nextType !== "ALL") query.set("type", nextType)
    const nextStatus = next.status ?? status
    if (nextStatus && nextStatus !== "ALL") query.set("status", nextStatus)
    startTransition(() => {
      router.replace(`/dashboard/vehicles?${query.toString()}`)
    })
  }

  function reset() {
    setSearch("")
    startTransition(() => router.replace("/dashboard/vehicles"))
  }

  const hasFilter = Boolean(params.get("q") || params.get("type") || params.get("status"))

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-card sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari plat, merek, atau model"
          aria-label="Cari kendaraan"
          className="bg-background pl-9 font-medium"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={type}
          onValueChange={(value) => {
            apply({ type: value })
          }}
        >
          <SelectTrigger size="sm" className="w-[150px] bg-background font-medium" aria-label="Saring jenis kendaraan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => {
            apply({ status: value })
          }}
        >
          <SelectTrigger size="sm" className="w-[150px] bg-background font-medium" aria-label="Saring status kendaraan">
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

        <p
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 text-xs font-medium tabular-nums"
          aria-live="polite"
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
          {total} kendaraan
          {pending ? " · memuat…" : ""}
        </p>

        {hasFilter ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <X aria-hidden />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  )
}
