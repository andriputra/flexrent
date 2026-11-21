"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useVehicleQuote } from "@/components/public/use-vehicle-quote"
import { formatRupiah } from "@/lib/format"
import { toDayKey } from "@/lib/datetime"

/**
 * Kalkulator harga langsung. Angka tidak dihitung di klien: setiap perubahan
 * tanggal menanyakan quoteVehicleAction supaya tarif yang tampil = tarif di database.
 */
export function PriceCalculator({
  slug,
  vehicleId,
  hasDriver,
  initial,
}: {
  slug: string
  vehicleId: string
  hasDriver: boolean
  initial: { ambil: string; kembali: string }
}) {
  const today = toDayKey(new Date())
  const [startDay, setStartDay] = useState(initial.ambil || today)
  const [startTime, setStartTime] = useState("09:00")
  const [returnDay, setReturnDay] = useState(initial.kembali || "")
  const [returnTime, setReturnTime] = useState("09:00")
  const [withDriver, setWithDriver] = useState(false)
  const { quote, error, computing } = useVehicleQuote({
    slug,
    vehicleId,
    startDay,
    startTime,
    returnDay,
    returnTime,
    withDriver,
  })

  const wizardHref = `/${slug}/pesan/${vehicleId}?ambil=${startDay}&kembali=${returnDay}&jamAmbil=${startTime}&jamKembali=${returnTime}&sopir=${withDriver ? 1 : 0}`

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="calc-start">Tanggal ambil</Label>
          <Input
            id="calc-start"
            type="date"
            min={today}
            value={startDay}
            onChange={(event) => setStartDay(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="calc-start-time">Jam</Label>
          <Input id="calc-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="calc-end">Tanggal kembali</Label>
          <Input
            id="calc-end"
            type="date"
            min={startDay || today}
            value={returnDay}
            onChange={(event) => {
              setReturnDay(event.target.value)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="calc-end-time">Jam</Label>
          <Input id="calc-end-time" type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} />
        </div>
      </div>

      {hasDriver ? (
        <fieldset className="space-y-1.5">
          <legend className="text-sm leading-5 font-medium">Layanan sopir</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Layanan sopir">
            {[
              { label: "Tanpa sopir", value: false },
              { label: "Dengan sopir", value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={withDriver === option.value}
                onClick={() => setWithDriver(option.value)}
                className={[
                  "rounded-xl border px-2 py-1.5 text-sm transition-colors motion-reduce:transition-none",
                  withDriver === option.value
                    ? "border-accent bg-accent/15 font-medium"
                    : "hover:bg-muted",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="space-y-1 rounded-xl border bg-muted/30 p-3 text-sm">
        {quote ? (
          <>
            <Row label={`Sewa ${quote.rental.scheme}`} value={formatRupiah(quote.rentalAmount)} />
            {quote.driverAmount ? <Row label="Sopir" value={formatRupiah(quote.driverAmount)} /> : null}
            <li className="flex justify-between text-muted-foreground">
              <span>Deposit (kembali bila lancar)</span>
              <span className="tabular-nums">{formatRupiah(quote.depositAmount)}</span>
            </li>
            <li className="mt-1 flex items-baseline justify-between border-t pt-2 font-semibold">
              <span>Total bayar</span>
              <span className="text-lg tabular-nums">{formatRupiah(quote.totalAmount)}</span>
            </li>
          </>
        ) : (
          <li className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden className={`size-4 ${computing ? "animate-spin" : ""}`} />
            Pilih tanggal ambil dan kembali untuk melihat total.
          </li>
        )}
      </ul>

      <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent-hover">
        <Link href={wizardHref}>Lanjut isi data penyewaan</Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        Harga dihitung otomatis dari tarif harian, mingguan, dan bulanan — kombinasi termurah yang dipakai.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </li>
  )
}
