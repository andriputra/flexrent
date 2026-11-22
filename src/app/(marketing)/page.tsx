import Link from "next/link"
import { Fragment, type CSSProperties } from "react"
import {
  ArrowRight,
  Bike,
  CalendarCheck,
  Car,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { SpotlightCard } from "@/components/marketing/spotlight-card"
import { CtaBanner } from "@/components/marketing/cta-banner"
import { Eyebrow } from "@/components/marketing/eyebrow"
import { getPublicPlans } from "@/server/queries/plans"
import { formatRupiah, formatRupiahShort } from "@/lib/format"

export const metadata = {
  title: "Kelola rental motor & mobil dalam satu tempat",
}

const HERO_TITLE: { text: string; accent?: boolean }[] = [
  { text: "Rental motor & mobil berjalan rapi, tanpa" },
  { text: "spreadsheet campur grup WhatsApp.", accent: true },
]

const FEATURES = [
  {
    icon: Bike,
    title: "Armada motor & mobil",
    description:
      "Plat, tipe, transmisi, tarif harian/mingguan/bulanan, deposit, sampai foto kendaraan tersimpan rapi.",
  },
  {
    icon: CalendarCheck,
    title: "Kalender ketersediaan",
    description:
      "Satu kendaraan tidak bisa dipesan dua kali. Bentrok ditolak sejak level basis data, bukan sekadar notifikasi.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard kerja",
    description:
      "Ringkasan armada, kendaraan yang sedang disewa, dan jadwal servis dalam satu layar saat buka halaman.",
  },
  {
    icon: Car,
    title: "Perawatan terjadwal",
    description:
      "Catat servis dan kunci slot kendaraan selama di bengkel agar tidak kelepasan disewakan.",
  },
  {
    icon: Users,
    title: "Data pelanggan & pesanan",
    description:
      "Identitas penyewa, riwayat pesanan, dan status pembayaran tercatat per rental, tidak tercampur.",
  },
  {
    icon: ShieldCheck,
    title: "Setiap rental punya ruang sendiri",
    description: "Data antar rental terpisah. Karyawan Anda hanya melihat armada milik sendiri.",
  },
]

const STEPS = [
  {
    title: "Daftarkan rental Anda",
    description:
      "Isi nama, kota, dan alamat slug halaman publik. Selesai dalam satu menit, tanpa kartu kredit.",
  },
  {
    title: "Masukkan armada",
    description:
      "Tambahkan motor dan mobil beserta tarif, foto, serta aturan deposit. Paket menentukan jumlah kendaraan.",
  },
  {
    title: "Bagikan halaman pemesanan",
    description:
      "Pelanggan melihat daftar kendaraan beserta harganya di nama-anda.flexrent.id dan mengirim pesanan.",
  },
]

const AVAILABILITY = [
  { kind: "motor", name: "Honda Beat 2023", plate: "D 5124 ABC", price: 120_000, status: "Tersedia" },
  { kind: "mobil", name: "Toyota Avanza 2021", plate: "B 1937 KZA", price: 385_000, status: "Tersedia" },
  { kind: "motor", name: "Yamaha NMAX 2022", plate: "D 3388 XJ", price: 150_000, status: "Sedang disewa" },
]

function order(index: number) {
  return { "--i": index } as CSSProperties
}

function HeroTitle() {
  const words = HERO_TITLE.flatMap((segment) =>
    segment.text.split(" ").map((text) => ({ text, accent: segment.accent }))
  )
  return (
    <h1 className="mt-6 max-w-[20ch] text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-[2.5rem] lg:text-[2.8rem]">
      {words.map((word, index) => (
        <Fragment key={`${word.text}-${index}`}>
          {index === 0 ? null : " "}
          <span
            style={order(index)}
            className={cn("anim-rise inline-block", word.accent && "text-accent")}
          >
            {word.text}
          </span>
        </Fragment>
      ))}
    </h1>
  )
}

export default async function MarketingHome() {
  const plans = await getPublicPlans()
  const cheapest = plans.reduce<number | null>(
    (min, plan) => (min === null || plan.priceMonthly < min ? plan.priceMonthly : min),
    null
  )

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="anim-drift absolute -top-56 right-[-14%] size-[44rem] rounded-full bg-[radial-gradient(circle,rgb(245_158_11/0.24),transparent_62%)] blur-[70px]" />
          <div className="anim-drift absolute bottom-[-30%] left-[-18%] size-[38rem] rounded-full bg-[radial-gradient(circle,rgb(37_99_235/0.22),transparent_62%)] blur-[80px] [--d:-9s]" />
          <div className="bg-ink-grid absolute inset-0 opacity-80 [mask-image:radial-gradient(75%_65%_at_50%_0%,black,transparent_78%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="page-container grid items-center gap-14 py-20 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:py-24">
          <div>
            <span className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium text-ink-foreground/90 backdrop-blur">
              <span aria-hidden className="relative flex size-2 items-center justify-center">
                <span className="anim-ping absolute inset-0 rounded-full bg-accent" />
                <span className="size-1.5 rounded-full bg-accent" />
              </span>
              Coba gratis 14 hari · tanpa kartu kredit
            </span>

            <HeroTitle />

            <p
              style={{ "--d": "480ms" } as CSSProperties}
              className="anim-rise mt-6 max-w-xl text-[0.98rem] leading-relaxed text-ink-muted sm:text-base"
            >
              Flexrent adalah sistem penyewaan untuk usaha rental lokal: kelola armada, ketersediaan,
              perawatan, pelanggan, dan pembayaran dalam satu dashboard — plus halaman pemesanan publik
              ber-alamat sendiri.
            </p>

            <div
              style={{ "--d": "600ms" } as CSSProperties}
              className="anim-rise mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-accent px-5 text-[0.9rem] font-semibold text-accent-foreground shadow-[0_16px_34px_-16px_var(--accent)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_22px_40px_-16px_var(--accent)]"
              >
                <Link href="/login?mode=register">
                  Mulai gratis
                  <ArrowRight
                    aria-hidden
                    className="transition-transform duration-300 group-hover/button:translate-x-1"
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-white/20 bg-transparent px-5 text-[0.9rem] text-ink-foreground hover:bg-white/10 hover:text-ink-foreground dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10 dark:hover:text-ink-foreground"
              >
                <Link href="/harga">Lihat harga paket</Link>
              </Button>
            </div>

            <p
              style={{ "--d": "720ms" } as CSSProperties}
              className="anim-rise mt-6 text-sm text-ink-muted"
            >
              {cheapest !== null ? (
                <>
                  Mulai {formatRupiah(cheapest)}/bulan · {plans.length} paket sesuai besar armada
                </>
              ) : (
                "Sesuai besar armada Anda"
              )}
            </p>
          </div>

          <div className="anim-pop relative [--d:260ms]">
            <div
              aria-hidden
              className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(60%_55%_at_55%_45%,rgb(245_158_11/0.22),transparent_70%)] blur-2xl"
            />
            <div className="anim-float rounded-[26px] border border-white/15 bg-white/[0.07] p-2 shadow-[0_50px_90px_-45px_rgb(2_8_20/0.95)] backdrop-blur-xl">
              <div className="rounded-[20px] border border-white/10 bg-[rgb(8_22_41/0.72)] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-ink-foreground ring-1 ring-white/10">
                    <Search aria-hidden className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">Cek ketersediaan</p>
                    <p className="text-xs text-ink-muted">Tampilan yang dilihat pelanggan Anda.</p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {AVAILABILITY.map((item, index) => {
                    const Icon = item.kind === "motor" ? Bike : Car
                    const available = item.status === "Tersedia"
                    return (
                      <li
                        key={item.plate}
                        style={order(index + 3)}
                        className={cn(
                          "anim-rise group/row flex items-center justify-between gap-3 rounded-2xl border bg-white/[0.035] px-3.5 py-3 transition-all duration-300 hover:bg-white/[0.07]",
                          available
                            ? "border-white/10 hover:border-success/40"
                            : "border-white/10 hover:border-accent/40"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-ink-muted ring-1 ring-white/10 transition-all duration-300 group-hover/row:scale-105 group-hover/row:text-ink-foreground">
                            <Icon aria-hidden className="size-4" />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="font-mono text-[0.68rem] tracking-[0.16em] text-ink-muted">
                              {item.plate}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 space-y-1 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatRupiahShort(item.price)}
                            <span className="text-xs font-normal text-ink-muted"> /hari</span>
                          </p>
                          <p
                            className={cn(
                              "flex items-center justify-end gap-1.5 text-[0.7rem]",
                              available ? "text-success" : "text-accent"
                            )}
                          >
                            <span aria-hidden className="size-1.5 rounded-full bg-current" />
                            {item.status}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <p className="mt-4 border-t border-white/10 pt-3.5 text-[0.7rem] leading-relaxed text-ink-muted">
                  Contoh tampilan. Armada, tarif, dan status mengikuti data rental Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="relative scroll-mt-24 py-20 sm:py-24">
        <div className="page-container">
          <div className="max-w-2xl space-y-4">
            <Eyebrow>Fitur</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.1rem]">
              Semua yang dibutuhkan rental harian
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Fokus pada unit yang jalan dan pelanggan yang puas — bagian administratifnya dijalankan
              sistem.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="reveal" style={order(index)}>
                  <SpotlightCard className="group/card h-full rounded-2xl border border-border/70 bg-card p-6 shadow-card transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-pop">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/10 transition-all duration-500 group-hover/card:-translate-y-0.5 group-hover/card:bg-accent/15 group-hover/card:text-accent-hover group-hover/card:ring-accent/25">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="mt-5 text-base font-semibold tracking-tight">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </SpotlightCard>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section
        id="cara-kerja"
        className="relative scroll-mt-24 border-y bg-muted/40 py-20 sm:py-24"
      >
        <div className="page-container">
          <div className="max-w-2xl space-y-4">
            <Eyebrow>Cara kerja</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.1rem]">
              Mulai dalam tiga langkah
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Tidak perlu impor besar-besaran. Tambahkan kendaraan yang paling sering keluar dulu.
            </p>
          </div>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="reveal group/step relative" style={order(index)}>
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-5 top-5 w-px bg-gradient-to-b from-border to-transparent",
                    index === STEPS.length - 1 ? "hidden" : "h-[calc(100%+1.5rem)] md:hidden"
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "reveal-grow absolute left-12 top-5 hidden h-px w-[calc(100%-4px)] bg-gradient-to-r from-border to-transparent md:block",
                    index === STEPS.length - 1 && "hidden"
                  )}
                />
                <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-border bg-card text-sm font-bold tabular-nums text-primary shadow-card transition-all duration-500 group-hover/step:-translate-y-1 group-hover/step:border-accent group-hover/step:bg-accent group-hover/step:text-accent-foreground group-hover/step:shadow-pop">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBanner
        title="Siap merapikan armada Anda?"
        description="Buat akun rental, isi kendaraan, dan bagikan halaman pemesanan hari ini juga. Uji semua fitur paket Pro selama 14 hari."
      />
    </>
  )
}
