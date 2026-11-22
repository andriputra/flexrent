import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaBanner({
  title,
  description,
  actionLabel = "Mulai gratis",
}: {
  title: string
  description: string
  actionLabel?: string
}) {
  return (
    <section className="page-container py-20 sm:py-24">
      <div className="reveal">
        <div className="sheen relative isolate overflow-hidden rounded-[28px] bg-ink px-6 py-12 text-ink-foreground shadow-[0_45px_90px_-55px_var(--primary)] sm:px-12 sm:py-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="anim-drift absolute -right-28 -top-32 size-[26rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.28),transparent_64%)] blur-[70px]" />
            <div className="anim-drift absolute -bottom-32 -left-24 size-[22rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.24),transparent_64%)] blur-[70px] [--d:-7s]" />
            <div className="bg-ink-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(70%_100%_at_15%_0%,black,transparent_72%)]" />
          </div>

          <div className="flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <h2 className="font-display max-w-xl text-[1.65rem] font-bold leading-tight tracking-tight sm:text-3xl">
                {title}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-11 shrink-0 rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_22px_40px_-16px_var(--accent)]"
            >
              <Link href="/login?mode=register">
                {actionLabel}
                <ArrowRight
                  aria-hidden
                  className="transition-transform duration-300 group-hover/button:translate-x-1"
                />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
