import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // Satu writer saja: dua pesanan paralel berebut jendela tanggal yang sama dan
  // pembatasan laju booking dihitung per alamat IP.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Rute App Router baru dikompilasi saat pertama disentuh, jadi server pengembangan
  // butuh jauh lebih lama daripada timeout default sebelum menjawab permintaan pertama.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
})
