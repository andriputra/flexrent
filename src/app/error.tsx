"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error)
  }, [error])

  return (
    <div className="page-container flex min-h-dvh items-center justify-center py-16">
      <div className="max-w-md space-y-4 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="size-6" />
        </span>
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">Terjadi kesalahan</h1>
        <p className="text-sm text-muted-foreground">
          Halaman ini gagal dimuat. Coba muat ulang; kalau masih gagal, kembali ke halaman utama.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/">Halaman utama</Link>
          </Button>
          <Button onClick={reset}>Coba lagi</Button>
        </div>
      </div>
    </div>
  )
}
