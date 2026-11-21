import Link from "next/link"
import { AlertTriangle, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { diffInCalendarDays, toDayKey } from "@/lib/datetime"
import type { TenantContext } from "@/lib/tenant"

/** Banner trial & read-only (langganan PAST_DUE/CANCELLED). */
export function SubscriptionBanner({ context }: { context: TenantContext }) {
  const { subscription, isReadOnly, readOnlyReason } = context

  if (isReadOnly) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-danger">
              {subscription?.status === "CANCELLED"
                ? "Langganan telah dibatalkan"
                : "Pembayaran langganan belum selesai"}
            </p>
            <p className="text-sm text-muted-foreground">
              {readOnlyReason} Halaman publik untuk sementara tidak menerima pesanan baru.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent-hover">
          <Link href="/harga">Pilih paket langganan</Link>
        </Button>
      </div>
    )
  }

  if (subscription?.status === "TRIALING" && subscription.trialEndsAt) {
    const daysLeft = Math.max(0, diffInCalendarDays(new Date(), subscription.trialEndsAt) + 1)
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <PartyPopper aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              Masa trial {context.plan?.name ?? "Starter"} berakhir {toDayKey(subscription.trialEndsAt)}
            </p>
            <p className="text-sm text-muted-foreground">
              Sisa {daysLeft} hari. Setelah trial selesai, langganan diteruskan otomatis ke paket ini.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="lg">
          <Link href="/harga">Lihat paket</Link>
        </Button>
      </div>
    )
  }

  return null
}
