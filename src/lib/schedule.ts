export type Interval = { startsAt: Date; endsAt: Date }

/**
 * Bentrok rentang mengikuti semantik constraint database: batas bawah inklusif,
 * batas atas eksklusif. Selesai 10.00 dan mulai 10.00 dianggap tidak bentrok.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return (
    a.startsAt.getTime() < b.endsAt.getTime() &&
    b.startsAt.getTime() < a.endsAt.getTime()
  )
}

export function findOverlapping<T extends Interval>(
  candidate: Interval,
  list: readonly T[]
): T[] {
  return list.filter((item) => overlaps(candidate, item))
}

export function hasOverlap(candidate: Interval, list: readonly Interval[]): boolean {
  return list.some((item) => overlaps(candidate, item))
}

/** Satu hari kalender (instant 00.00-24.00 WIB) tersentuh rentang aktif? */
export function isDayBlocked(dayStart: Date, dayEnd: Date, list: readonly Interval[]): boolean {
  return list.some((item) => overlaps({ startsAt: dayStart, endsAt: dayEnd }, item))
}
