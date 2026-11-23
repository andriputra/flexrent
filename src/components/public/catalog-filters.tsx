"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildCatalogHref } from "@/components/public/query-nav"
import type { CatalogQuery } from "@/lib/validators/public"

const TRANSMISI = [
  { value: "", label: "Semua transmisi" },
  { value: "matic", label: "Matic" },
  { value: "manual", label: "Manual" },
] as const

/** Filter katalog: transmisi langsung diterapkan, rentang harga lewat tombol. */
export function CatalogFilters({ slug, current }: { slug: string; current: CatalogQuery }) {
  const router = useRouter()
  const [min, setMin] = useState(current.min ? String(current.min) : "")
  const [maks, setMaks] = useState(current.maks ? String(current.maks) : "")

  const digits = (value: string) => Number(value.replace(/[^\d]/g, "") || 0)
  const hasFilter = Boolean(current.transmisi || current.min || current.maks || current.jenis)

  function apply(next: Partial<CatalogQuery>) {
    router.push(buildCatalogHref(slug, { ...current, ...next }))
  }

  return (
    <form
      className="reveal relative flex flex-wrap items-end gap-3 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/40 p-4 shadow-card"
      onSubmit={(event) => {
        event.preventDefault()
        apply({ min: digits(min), maks: digits(maks) })
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent/80 via-accent/30 to-transparent"
      />
      <div className="w-full space-y-1.5 sm:flex-1 sm:w-40 sm:max-w-[15rem]">
        <Label htmlFor="transmisi" className="text-xs font-medium text-muted-foreground">
          Transmisi
        </Label>
        <Select
          value={current.transmisi || "all"}
          onValueChange={(value) =>
            apply({ transmisi: value === "all" ? "" : (value as "matic" | "manual") })
          }
        >
          <SelectTrigger id="transmisi" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSMISI.map((option) => (
              <SelectItem key={option.label} value={option.value || "all"}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-1.5 sm:flex-1 sm:w-40 sm:max-w-[15rem]">
        <Label htmlFor="min-harga" className="text-xs font-medium text-muted-foreground">
          Harga minimal / hari
        </Label>
        <Input
          id="min-harga"
          inputMode="numeric"
          placeholder="0"
          value={min}
          onChange={(event) => setMin(event.target.value)}
        />
      </div>
      <div className="w-full space-y-1.5 sm:flex-1 sm:w-40 sm:max-w-[15rem]">
        <Label htmlFor="maks-harga" className="text-xs font-medium text-muted-foreground">
          Harga maksimal / hari
        </Label>
        <Input
          id="maks-harga"
          inputMode="numeric"
          placeholder="200000"
          value={maks}
          onChange={(event) => setMaks(event.target.value)}
        />
      </div>

      <div className="flex gap-2 sm:ml-auto">
        <Button
          type="submit"
          variant="outline"
          className="h-8 rounded-full border-border/70 px-3.5 text-[0.8rem] font-medium transition-colors duration-300 hover:bg-muted"
        >
          Terapkan harga
        </Button>
        {hasFilter ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-full px-3 text-[0.8rem]"
            onClick={() => {
              setMin("")
              setMaks("")
              apply({ transmisi: "", min: 0, maks: 0, jenis: "" })
            }}
          >
            <RotateCcw aria-hidden />
            Reset
          </Button>
        ) : null}
      </div>
    </form>
  )
}
