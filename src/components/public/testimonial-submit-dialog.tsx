"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { MessageSquareQuote } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RatingPicker } from "@/components/testimonials/rating"
import {
  TESTIMONIAL_MESSAGE_MAX,
  TESTIMONIAL_MESSAGE_MIN,
  testimonialPublicInput,
} from "@/lib/validators/testimonial"
import { submitTestimonialAction } from "@/server/actions/testimonials"

export const HERO_CHIP =
  "border border-white/15 bg-white/[0.07] text-ink-foreground backdrop-blur hover:bg-white/[0.14] hover:text-ink-foreground"

export function TestimonialSubmitDialog({
  slug,
  vehicles,
  defaultVehicleId,
  triggerLabel = "Kirim ulasan",
  triggerClassName = "border-border/70 bg-card",
}: {
  slug: string
  vehicles: { id: string; label: string }[]
  /** Di halaman detail kendaraan ulasan langsung ditautkan ke armada yang sedang dibuka. */
  defaultVehicleId?: string
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [rating, setRating] = useState(0)
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "ALL")
  const [author, setAuthor] = useState("")
  const [message, setMessage] = useState("")
  // Nama kolom sama seperti jebakan di wizard pemesanan; manusia tidak pernah
  // melihat input ini, jadi isinya dianggap bot oleh server.
  const [honeypot, setHoneypot] = useState("")
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setRating(0)
    setVehicleId(defaultVehicleId ?? "ALL")
    setAuthor("")
    setMessage("")
    setHoneypot("")
    setError(null)
  }

  function submit() {
    setError(null)
    const checked = testimonialPublicInput.safeParse({ vehicleId, author, rating, message })
    if (!checked.success) {
      const pesan = checked.error.issues[0]?.message ?? "Lengkapi isian ulasan."
      setError(pesan)
      toast.error(pesan)
      return
    }

    const payload = new FormData()
    payload.set("slug", slug)
    payload.set("vehicleId", vehicleId === "ALL" ? "" : vehicleId)
    payload.set("author", author)
    payload.set("rating", String(rating))
    payload.set("message", message)
    payload.set("company", honeypot)

    startTransition(async () => {
      const result = await submitTestimonialAction(payload)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success("Terima kasih! Ulasan kamu masuk dan akan tampil setelah ditinjau.")
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <MessageSquareQuote aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kirim ulasan</DialogTitle>
          <DialogDescription>
            Ceritakan pengalaman sewa kamu. Ulasan tampil di halaman ini setelah tim kami meninjau.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="space-y-4"
          noValidate
        >
          {error ? (
            <p
              className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label>Rating</Label>
            <RatingPicker value={rating} onChange={setRating} disabled={pending} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="review-author">Nama kamu</Label>
              <Input
                id="review-author"
                value={author}
                maxLength={60}
                disabled={pending}
                placeholder="Contoh: Andi, pelanggan di Jakarta"
                onChange={(event) => setAuthor(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-vehicle">Kendaraan</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={pending}>
                <SelectTrigger id="review-vehicle" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tidak menyebut kendaraan</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-message">Ulasan</Label>
            <Textarea
              id="review-message"
              rows={4}
              value={message}
              disabled={pending}
              maxLength={TESTIMONIAL_MESSAGE_MAX}
              placeholder="Apa yang bikin penyewaan ini beres?"
              onChange={(event) => setMessage(event.target.value)}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {message.length}/{TESTIMONIAL_MESSAGE_MAX} karakter · minimal{" "}
              {TESTIMONIAL_MESSAGE_MIN}
            </p>
          </div>

          <input
            name="company"
            aria-hidden
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="submit"
              disabled={pending}
              className="bg-accent text-accent-foreground hover:bg-accent-hover"
            >
              {pending ? "Mengirim…" : "Kirim ulasan"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
