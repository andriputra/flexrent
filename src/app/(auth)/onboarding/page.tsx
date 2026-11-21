import { redirect } from "next/navigation"
import { Bike, CalendarCheck, LayoutDashboard } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OnboardingForm } from "@/components/auth/onboarding-form"
import { auth } from "@/lib/auth"
import { getTenantContext } from "@/lib/tenant"

export const metadata = { title: "Buat rental Anda — Flexrent" }

const LANGKAH = [
  { icon: Bike, label: "Data rental", aktif: true },
  { icon: CalendarCheck, label: "Isi armada", aktif: false },
  { icon: LayoutDashboard, label: "Bagikan halaman publik", aktif: false },
]

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?mode=register")

  const context = await getTenantContext()
  if (context) redirect("/dashboard")

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buat rental Anda</h1>
            <p className="text-sm text-muted-foreground">
              Satu akun untuk satu usaha rental. Data Anda tidak bercampur dengan rental lain, dan karyawan
              hanya melihat armada milik sendiri.
            </p>
          </div>

          <ol className="space-y-3">
            {LANGKAH.map((langkah, index) => {
              const Icon = langkah.icon
              return (
                <li key={langkah.label} className="flex items-center gap-3">
                  <span
                    className={
                      langkah.aktif
                        ? "flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
                        : "flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    }
                  >
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className={langkah.aktif ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                      Langkah {index + 1}: {langkah.label}
                    </p>
                    {!langkah.aktif ? (
                      <p className="text-xs text-muted-foreground">Akan terbuka setelah rental dibuat.</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
            Masa uji 14 hari berjalan otomatis dengan paket Starter (10 kendaraan, 2 akun). Tidak ada
            tagihan sampai masa uji selesai.
          </div>
        </div>

        <Card className="shadow-pop">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Identitas rental</CardTitle>
            <CardDescription>
              Masuk sebagai <span className="font-medium text-foreground">{session.user.email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm email={session.user.email ?? ""} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
