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
import { TestimonialForm } from "@/components/testimonials/testimonial-form"

export function NewTestimonialDialog({
  vehicles,
  readOnly = false,
}: {
  vehicles: { id: string; label: string }[]
  readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent-hover" disabled={readOnly}>
          <Plus aria-hidden />
          Tulis testimoni
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Testimoni baru</DialogTitle>
          <DialogDescription>
            Ulasan yang ditulis staf langsung masuk halaman publik. Simpan sebagai draf dengan
            mematikan sakelar tampilkan.
          </DialogDescription>
        </DialogHeader>
        <TestimonialForm vehicles={vehicles} readOnly={readOnly} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
