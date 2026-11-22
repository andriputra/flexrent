import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight, Car, Check, Minus, Users } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { SpotlightCard } from "@/components/marketing/spotlight-card"
import { CtaBanner } from "@/components/marketing/cta-banner"
import { Eyebrow } from "@/components/marketing/eyebrow"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRupiah } from "@/lib/format"
import { getPublicPlans } from "@/server/queries/plans"

export const metadata = {
  title: "Harga paket",
  description:
    "Harga langganan Flexrent per bulan untuk usaha rental motor dan mobil: paket Starter, Pro, dan Business.",
}

const BATA_ANAK = new Intl.NumberFormat("id-ID")

function fiturList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function order(index: number) {
  return { "--i": index } as CSSProperties
}

const PERBANDINGAN: { label: string; nilai: Record<string, string | boolean> }[] = [
  { label: "Slot kendaraan", nilai: { STARTER: "10", PRO: "40", BUSINESS: "150" } },
  { label: "Akun karyawan", nilai: { STARTER: "2", PRO: "8", BUSINESS: "25" } },
  { label: "Halaman publik pemesanan", nilai: { STARTER: true, PRO: true, BUSINESS: true } },
  { label: "Kalender ketersediaan & blokir bentrok", nilai: { STARTER: true, PRO: true, BUSINESS: true } },
  { label: "Jadwal perawatan armada", nilai: { STARTER: true, PRO: true, BUSINESS: true } },
  { label: "Invoice & rekonsiliasi pembayaran", nilai: { STARTER: false, PRO: true, BUSINESS: true } },
  { label: "Notifikasi WhatsApp ke pelanggan", nilai: { STARTER: false, PRO: true, BUSINESS: true } },
  { label: "Bantuan prioritas", nilai: { STARTER: false, PRO: false, BUSINESS: true } },
]

const TERANG = {
  card: "border border-border/70 bg-card text-card-foreground shadow-card hover:border-accent/40 hover:shadow-pop",
  name: "text-lg font-semibold tracking-tight",
  desc: "mt-1.5 text-sm leading-relaxed text-muted-foreground",
  price: "text-card-foreground",
  unit: "text-muted-foreground",
  meta: "text-muted-foreground",
  save: "bg-success/10 text-success",
  chip: "border-border/70 bg-muted/40",
  chipIcon: "bg-primary/[0.08] text-primary ring-primary/10",
  chipLabel: "text-muted-foreground",
  chipValue: "text-foreground",
  check: "bg-success/10 text-success",
  row: "text-card-foreground",
}

const TINTA = {
  card:
    "border border-white/12 bg-ink bg-[radial-gradient(125%_92%_at_50%_0%,rgb(245_158_11/0.16),transparent_58%)] text-ink-foreground shadow-pop hover:border-accent/45",
  name: "text-lg font-semibold tracking-tight text-ink-foreground",
  desc: "mt-1.5 text-sm leading-relaxed text-ink-muted",
  price: "text-ink-foreground",
  unit: "text-ink-muted",
  meta: "text-ink-muted",
  save: "bg-[#5ee79b]/15 text-[#5ee79b]",
  chip: "border-white/10 bg-white/[0.045]",
  chipIcon: "bg-white/[0.08] text-ink-foreground ring-white/10",
  chipLabel: "text-ink-muted",
  chipValue: "text-ink-foreground",
  check: "bg-[#5ee79b]/15 text-[#5ee79b]",
  row: "text-ink-foreground/90",
}

export default async function PricingPage() {
  const plans = await getPublicPlans()
  const favorite = plans.find((plan) => plan.code === "PRO") ?? plans[1] ?? plans[0]

  return (
    <>
      <section className="relative isolate overflow-hidden border-b bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="anim-drift absolute -top-52 right-[-12%] size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.16),transparent_62%)] blur-[70px]" />
          <div className="anim-drift absolute -bottom-64 left-[-14%] size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.12),transparent_62%)] blur-[70px] [--d:-8s]" />
          <div className="bg-grid absolute inset-0 opacity-80 [mask-image:radial-gradient(70%_70%_at_50%_0%,black,transparent_78%)]" />
        </div>

        <div className="page-container space-y-5 py-16 sm:py-20">
          <div className="anim-rise">
            <Eyebrow>Harga</Eyebrow>
          </div>
          <h1 className="anim-rise mt-2 max-w-[24ch] text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-[2.6rem] [--d:90ms]">
            Harga yang mengikuti besar armada
          </h1>
          <p className="anim-rise max-w-2xl text-base leading-relaxed text-muted-foreground [--d:180ms]">
            Satu langganan untuk satu rental: dashboard, halaman publik, dan seluruh kendaraan di
            dalamnya. Tidak ada biaya per pesanan — Anda bayar sesuai paket, bukan sesuai transaksi.
          </p>
          <p className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-medium text-accent [--d:260ms]">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            14 hari pertama gratis
          </p>
        </div>
      </section>

      <section className="page-container -mt-10 grid gap-5 pb-4 pt-10 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const featured = plan.code === favorite?.code
          const tone = featured ? TINTA : TERANG
          const perDay = plan.priceMonthly / 30
          const hemat = plan.priceYearly ? plan.priceMonthly * 12 - plan.priceYearly : 0
          return (
            <div key={plan.code} className="reveal" style={order(index)}>
              <SpotlightCard
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1.5",
                  tone.card
                )}
              >
                {featured ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"
                  />
                ) : null}

                <div className="flex items-start justify-between gap-3">
                  <h2 className={tone.name}>{plan.name}</h2>
                  {featured ? (
                    <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[0.68rem] font-semibold text-accent-foreground">
                      Paling dipilih
                    </span>
                  ) : null}
                </div>
                <p className={cn("max-w-[34ch]", tone.desc)}>{plan.description}</p>

                <div className="mt-6">
                  <p className="flex items-baseline gap-1.5">
                    <span className={cn("text-[2.1rem] font-extrabold leading-none tabular-nums tracking-tight", tone.price)}>
                      {formatRupiah(plan.priceMonthly)}
                    </span>
                    <span className={cn("text-sm font-medium", tone.unit)}>per bulan</span>
                  </p>
                  <p className={cn("mt-2 text-sm tabular-nums", tone.meta)}>
                    sekitar {formatRupiah(Math.round(perDay))}/hari
                  </p>
                  {plan.priceYearly ? (
                    <p
                      className={cn(
                        "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                        tone.save
                      )}
                    >
                      {formatRupiah(plan.priceYearly)}/tahun — hemat sekitar {formatRupiah(hemat)}
                    </p>
                  ) : null}
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { icon: Car, label: "Kendaraan", value: `${BATA_ANAK.format(plan.maxVehicles)} unit` },
                    { icon: Users, label: "Akun karyawan", value: `${BATA_ANAK.format(plan.maxStaff)} orang` },
                  ].map((stat) => {
                    const Icon = stat.icon
                    return (
                      <div
                        key={stat.label}
                        className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5", tone.chip)}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
                            tone.chipIcon
                          )}
                        >
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <dt className={cn("text-[0.7rem] leading-tight", tone.chipLabel)}>{stat.label}</dt>
                          <dd className={cn("text-sm font-semibold tabular-nums", tone.chipValue)}>
                            {stat.value}
                          </dd>
                        </div>
                      </div>
                    )
                  })}
                </dl>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {fiturList(plan.features).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                          tone.check
                        )}
                      >
                        <Check aria-hidden className="size-3" strokeWidth={2.5} />
                      </span>
                      <span className={cn("text-sm leading-relaxed", tone.row)}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  variant={featured ? "default" : "outline"}
                  className={cn(
                    "mt-7 h-11 w-full rounded-full text-[0.9rem] font-semibold transition-all duration-300 hover:-translate-y-0.5",
                    featured
                      ? "bg-accent text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] hover:bg-accent-hover"
                      : "border-border bg-transparent hover:bg-muted dark:border-input dark:bg-transparent"
                  )}
                >
                  <Link href={`/login?mode=register&plan=${plan.code}`}>
                    Mulai dengan {plan.name}
                    <ArrowRight
                      aria-hidden
                      className="transition-transform duration-300 group-hover/button:translate-x-1"
                    />
                  </Link>
                </Button>
              </SpotlightCard>
            </div>
          )
        })}
      </section>

      <section className="page-container space-y-6 py-16">
        <div className="max-w-2xl space-y-4">
          <Eyebrow>Perbandingan</Eyebrow>
          <h2 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">Perbandingan fitur</h2>
          <p className="text-muted-foreground">
            Semua paket mendapat pembaruan sistem dan penyimpanan data terpisah per rental.
          </p>
        </div>

        <div className="reveal overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-card">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="border-border/70 hover:bg-transparent">
                <TableHead className="w-[280px] px-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Fitur
                </TableHead>
                {plans.map((plan) => (
                  <TableHead
                    key={plan.code}
                    className={cn(
                      "text-center text-sm font-semibold",
                      plan.code === favorite?.code && "bg-accent/[0.06] text-accent"
                    )}
                  >
                    {plan.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERBANDINGAN.map((row) => (
                <TableRow key={row.label} className="border-border/60">
                  <TableCell className="px-5 py-3.5 text-sm font-medium">{row.label}</TableCell>
                  {plans.map((plan) => {
                    const nilai = row.nilai[plan.code]
                    return (
                      <TableCell
                        key={plan.code}
                        className={cn(
                          "py-3.5 text-center",
                          plan.code === favorite?.code && "bg-accent/[0.04]"
                        )}
                      >
                        {typeof nilai === "string" ? (
                          <span className="text-sm font-semibold tabular-nums">{nilai}</span>
                        ) : nilai ? (
                          <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-success/10 text-success">
                            <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Minus aria-hidden className="size-3.5" />
                          </span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="reveal flex items-start gap-3.5 rounded-2xl border border-dashed border-border/80 bg-card/60 p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/10">
            <Car aria-hidden className="size-4" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Armada Anda melebihi paket? Tulis kebutuhan unit dan cabang ke{" "}
            <a
              href="mailto:halo@flexrent.id"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              halo@flexrent.id
            </a>{" "}
            — paket khusus multi-cabang disiapkan bersama.
          </p>
        </div>
      </section>

      <CtaBanner
        title="Uji dulu, bayar kemudian"
        description="Sewa 14 hari tanpa tagihan. Setelah habis masa uji, armada tetap aman sampai Anda memilih paket."
        actionLabel="Buat akun rental"
      />
    </>
  )
}
