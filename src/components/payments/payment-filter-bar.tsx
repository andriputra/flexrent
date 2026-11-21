"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "SETTLED", label: "Lunas" },
  { value: "PENDING", label: "Menunggu" },
  { value: "FAILED", label: "Gagal" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
  { value: "REFUNDED", label: "Dikembalikan" },
]

const METHOD_OPTIONS = [
  { value: "ALL", label: "Semua metode" },
  { value: "CASH", label: "Tunai" },
  { value: "BANK_TRANSFER", label: "Transfer" },
  { value: "MIDTRANS", label: "Midtrans" },
  { value: "OTHER", label: "Lainnya" },
]

export function PaymentFilterBar({ total, monthSettled }: { total: number; monthSettled: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get("status") ?? "ALL"
  const method = params.get("metode") ?? "ALL"
  const initialQuery = params.get("cari") ?? ""
  const [query, setQuery] = useState(initialQuery)

  function apply(next: { status?: string; metode?: string; cari?: string }) {
    const search = new URLSearchParams()
    const values = { status: next.status ?? status, metode: next.metode ?? method, cari: next.cari ?? initialQuery }
    if (values.status && values.status !== "ALL") search.set("status", values.status)
    if (values.metode && values.metode !== "ALL") search.set("metode", values.metode)
    if (values.cari.trim()) search.set("cari", values.cari.trim())
    const suffix = search.toString()
    router.replace(`/dashboard/payments${suffix ? `?${suffix}` : ""}`)
  }

  const hasFilter = Boolean(params.get("status") || params.get("metode") || params.get("cari"))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault()
          apply({ cari: query })
        }}
      >
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari kode booking, pelanggan, referensi"
          aria-label="Cari pembayaran"
          className="w-[260px] pl-8"
        />
      </form>

      <Select value={status} onValueChange={(value) => apply({ status: value })}>
        <SelectTrigger size="sm" className="w-[150px]" aria-label="Saring status pembayaran">
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

      <Select value={method} onValueChange={(value) => apply({ metode: value })}>
        <SelectTrigger size="sm" className="w-[150px]" aria-label="Saring metode pembayaran">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METHOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total} pembayaran · {monthSettled} masuk bulan ini
      </p>

      {hasFilter ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("")
            apply({ status: "ALL", metode: "ALL", cari: "" })
          }}
        >
          <X aria-hidden />
          Reset
        </Button>
      ) : null}
    </div>
  )
}
