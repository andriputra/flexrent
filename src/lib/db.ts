import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Database berada di server lain, jadi satu bolak-balik query bisa memakan detik
 * dan transaksi interaktif default (5 detik) terputus di tengah jalan.
 */
export const TX_OPTIONS = { timeout: 20_000, maxWait: 10_000 }
