import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TenantNotFound() {
  return (
    <div className="page-container flex min-h-dvh items-center justify-center py-16">
      <div className="max-w-md space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX aria-hidden className="size-6" />
        </span>
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">Halaman rental tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">
          Tautan ini mungkin sudah berubah. Periksa kembali alamatnya atau buka halaman utama Flexrent.
        </p>
        <Button asChild>
          <Link href="/">Ke halaman utama</Link>
        </Button>
      </div>
    </div>
  )
}
