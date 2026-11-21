// Alat operasional: memasang kata sandi untuk akun yang sudah ada.
// Pemakaian (dari Git Bash di laptop):
//   npm run account:password -- demo@flexrent.local "sandi baru"
import { PrismaClient } from "@prisma/client"
import { hashPassword, passwordWeakness } from "../src/lib/password"

async function main() {
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Pemakaian: npm run account:password -- "email@rental.id" "sandi baru"')
    process.exit(1)
  }

  const weak = passwordWeakness(password)
  if (weak) {
    console.error(weak)
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const clean = email.trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: clean }, select: { id: true } })
    if (!existing) {
      console.error(`Akun ${clean} tidak ada di basis data ini.`)
      process.exit(1)
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(password) },
    })
    console.log(`Sandi untuk ${clean} sudah dipasang. Masuk lewat /login.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
