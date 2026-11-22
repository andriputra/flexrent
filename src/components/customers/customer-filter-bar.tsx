"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua pelanggan" },
  { value: "NORMAL", label: "Normal" },
  { value: "BLACKLIST", label: "Daftar hitam" },
]

const VERIFY_OPTIONS = [
  { value: "ALL", label: "Dokumen apa pun" },
  { value: "VERIFIED", label: "Dokumen terverifikasi" },
  { value: "UNVERIFIED", label: "Belum terverifikasi" },
]

export function CustomerFilterBar({
  total,
  blacklisted,
}: {
  total: number
  blacklisted: number
}) {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get("status") ?? "ALL"
  const verifikasi = params.get("verifikasi") ?? "ALL"
  const [query, setQuery] = useState(params.get("cari") ?? "")

  function apply(overrides: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === "ALL") search.delete(key)
      else search.set(key, value)
    }
    search.delete("page")
    const suffix = search.toString()
    router.replace(`/dashboard/customers${suffix ? `?${suffix}` : ""}`)
  }

  const hasFilter = Boolean(params.get("status") || params.get("verifikasi") || params.get("cari"))

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-card">
      <form
        className="relative min-w-[240px] flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ cari: query.trim() || null })
        }}
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama atau nomor WhatsApp"
          aria-label="Cari pelanggan"
          className="bg-background pl-9 font-medium"
        />
      </form>

      <Select value={status} onValueChange={(value) => apply({ status: value })}>
        <SelectTrigger size="sm" className="w-[170px] bg-background font-medium" aria-label="Saring status pelanggan">
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

      <Select value={verifikasi} onValueChange={(value) => apply({ verifikasi: value })}>
        <SelectTrigger size="sm" className="w-[190px] bg-background font-medium" aria-label="Saring verifikasi dokumen">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VERIFY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 text-xs font-medium tabular-nums" aria-live="polite">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
        {total} pelanggan · {blacklisted} di daftar hitam
      </p>

      {hasFilter ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setQuery("")
            apply({ status: null, verifikasi: null, cari: null })
          }}
        >
          <X aria-hidden />
          Reset
        </Button>
      ) : null}
    </div>
  )
}
