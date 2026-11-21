import Link from "next/link"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CtaBanner } from "@/components/marketing/cta-banner"
import { getPublicPlans } from "@/server/queries/plans"
import { formatRupiah, formatRupiahShort } from "@/lib/format"

export const metadata = {
  title: "Flexrent — Kelola rental motor & mobil dalam satu tempat",
}

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
    description:
      "Data antar rental terpisah. Karyawan Anda hanya melihat armada milik sendiri.",
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

export default async function MarketingHome() {
  const plans = await getPublicPlans()
  const cheapest = plans.reduce<number | null>(
    (min, plan) => (min === null || plan.priceMonthly < min ? plan.priceMonthly : min),
    null
  )

  return (
    <>
      <section className="page-container grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="space-y-6">
          <Badge variant="secondary" className="border-transparent bg-accent/15 text-accent-foreground">
            Coba gratis 14 hari · tanpa kartu kredit
          </Badge>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Rental motor &amp; mobil berjalan rapi, tanpa spreadsheet campur grup WhatsApp.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Flexrent adalah sistem penyewaan untuk usaha rental lokal: kelola armada, ketersediaan,
            perawatan, pelanggan, dan pembayaran dalam satu dashboard — plus halaman pemesanan publik
            ber-alamat sendiri.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent-hover">
              <Link href="/login?mode=register">
                Mulai gratis
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/harga">Lihat harga paket</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {cheapest !== null ? (
              <>
                Mulai {formatRupiah(cheapest)}/bulan · {plans.length} paket sesuai besar armada
              </>
            ) : (
              "Sesuai besar armada Anda"
            )}
          </p>
        </div>

        <Card className="shadow-pop">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search aria-hidden className="size-4 text-muted-foreground" />
              Cek ketersediaan
            </CardTitle>
            <CardDescription>Tampilan yang dilihat pelanggan Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Honda Beat 2023", plate: "D 5124 ABC", price: 120_000, status: "Tersedia" },
              { name: "Toyota Avanza 2021", plate: "B 1937 KZA", price: 385_000, status: "Tersedia" },
              { name: "Yamaha NMAX 2022", plate: "D 3388 XJ", price: 150_000, status: "Sedang disewa" },
            ].map((item) => (
              <div
                key={item.plate}
                className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="font-mono text-xs tracking-wider text-muted-foreground">{item.plate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatRupiahShort(item.price)}
                    <span className="text-xs font-normal text-muted-foreground"> /hari</span>
                  </p>
                  <p
                    className={
                      item.status === "Tersedia"
                        ? "text-xs text-success"
                        : "text-xs text-info"
                    }
                  >
                    {item.status}
                  </p>
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Contoh tampilan. Armada, tarif, dan status mengikuti data rental Anda.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="fitur" className="border-t bg-card/50 py-16">
        <div className="page-container space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold sm:text-3xl">Semua yang dibutuhkan rental harian</h2>
            <p className="text-muted-foreground">
              Fokus pada unit yang jalan dan pelanggan yang puas — bagian administratifnya dijalankan
              sistem.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="shadow-card">
                  <CardHeader className="gap-3 pb-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="page-container py-16">
        <div className="space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold sm:text-3xl">Mulai dalam tiga langkah</h2>
            <p className="text-muted-foreground">
              Tidak perlu impor besar-besaran. Tambahkan kendaraan yang paling sering keluar dulu.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full shadow-card">
                  <CardHeader className="gap-3 pb-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {index + 1}
                    </span>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
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
