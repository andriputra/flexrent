import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  // Unit test murni: jangan memuat postcss.config.mjs (Tailwind v4) milik Next.
  css: { postcss: {} },
  test: {
    include: ["src/**/*.test.ts"],
    env: { TZ: "Asia/Jakarta" },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
})
