"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

const ORDER = ["light", "dark", "system"] as const
const LABEL: Record<string, string> = {
  light: "Terang",
  dark: "Gelap",
  system: "Ikuti sistem",
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Mengubah tema" disabled />
  }

  const current: (typeof ORDER)[number] =
    theme === "dark" || theme === "system" ? theme : "light"
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  const Icon = current === "dark" ? Moon : current === "system" ? Monitor : Sun

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Tema: ${LABEL[current]}. Klik untuk ganti ke ${LABEL[next]}`}
      title={`Tema: ${LABEL[current]}`}
    >
      <Icon aria-hidden />
    </Button>
  )
}
