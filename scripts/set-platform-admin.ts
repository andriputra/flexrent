// Alat operasional: memberi atau mencabut akses super-admin platform.
// Pemakaian (dari Git Bash di laptop/mesin database):
//   npm run account:platform-admin -- "email@rental.id" on
import { PrismaClient } from "@prisma/client"

async function main() {
  const [email, value] = process.argv.slice(2)
  const normalized = email?.trim().toLowerCase()
  if (!normalized || !["on", "off"].includes(value)) {
    console.error('Pemakaian: npm run account:platform-admin -- "email@rental.id" on|off')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } })
    if (!user) {
      console.error(`Akun ${normalized} tidak ada di basis data ini.`)
      process.exit(1)
    }
    await prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: value === "on" } })
    console.log(`Akses platform-admin untuk ${normalized}: ${value === "on" ? "aktif" : "dicabut"}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
