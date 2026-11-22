"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import type { ReactNode } from "react"

/**
 * Default tema ditentukan per permukaan, lewat layout masing-masing: halaman
 * publik rental sengaja dibuka dengan tampilan gelap (warna merek), sedangkan
 * dashboard dan halaman produk ikut preferensi sistem. Pilihan pengunjung yang
 * pernah menyimpan tema selalu mengalahkan default ini.
 */
export function Providers({
  children,
  defaultTheme = "system",
  withToaster = true,
}: {
  children: ReactNode
  defaultTheme?: "system" | "light" | "dark"
  withToaster?: boolean
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
      {/* Halaman 404/error bisa muncul di dalam layout yang sudah memasang Toaster; di sini cukup temanya. */}
      {withToaster ? <Toaster position="top-center" richColors closeButton /> : null}
    </NextThemesProvider>
  )
}
