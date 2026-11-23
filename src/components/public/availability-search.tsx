"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { CalendarDays, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildCatalogHref } from "@/components/public/query-nav"
import { cn } from "@/lib/utils"
import type { CatalogQuery } from "@/lib/validators/public"

const TYPES = [
  { value: "", label: "Semua" },
  { value: "motor", label: "Motor" },
  { value: "mobil", label: "Mobil" },
] as const

type Field = "ambil" | "kembali" | "jenis"

/**
 * Hero pencarian: tanggal dan jenis langsung menyaring, tombolnya tinggal
 * mengulang pencarian. Nilainya dibaca dari URL, bukan dari state lokal, supaya
 * tombol Back dan Forward selalu menampilkan filter yang benar-benar dipakai.
 */
export function AvailabilitySearch({
  slug,
  current,
  today,
}: {
  slug: string
  current: CatalogQuery
  today: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const datesIncomplete = Boolean(current.ambil) !== Boolean(current.kembali)
  const rangeInvalid =
    Boolean(current.ambil) && Boolean(current.kembali) && current.kembali <= current.ambil

  // Rentang yang separuh atau urutannya salah tetap ikut ke URL supaya kotaknya
  // tidak mengosongkan diri sendiri; server yang memutuskan untuk mengabaikannya.
  function apply(next: Partial<Pick<CatalogQuery, Field>>) {
    const href = buildCatalogHref(slug, { ...current, ...next })
    // replace, bukan push: mengubah filter bukan membuka halaman baru, dan
    // satu pencarian tidak boleh memenuhi riwayat sampai sepuluh langkah.
    startTransition(() => router.replace(href))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        apply({})
      }}
      aria-busy={pending}
      className={cn(
        "reveal relative space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-pop ring-1 ring-accent/15 transition-opacity duration-200 sm:p-5",
        pending && "opacity-70"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/65 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-44 rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.16),transparent_70%)] blur-2xl"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,17rem)_minmax(0,17rem)_auto_1fr] lg:items-end">
        <div className="space-y-1.5 sm:max-w-[17rem]">
          <Label
            htmlFor="ambil"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <CalendarDays aria-hidden className="size-3.5" />
            Tanggal ambil
          </Label>
          <Input
            id="ambil"
            type="date"
            min={today}
            value={current.ambil}
            onChange={(event) => apply({ ambil: event.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:max-w-[17rem]">
          <Label
            htmlFor="kembali"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <CalendarDays aria-hidden className="size-3.5" />
            Tanggal kembali
          </Label>
          <Input
            id="kembali"
            type="date"
            min={current.ambil || today}
            value={current.kembali}
            onChange={(event) => apply({ kembali: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">Jenis</span>
          <div
            role="group"
            aria-label="Jenis kendaraan"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-muted/50 p-1"
          >
            {TYPES.map((option) => {
              const active = current.jenis === option.value
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => apply({ jenis: option.value })}
                  className={
                    active
                      ? "h-6 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-[0_8px_18px_-10px_var(--primary)] transition-colors duration-200"
                      : "h-6 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  }
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          type="submit"
          className="h-10 w-full justify-center rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover sm:w-auto sm:self-end sm:justify-self-end"
        >
          <Search aria-hidden />
          Cek ketersediaan
        </Button>
      </div>

      {rangeInvalid ? (
        <p className="text-sm text-danger" role="alert">
          Tanggal kembali harus setelah tanggal ambil.
        </p>
      ) : datesIncomplete ? (
        <p className="text-sm text-muted-foreground">
          Isi dua-duanya supaya kami bisa menyaring kendaraan yang sedang terisi.
        </p>
      ) : null}
    </form>
  )
}
