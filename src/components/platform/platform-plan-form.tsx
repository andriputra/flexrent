"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePlatformPlanAction } from "@/server/actions/platform"

type PlanValues = {
  id: string
  priceMonthly: number
  priceYearly: number | null
  maxVehicles: number
  maxStaff: number
  isPublic: boolean
}

export function PlatformPlanForm({ plan }: { plan: PlanValues }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState({
    priceMonthly: String(plan.priceMonthly),
    priceYearly: plan.priceYearly === null ? "" : String(plan.priceYearly),
    maxVehicles: String(plan.maxVehicles),
    maxStaff: String(plan.maxStaff),
    isPublic: plan.isPublic,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set("planId", plan.id)
    formData.set("isPublic", String(values.isPublic))
    startTransition(async () => {
      const result = await updatePlatformPlanAction(formData)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Paket berhasil diperbarui.")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${plan.id}-monthly`}>Bulanan</Label>
        <Input
          id={`${plan.id}-monthly`}
          name="priceMonthly"
          type="number"
          min="0"
          value={values.priceMonthly}
          onChange={(event) => setValues((current) => ({ ...current, priceMonthly: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${plan.id}-yearly`}>Tahunan</Label>
        <Input
          id={`${plan.id}-yearly`}
          name="priceYearly"
          type="number"
          min="0"
          placeholder="Opsional"
          value={values.priceYearly}
          onChange={(event) => setValues((current) => ({ ...current, priceYearly: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${plan.id}-vehicles`}>Maks. kendaraan</Label>
        <Input
          id={`${plan.id}-vehicles`}
          name="maxVehicles"
          type="number"
          min="0"
          value={values.maxVehicles}
          onChange={(event) => setValues((current) => ({ ...current, maxVehicles: event.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${plan.id}-staff`}>Maks. staf</Label>
        <Input
          id={`${plan.id}-staff`}
          name="maxStaff"
          type="number"
          min="0"
          value={values.maxStaff}
          onChange={(event) => setValues((current) => ({ ...current, maxStaff: event.target.value }))}
        />
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={values.isPublic}
            onChange={(event) => setValues((current) => ({ ...current, isPublic: event.target.checked }))}
            className="size-4 rounded border-border accent-[var(--accent)]"
          />
          Tampilkan ke calon tenant
        </label>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Menyimpan…" : "Simpan paket"}
        </Button>
      </div>
    </form>
  )
}
