import Link from "next/link"
import type { CSSProperties } from "react"
import { Check, Minus } from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CtaBanner } from "@/components/marketing/cta-banner"
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

export default async function PricingPage() {
  const plans = await getPublicPlans()
  const favorite = plans.find((plan) => plan.code === "PRO") ?? plans[1] ?? plans[0]

  return (
    <>
      <section className="page-container space-y-6 py-14">
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            14 hari pertama gratis
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Harga yang mengikuti besar armada
          </h1>
          <p className="text-muted-foreground">
            Satu langganan untuk satu rental: dashboard, halaman publik, dan seluruh kendaraan di dalamnya.
            Tidak ada biaya per pesanan — Anda bayar sesuai paket, bukan sesuai transaksi.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const featured = plan.code === favorite?.code
            const perDay = plan.priceMonthly / 30
            return (
              <Card
                key={plan.code}
                style={{ "--i": index } as CSSProperties}
                className={cn("reveal h-full", featured ? "border-accent shadow-pop" : "shadow-card")}
              >
                <CardHeader className="gap-2 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {featured ? <Badge className="bg-accent text-accent-foreground">Paling dipilih</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1">
                    <p className="text-3xl font-bold tabular-nums">{formatRupiah(plan.priceMonthly)}</p>
                    <p className="text-sm text-muted-foreground">
                      per bulan · sekitar {formatRupiah(Math.round(perDay))}/hari
                    </p>
                    {plan.priceYearly ? (
                      <p className="text-xs text-success tabular-nums">
                        {formatRupiah(plan.priceYearly)}/tahun — hemat sekitar{" "}
                        {formatRupiah(plan.priceMonthly * 12 - plan.priceYearly)}
                      </p>
                    ) : null}
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <dt className="text-muted-foreground">Kendaraan</dt>
                      <dd className="font-semibold tabular-nums">
                        {BATA_ANAK.format(plan.maxVehicles)} unit
                      </dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-muted-foreground">Akun karyawan</dt>
                      <dd className="font-semibold tabular-nums">{plan.maxStaff} orang</dd>
                    </div>
                  </dl>

                  <ul className="space-y-2 text-sm">
                    {fiturList(plan.features).map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={
                      featured
                        ? "w-full bg-accent text-accent-foreground hover:bg-accent-hover"
                        : "w-full"
                    }
                    variant={featured ? "default" : "outline"}
                  >
                    <Link href={`/login?mode=register&plan=${plan.code}`}>
                      Mulai dengan {plan.name}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="page-container pb-16">
        <div className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold">Perbandingan fitur</h2>
            <p className="text-muted-foreground">
              Semua paket mendapat pembaruan sistem dan penyimpanan data terpisah per rental.
            </p>
          </div>

          <div className="reveal overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Fitur</TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan.code} className="text-center">
                      {plan.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERBANDINGAN.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-sm font-medium">{row.label}</TableCell>
                    {plans.map((plan) => {
                      const nilai = row.nilai[plan.code]
                      return (
                        <TableCell key={plan.code} className="text-center">
                          {typeof nilai === "string" ? (
                            <span className="text-sm tabular-nums">{nilai}</span>
                          ) : nilai ? (
                            <Check aria-hidden className="mx-auto size-4 text-success" />
                          ) : (
                            <Minus aria-hidden className="mx-auto size-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Armada Anda melebihi paket? Tulis kebutuhan unit dan cabang ke{" "}
            <a href="mailto:halo@flexrent.id" className="font-medium text-foreground underline-offset-4 hover:underline">
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
