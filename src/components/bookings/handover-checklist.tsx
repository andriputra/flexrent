"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { HandoverType } from "@prisma/client"
import { Camera, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FUEL_LABEL, FUEL_LEVELS, PHOTO_POSITIONS, POSITION_LABEL } from "@/lib/handover"
import { cn } from "@/lib/utils"
import { saveHandoverAction } from "@/server/actions/handovers"

const TYPE_LABEL: Record<HandoverType, string> = {
  PICKUP: "Serah-terima",
  RETURN: "Pengembalian",
}

/** Checklist kondisi satu-dua arah: pengambilan saat kunci diserahkan, pengembalian saat mobil kembali. */
export function HandoverChecklist({
  code,
  status,
  readOnly = false,
  hasPickup,
  hasReturn,
  pickupOdometer,
}: {
  code: string
  status: string
  readOnly?: boolean
  hasPickup: boolean
  hasReturn: boolean
  pickupOdometer: number | null
}) {
  const router = useRouter()
  const canPickup = status === "CONFIRMED" || status === "ONGOING"
  const canReturn = status === "ONGOING" && hasPickup
  const canRecord = canPickup || canReturn
  const [type, setType] = useState<HandoverType>(canReturn || !canPickup ? "RETURN" : "PICKUP")
  const [fuel, setFuel] = useState("NONE")
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = new FormData(form)
    payload.set("code", code)
    payload.set("type", type)
    payload.set("fuelLevel", fuel === "NONE" ? "" : fuel)

    setServerError(null)
    setFields({})
    setSaving(true)
    const result = await saveHandoverAction(payload)
    setSaving(false)

    if (!result.ok) {
      setServerError(result.error)
      setFields(result.fields ?? {})
      toast.error(result.error)
      return
    }
    toast.success(
      `${TYPE_LABEL[result.data.type]} dicatat · ${result.data.photos} foto${
        result.data.type === "RETURN" ? ", tinggal selesaikan sewa untuk menghitung denda" : ""
      }`
    )
    form.reset()
    setFuel("NONE")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {serverError ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
        {(
          [
            ["PICKUP", canPickup && !hasPickup],
            ["RETURN", canReturn && !hasReturn],
          ] as const
        ).map(([value, enabled]) => (
          <Button
            key={value}
            type="button"
            variant={type === value ? "secondary" : "ghost"}
            size="sm"
            disabled={readOnly || !enabled}
            onClick={() => setType(value)}
          >
            {TYPE_LABEL[value]}
          </Button>
        ))}
      </div>

      {!canRecord ? (
        <p className="text-xs text-muted-foreground">
          Checklist kondisi baru bisa diisi setelah pesanan dikonfirmasi (serah-terima) dan saat sewa sedang berjalan
          (pengembalian).
        </p>
      ) : null}

      {type === "RETURN" && !hasPickup && (canPickup || canReturn) ? (
        <p className="text-xs text-muted-foreground">
          Checklist pengambilan belum ada — isi dulu data saat kunci diserahkan supaya perbandingan sebelum/sesudah
          bisa dihitung.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`odometer-${type}`}>Odometer</Label>
          <Input
            id={`odometer-${type}`}
            name="odometer"
            inputMode="numeric"
            placeholder={pickupOdometer ? String(pickupOdometer) : "mis. 42500"}
            className={cn(fields.odometer ? "border-danger" : undefined)}
          />
          <p className="text-xs text-muted-foreground">
            {fields.odometer ?? "Kilometer saat kendaraan diserahkan/diterima, tanpa titik."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`fuel-${type}`}>Level bahan bakar</Label>
          <Select value={fuel} onValueChange={setFuel}>
            <SelectTrigger id={`fuel-${type}`}>
              <SelectValue placeholder="Belum dicatat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Belum dicatat</SelectItem>
              {FUEL_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {FUEL_LABEL[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selisih pengambilan dan pengembalian jadi dasar biaya tambahan BBM.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conditionNotes">Kondisi kendaraan</Label>
        <Textarea
          id="conditionNotes"
          name="conditionNotes"
          rows={2}
          maxLength={500}
          placeholder="mis. Body mulus, ban depan tebal, helm 2 buah"
        />
        {fields.conditionNotes ? (
          <p className="text-xs font-medium text-danger" role="alert">
            {fields.conditionNotes}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="damageNotes">Catatan kerusakan</Label>
        <Textarea
          id="damageNotes"
          name="damageNotes"
          rows={2}
          maxLength={500}
          placeholder="Kosongkan bila tidak ada kerusakan"
        />
        <p className="text-xs text-muted-foreground">
          {fields.damageNotes ?? "Yang tertulis di sini yang jadi dasar biaya kerusakan saat sewa ditutup."}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="flex items-center gap-2 text-sm font-medium">
          <Camera aria-hidden className="size-4 text-muted-foreground" />
          Foto kondisi
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PHOTO_POSITIONS.map((position) => (
            <div key={position} className="space-y-1">
              <Label htmlFor={`photo-${position}`} className="text-xs font-normal">
                {POSITION_LABEL[position]}
              </Label>
              <Input
                id={`photo-${position}`}
                name={`photo-${position}`}
                type="file"
                accept="image/*"
                className="h-8 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
              />
            </div>
          ))}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="photo-OTHER" className="text-xs font-normal">
              {POSITION_LABEL.OTHER} (boleh lebih dari satu)
            </Label>
            <Input
              id="photo-OTHER"
              name="photo-OTHER"
              type="file"
              multiple
              accept="image/*"
              className="h-8 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
          </div>
        </div>
        {fields.photos ? (
          <p className="text-xs font-medium text-danger" role="alert">
            {fields.photos}
          </p>
        ) : null}
      </fieldset>

      <Button
        type="submit"
        disabled={saving || readOnly || !canRecord}
        className="w-full bg-accent text-accent-foreground hover:bg-accent-hover"
      >
        <ClipboardList aria-hidden />
        {saving ? "Menyimpan…" : `Simpan checklist ${TYPE_LABEL[type].toLowerCase()}`}
      </Button>
    </form>
  )
}
