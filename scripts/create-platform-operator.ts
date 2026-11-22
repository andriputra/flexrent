// Alat operasional: membuat (atau menaikkan) akun operator platform yang bisa
// masuk ke /admin dan mendaftarkan tenant. Sandi bisa diberikan lewat argumen;
// bila dikosongkan, sandi kuat dibuat otomatis dan dicetak sekali.
// Pemakaian (dari Git Bash di laptop/mesin database):
//   npm run account:operator -- "saha@flexbox.co.id" "Operator Flexrent"
//   npm run account:operator -- "saha@flexbox.co.id" "Operator Flexrent" "sandi sendiri"
import { PrismaClient } from "@prisma/client"
import { generateHandoverPassword, hashPassword, passwordWeakness } from "../src/lib/password"

async function main() {
  const [emailArg, nameArg, passwordArg] = process.argv.slice(2)
  const email = emailArg?.trim().toLowerCase()
  const name = nameArg?.trim()

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Pemakaian: npm run account:operator -- "email@flexbox.co.id" "Nama operator" [sandi]')
    process.exit(1)
  }
  if (!name || name.length < 2) {
    console.error("Nama operator minimal 2 karakter.")
    process.exit(1)
  }
  if (passwordArg) {
    const weak = passwordWeakness(passwordArg)
    if (weak) {
      console.error(weak)
      process.exit(1)
    }
  }

  const prisma = new PrismaClient()
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, isPlatformAdmin: true } })
    if (existing) {
      if (existing.isPlatformAdmin) {
        console.log(`${email} sudah menjadi platform-admin. Sandi tidak diubah — pakai npm run account:password untuk menggantinya.`)
        return
      }
      await prisma.user.update({ where: { id: existing.id }, data: { isPlatformAdmin: true } })
      console.log(`Akses platform-admin dipasang untuk ${email} yang sudah ada. Sandi lamanya tetap berlaku.`)
      return
    }

    const password = passwordArg ?? generateHandoverPassword()
    await prisma.user.create({
      data: { email, name, isPlatformAdmin: true, passwordHash: await hashPassword(password) },
    })
    console.log(`Akun operator ${email} dibuat dengan akses platform-admin.`)
    console.log(`Masuk lewat /login. ${passwordArg ? "Sandi sesuai argumen." : `Sandi awal (sekali tampil): ${password}`}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
