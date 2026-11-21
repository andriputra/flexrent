"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dayLabel, type OpeningHour } from "@/lib/opening-hours"
import { updateOpeningHoursAction } from "@/server/actions/settings"
import { FormFeedback } from "./form-field"

export function OpeningHoursForm({
  initial,
  readOnly,
  usingDefault,
}: {
  initial: OpeningHour[]
  readOnly: boolean
  usingDefault: boolean
}) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function patch(index: number, changes: Partial<OpeningHour>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...changes } : row)))
    setErrors({})
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const entries: Record<string, string> = {}
    rows.forEach((row, index) => {
      const position = String(index + 1)
      entries[`day${position}`] = row.day
      entries[`open${position}`] = row.closed ? row.open || "08:00" : row.open
      entries[`close${position}`] = row.closed ? row.close || "17:00" : row.close
      if (row.closed) entries[`closed${position}`] = "on"
    })

    startTransition(async () => {
      const result = await updateOpeningHoursAction(entries)
      if (!result.ok) {
        setErrors(result.fields ?? {})
        setServerError(result.fields ? null : result.error)
        toast.error(result.error)
        return
      }
      toast.success("Jam operasional disimpan.")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormFeedback message={serverError} />

      {usingDefault ? (
        <p className="text-xs text-muted-foreground">
          Nilai di bawah masih bawaan — halaman publik belum menampilkan jam sampai Anda menyimpan.
        </p>
      ) : null}

      <ul className="divide-y rounded-xl border">
        {rows.map((row, index) => (
          <li key={row.day} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className="w-16 text-sm font-medium">{dayLabel(row.day)}</span>
            <div className="flex items-center gap-2">
              <Input
                id={`open-${row.day}`}
                type="time"
                value={row.open}
                onChange={(event) => patch(index, { open: event.target.value })}
                disabled={readOnly || pending || row.closed}
                className="w-32 tabular-nums"
                aria-invalid={Boolean(errors[`open${index + 1}`])}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                id={`close-${row.day}`}
                type="time"
                value={row.close}
                onChange={(event) => patch(index, { close: event.target.value })}
                disabled={readOnly || pending || row.closed}
                className="w-32 tabular-nums"
                aria-invalid={Boolean(errors[`close${index + 1}`])}
              />
            </div>
            <label htmlFor={`closed-${row.day}`} className="ml-auto flex items-center gap-2 text-sm">
              <Checkbox
                id={`closed-${row.day}`}
                checked={row.closed}
                onCheckedChange={(checked) => patch(index, { closed: checked === true })}
                disabled={readOnly || pending}
              />
              Tutup
            </label>
            {errors[`open${index + 1}`] || errors[`close${index + 1}`] ? (
              <p className="w-full text-xs font-medium text-danger" role="alert">
                {errors[`close${index + 1}`] ?? errors[`open${index + 1}`]}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {errors.rows ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {errors.rows}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={readOnly || pending}
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          {pending ? "Menyimpan…" : "Simpan jam operasional"}
        </Button>
        <Label className="text-xs font-normal text-muted-foreground">
          Ditampilkan di footer halaman publik rental Anda.
        </Label>
      </div>
    </form>
  )
}
