"use client"

import { useEffect, useState } from "react"
import type { Quote } from "@/lib/quote"
import { quoteVehicleAction } from "@/server/actions/booking"

export type QuoteInput = {
  slug: string
  vehicleId: string
  startDay: string
  startTime: string
  returnDay: string
  returnTime: string
  withDriver: boolean
}

/**
 * Harga dihitung server (sumber kebenaran = tarif di database), jadi setiap
 * perubahan tanggal ditanyakan ulang. Debounce singkat supaya mengetik tanggal
 * tidak memicu satu request per karakter.
 */
export function useVehicleQuote(input: QuoteInput): {
  quote: Quote | null
  error: string
  computing: boolean
} {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState("")
  const [computing, setComputing] = useState(false)
  const { slug, vehicleId, startDay, startTime, returnDay, returnTime, withDriver } = input
  const ready = Boolean(startDay && returnDay && returnDay >= startDay)

  useEffect(() => {
    if (!ready) {
      setQuote(null)
      setError("")
      return
    }
    let cancelled = false
    setComputing(true)
    const timer = setTimeout(() => {
      quoteVehicleAction({ slug, vehicleId, startDay, startTime, returnDay, returnTime, withDriver })
        .then((result) => {
          if (cancelled) return
          if (result.ok) {
            setQuote(result.data.quote)
            setError("")
          } else {
            setQuote(null)
            setError(result.error)
          }
        })
        .catch(() => {
          if (!cancelled) setError("Koneksi terputus, hitung ulang ya.")
        })
        .finally(() => {
          if (!cancelled) setComputing(false)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ready, slug, vehicleId, startDay, startTime, returnDay, returnTime, withDriver])

  return { quote, error, computing }
}
