import Link from "next/link"
import { Bike, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, PageHeader } from "@/components/shared/layout-parts"
import { VehicleForm } from "@/components/vehicles/vehicle-form"
import { requireTenant } from "@/lib/tenant"
import { countVehicles } from "@/server/queries/vehicles"

export const metadata = { title: "Kendaraan baru — Flexrent" }

export default async function NewVehiclePage() {
  const context = await requireTenant()
  const total = await countVehicles(context.tenant.id)
  const limit = context.plan?.maxVehicles ?? null
  const fleetFull = limit !== null && total >= limit
  const slotsLeft = limit === null ? null : Math.max(0, limit - total)

  return (
    <>
      <PageHeader
        title="Tambah kendaraan"
        description="Isi data armada: spesifikasi, tarif harian/mingguan/bulanan, deposit, dan status."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/vehicles">
              <ChevronLeft aria-hidden />
              Kembali ke armada
            </Link>
          </Button>
        }
      />

      {fleetFull ? (
        <EmptyState
          icon={<Bike aria-hidden />}
          title="Slot armada paket Anda sudah penuh"
          description={`Paket ${context.plan?.name ?? "saat ini"} mengizinkan ${limit} kendaraan. Hapus kendaraan yang tidak dipakai atau upgrade paket untuk menambah armada.`}
          action={
            <>
              <Button asChild variant="outline">
                <Link href="/harga">Bandingkan paket</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/vehicles">Lihat daftar kendaraan</Link>
              </Button>
            </>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Data kendaraan</CardTitle>
              <CardDescription>
                Plat, merek, dan tarif yang Anda isi di sini langsung tampil di halaman publik
                <span className="font-medium text-foreground"> /{context.tenant.slug}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VehicleForm
                readOnly={context.isReadOnly}
                limitNotice={
                  slotsLeft === 1
                    ? "Ini slot terakhir paket Anda. Setelah tersimpan, upgrade paket untuk menambah kendaraan lagi."
                    : null
                }
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Yang perlu Anda siapkan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Foto.</span> Minimal satu foto tampak depan
                  agar kartu armada di halaman publik tidak kosong. Foto bisa diunggah setelah kendaraan
                  tersimpan.
                </p>
                <p>
                  <span className="font-medium text-foreground">Tarif.</span> Isi tarif harian selalu;
                  mingguan dan bulanan opsional tapi mendorong sewa jangka panjang.
                </p>
                <p>
                  <span className="font-medium text-foreground">Deposit.</span> Nominal pengembalian yang
                  ditahan saat serah terima, misalnya Rp 200.000 untuk motor.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
