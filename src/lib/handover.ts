import type { FuelLevel, HandoverPhotoPosition } from "@prisma/client"
import { diffInCalendarDays } from "@/lib/datetime"

/** Posisi foto yang diminta pada checklist — urutannya dipakai di formulir. */
export const PHOTO_POSITIONS: HandoverPhotoPosition[] = [
  "FRONT",
  "BACK",
  "LEFT",
  "RIGHT",
  "DASHBOARD",
]

/** Batas foto satu checklist: 5 posisi wajib + sisa untuk foto tambahan. */
export const MAX_HANDOVER_PHOTOS = 8

export const POSITION_LABEL: Record<HandoverPhotoPosition, string> = {
  FRONT: "Depan",
  BACK: "Belakang",
  LEFT: "Kiri",
  RIGHT: "Kanan",
  DASHBOARD: "Dashboard",
  OTHER: "Lainnya",
}

export const FUEL_LEVELS = ["EMPTY", "QUARTER", "HALF", "THREE_QUARTER", "FULL"] as const satisfies readonly FuelLevel[]

export type FuelLevelValue = (typeof FUEL_LEVELS)[number]

export const FUEL_LABEL: Record<FuelLevel, string> = {
  EMPTY: "Kosong",
  QUARTER: "1/4",
  HALF: "1/2",
  THREE_QUARTER: "3/4",
  FULL: "Penuh",
}

/** Perbandingan level memakai perempat tangki supaya tidak bergantung pecahan biner. */
const FUEL_QUARTERS: Record<FuelLevel, number> = {
  EMPTY: 0,
  QUARTER: 1,
  HALF: 2,
  THREE_QUARTER: 3,
  FULL: 4,
}

export function fuelLabel(level: FuelLevel | null | undefined): string {
  return level ? FUEL_LABEL[level] : "—"
}

export function isFuelLevel(value: string): value is FuelLevel {
  return (FUEL_LEVELS as readonly string[]).includes(value)
}

export function isPhotoPosition(value: string): value is HandoverPhotoPosition {
  return Object.keys(POSITION_LABEL).includes(value.toUpperCase())
}

/** Posisi yang belum difoto; kosong berarti checklist lengkap. */
export function missingPhotoPositions(filled: HandoverPhotoPosition[]): HandoverPhotoPosition[] {
  const present = new Set(filled)
  return PHOTO_POSITIONS.filter((position) => !present.has(position))
}

/** Berkurang berapa perempat tangki antara pengambilan dan pengembalian. */
export function fuelDropQuarters(
  from: FuelLevel | null | undefined,
  to: FuelLevel | null | undefined
): number {
  if (!from || !to) return 0
  return Math.max(0, FUEL_QUARTERS[from] - FUEL_QUARTERS[to])
}

export function fuelDropLabel(quarters: number): string | null {
  if (quarters <= 0) return null
  const levels: Partial<Record<number, string>> = { 1: "1/4", 2: "1/2", 3: "3/4", 4: "penuh" }
  return `Bahan bakar berkurang ${levels[quarters] ?? `${quarters}/4`} tangki`
}

/** Jarak tempuh; `null` bila salah satu odometer belum tercatat. */
export function odometerDelta(
  pickup: number | null | undefined,
  returned: number | null | undefined
): number | null {
  if (pickup === null || pickup === undefined || returned === null || returned === undefined) return null
  return Math.max(0, returned - pickup)
}

/** Hari keterlambatan mengikuti kalender WIB: kembali sehari sesudah jatuh tempo = 1 hari. */
export function lateDays(endsAt: Date, returnedAt: Date): number {
  return Math.max(0, diffInCalendarDays(endsAt, returnedAt))
}
