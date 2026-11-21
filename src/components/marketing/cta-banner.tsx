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
    <section className="page-container py-16">
      <div className="rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="max-w-xl text-sm text-primary-foreground/80">{description}</p>
          </div>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent-hover">
            <Link href="/login?mode=register">
              {actionLabel}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
