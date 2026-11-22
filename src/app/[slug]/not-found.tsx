import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TenantNotFound() {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden py-16">
      <div
        aria-hidden
        className="anim-drift pointer-events-none absolute -top-24 -right-16 -z-10 size-[380px] rounded-full bg-accent/12 blur-3xl motion-reduce:animate-none"
      />
      <div
        aria-hidden
        className="anim-drift pointer-events-none absolute -bottom-28 -left-20 -z-10 size-[340px] rounded-full bg-primary/10 blur-3xl motion-reduce:animate-none [--d:-9s]"
      />
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(100%_80%_at_50%_50%,black,transparent_75%)]"
      />
      <div className="page-container max-w-md space-y-4 text-center">
        <span className="anim-pop mx-auto flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground shadow-card backdrop-blur-sm">
          <SearchX aria-hidden className="size-7" />
        </span>
        <h1 className="anim-rise text-2xl leading-8 font-semibold tracking-tight">Halaman rental tidak ditemukan</h1>
        <p className="anim-rise text-sm leading-6 text-muted-foreground [--d:120ms]">
          Tautan ini mungkin sudah berubah. Periksa kembali alamatnya atau buka halaman utama Flexrent.
        </p>
        <div className="anim-rise pt-1 [--d:200ms]">
          <Button
            asChild
            className="h-10 rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Link href="/">Ke halaman utama</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
