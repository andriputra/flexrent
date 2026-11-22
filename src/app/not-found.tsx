import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Providers } from "@/components/shared/providers"

export default function NotFound() {
  return (
    <Providers withToaster={false}>
      <div className="page-container flex min-h-dvh items-center justify-center py-16">
        <div className="max-w-md space-y-4 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-6" />
          </span>
          <h1 className="text-2xl leading-8 font-semibold tracking-tight">Halaman tidak ditemukan</h1>
          <p className="text-sm text-muted-foreground">
            Alamat yang dibuka tidak ada di Flexrent. Kembali ke halaman utama atau buka katalog rental.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">Halaman utama</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </Providers>
  )
}
