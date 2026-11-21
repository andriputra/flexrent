"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MaintenanceForm } from "@/components/maintenance/maintenance-form"

export function NewMaintenanceDialog({
  vehicles,
  defaultVehicleId,
  readOnly = false,
}: {
  vehicles: { id: string; label: string }[]
  defaultVehicleId?: string
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent-hover"
          disabled={readOnly}
        >
          <Plus aria-hidden />
          Jadwal perawatan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Jadwal perawatan baru</DialogTitle>
          <DialogDescription>
            Kendaraan yang sedang diperbaiki otomatis tidak dapat dipesan pada rentang ini.
          </DialogDescription>
        </DialogHeader>
        <MaintenanceForm
          vehicles={vehicles}
          defaultVehicleId={defaultVehicleId}
          readOnly={readOnly}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
