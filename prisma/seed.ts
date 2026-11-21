import { PrismaClient, type PlanCode } from "@prisma/client"

const prisma = new PrismaClient()

const DAY = 86_400_000

function day(offset: number, hour = 9) {
  const date = new Date(Date.now() + offset * DAY)
  date.setHours(hour, 0, 0, 0)
  return date
}

function code(n: number) {
  return `BR-${String(n).padStart(4, "0")}`
}

const PLANS: {
  code: PlanCode
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  maxVehicles: number
  maxStaff: number
  sortOrder: number
  features: string[]
}[] = [
  {
    code: "STARTER",
    name: "Starter",
    description: "Untuk rental yang baru pindah dari buku tulis dan WhatsApp.",
    priceMonthly: 99_000,
    priceYearly: 990_000,
    maxVehicles: 10,
    maxStaff: 2,
    sortOrder: 1,
    features: [
      "Halaman publik pemesanan dengan alamat sendiri",
      "Kalender ketersediaan dan penolakan bentrok otomatis",
      "Jadwal perawatan armada",
      "10 kendaraan & 2 akun karyawan",
    ],
  },
  {
    code: "PRO",
    name: "Pro",
    description: "Untuk rental dengan puluhan unit dan transaksi harian padat.",
    priceMonthly: 249_000,
    priceYearly: 2_490_000,
    maxVehicles: 40,
    maxStaff: 8,
    sortOrder: 2,
    features: [
      "Semua fitur Starter",
      "Invoice dan rekonsiliasi pembayaran",
      "Notifikasi WhatsApp ke pelanggan",
      "Data pelanggan lengkap dengan riwayat sewa",
      "40 kendaraan & 8 akun karyawan",
    ],
  },
  {
    code: "BUSINESS",
    name: "Business",
    description: "Untuk rental bertumbuh dan pengelola beberapa brand armada.",
    priceMonthly: 599_000,
    priceYearly: 5_990_000,
    maxVehicles: 150,
    maxStaff: 25,
    sortOrder: 3,
    features: [
      "Semua fitur Pro",
      "Pembayaran online Midtrans",
      "Laporan kinerja armada dan pendapatan",
      "Bantuan prioritas",
      "150 kendaraan & 25 akun karyawan",
    ],
  },
]

const MOTOR = [
  { plate: "D 5124 ABC", brand: "Honda", model: "Beat 110", year: 2023, color: "Hitam", transmission: "MATIC", engineCc: 110, priceDaily: 120_000, priceWeekly: 750_000, priceMonthly: 2_600_000, deposit: 200_000, odometer: 18_400 },
  { plate: "D 3388 XJ", brand: "Yamaha", model: "NMAX 155", year: 2022, color: "Hijau", transmission: "MATIC", engineCc: 155, priceDaily: 150_000, priceWeekly: 950_000, priceMonthly: 3_300_000, deposit: 300_000, odometer: 26_900 },
  { plate: "D 4471 KM", brand: "Honda", model: "Vario 160", year: 2024, color: "Putih", transmission: "MATIC", engineCc: 160, priceDaily: 140_000, priceWeekly: 900_000, priceMonthly: 3_100_000, deposit: 300_000, odometer: 7_250 },
  { plate: "D 2019 LZ", brand: "Suzuki", model: "Satria FP", year: 2021, color: "Merah", transmission: "MANUAL", engineCc: 150, priceDaily: 130_000, priceWeekly: 830_000, priceMonthly: 2_900_000, deposit: 250_000, odometer: 41_300 },
  { plate: "D 6612 QR", brand: "Honda", model: "PCX 160", year: 2023, color: "Abu-abu", transmission: "MATIC", engineCc: 160, priceDaily: 180_000, priceWeekly: 1_150_000, priceMonthly: 4_000_000, deposit: 400_000, odometer: 15_100 },
  { plate: "D 8830 TS", brand: "Yamaha", model: "Fazzio 125", year: 2024, color: "Biru", transmission: "MATIC", engineCc: 125, priceDaily: 135_000, priceWeekly: 860_000, priceMonthly: 3_000_000, deposit: 250_000, odometer: 5_600 },
] as const

const MOBIL = [
  { plate: "B 1937 KZA", brand: "Toyota", model: "Avanza", year: 2021, color: "Silver", transmission: "MANUAL", engineCc: 1300, seats: 7, priceDaily: 385_000, priceWeekly: 2_400_000, priceMonthly: 9_500_000, deposit: 1_000_000, odometer: 62_000 },
  { plate: "D 1122 BOP", brand: "Daihatsu", model: "Xenia", year: 2020, color: "Merah", transmission: "MANUAL", engineCc: 1300, seats: 7, priceDaily: 350_000, priceWeekly: 2_200_000, priceMonthly: 8_800_000, deposit: 1_000_000, odometer: 78_500 },
  { plate: "D 7788 ZUL", brand: "Honda", model: "Brio Satya", year: 2022, color: "Kuning", transmission: "MATIC", engineCc: 1200, seats: 5, priceDaily: 320_000, priceWeekly: 2_050_000, priceMonthly: 8_200_000, deposit: 750_000, odometer: 44_300 },
  { plate: "D 9090 INI", brand: "Toyota", model: "Innova Reborn", year: 2019, color: "Hitam", transmission: "MANUAL", engineCc: 2000, seats: 7, priceDaily: 650_000, priceWeekly: 4_100_000, priceMonthly: 16_000_000, deposit: 1_500_000, odometer: 112_400 },
] as const

const CUSTOMERS = [
  { name: "Rizky Ananda", phone: "081220114455", email: "rizky@example.com", city: "Bandung", address: "Jl. Cihampelas No. 8" },
  { name: "Siti Marlina", phone: "081322556677", email: "siti@example.com", city: "Bandung", address: "Jl. Surapati No. 21" },
  { name: "Bagas Prasetyo", phone: "085744332211", email: null, city: "Cimahi", address: "Perumahan Cimahi Indah Blok C2" },
  { name: "Dewi Anggraini", phone: "082112345678", email: "dewi@example.com", city: "Bandung", address: "Jl. Buah Batu No. 45" },
  { name: "Fajar Ramadhan", phone: "083812341234", email: null, city: "Bandung", address: null },
]

const BOOKINGS: {
  vehicle: number
  customer: number
  from: number
  to: number
  status: "PENDING" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED"
  payment: "UNPAID" | "PARTIAL" | "PAID"
}[] = [
  { vehicle: 0, customer: 0, from: -21, to: -18, status: "COMPLETED", payment: "PAID" },
  { vehicle: 2, customer: 1, from: -14, to: -7, status: "COMPLETED", payment: "PAID" },
  { vehicle: 6, customer: 3, from: -10, to: -3, status: "COMPLETED", payment: "PAID" },
  { vehicle: 1, customer: 2, from: -3, to: 2, status: "ONGOING", payment: "PARTIAL" },
  { vehicle: 7, customer: 3, from: -1, to: 4, status: "ONGOING", payment: "PAID" },
  { vehicle: 3, customer: 0, from: 3, to: 5, status: "CONFIRMED", payment: "PAID" },
  { vehicle: 5, customer: 4, from: 5, to: 12, status: "CONFIRMED", payment: "PARTIAL" },
  { vehicle: 9, customer: 1, from: 8, to: 10, status: "PENDING", payment: "UNPAID" },
  { vehicle: 4, customer: 2, from: 12, to: 13, status: "PENDING", payment: "UNPAID" },
  { vehicle: 8, customer: 4, from: -20, to: -19, status: "CANCELLED", payment: "UNPAID" },
]

async function main() {
  console.log("Mengisi data awal Flexrent…")

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxVehicles: plan.maxVehicles,
        maxStaff: plan.maxStaff,
        sortOrder: plan.sortOrder,
        features: plan.features,
        isPublic: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxVehicles: plan.maxVehicles,
        maxStaff: plan.maxStaff,
        sortOrder: plan.sortOrder,
        features: plan.features,
      },
    })
  }

  const ownerEmail = "demo@flexrent.local"
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Pemilik Demo", emailVerified: new Date() },
    create: { email: ownerEmail, name: "Pemilik Demo", emailVerified: new Date() },
  })

  const starter = await prisma.plan.findUniqueOrThrow({ where: { code: "STARTER" } })

  const tenant = await prisma.tenant.upsert({
    where: { slug: "bandung-ride" },
    update: { name: "Bandung Ride Rental", city: "Bandung", phone: "081234567890" },
    create: {
      name: "Bandung Ride Rental",
      slug: "bandung-ride",
      city: "Bandung",
      phone: "081234567890",
      address: "Jl. Dago No. 12, Bandung",
      email: "halo@bandungride.example",
    },
  })

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: "OWNER", isActive: true },
    create: { tenantId: tenant.id, userId: owner.id, role: "OWNER" },
  })

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      planId: starter.id,
      status: "TRIALING",
      trialEndsAt: day(14),
      currentPeriodStart: new Date(),
      currentPeriodEnd: day(14),
    },
    create: {
      tenantId: tenant.id,
      planId: starter.id,
      status: "TRIALING",
      trialEndsAt: day(14),
      currentPeriodStart: new Date(),
      currentPeriodEnd: day(14),
    },
  })

  // Baris demo dibuat ulang tiap kali seed dijalankan agar rentang waktu tetap relatif terhadap hari ini.
  await prisma.booking.deleteMany({ where: { tenantId: tenant.id } })
  await prisma.maintenancePlan.deleteMany({ where: { tenantId: tenant.id } })
  await prisma.vehicle.deleteMany({ where: { tenantId: tenant.id } })
  await prisma.customer.deleteMany({ where: { tenantId: tenant.id } })

  const customers = []
  for (const customer of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: { tenantId: tenant.id, ...customer } }))
  }

  const vehicles = []
  for (const item of [...MOTOR, ...MOBIL]) {
    // Tarif denda keterlambatan per kendaraan. Satu motor sengaja dibiarkan kosong
    // supaya form pengembalian menampilkan saran Rp 0 dan angkanya diisi manual.
    let lateFeeDaily: number | null = "seats" in item ? 250_000 : 50_000
    if (item.plate === "D 2019 LZ") lateFeeDaily = null
    vehicles.push(
      await prisma.vehicle.create({
        data: {
          tenantId: tenant.id,
          type: "seats" in item ? "MOBIL" : "MOTOR",
          plate: item.plate,
          brand: item.brand,
          model: item.model,
          year: item.year,
          color: item.color,
          transmission: item.transmission,
          fuelType: "PETROL",
          engineCc: item.engineCc,
          seats: "seats" in item ? item.seats : null,
          hasDriver: "seats" in item,
          driverFee: "seats" in item ? 150_000 : 0,
          priceDaily: item.priceDaily,
          priceWeekly: item.priceWeekly,
          priceMonthly: item.priceMonthly,
          deposit: item.deposit,
          odometer: item.odometer,
          lateFeeDaily,
          status: "AVAILABLE",
          description:
            "Kondisi prima, helm dua, dan tool kit lengkap. Servis rutin tercatat di jadwal perawatan.",
        },
      })
    )
  }

  // Indeks kendaraan: 0-5 motor, 6-9 mobil. Hanya unit tanpa pesanan aktif yang dijadwalkan servis.
  const maintenance = [
    { vehicle: 2, title: "Ganti oli + servis ringan", from: -1, to: 1, notes: "Bengkel Jaya, Jl. AH Nasution" },
    { vehicle: 0, title: "Servis berkala 20.000 km", from: 3, to: 4, notes: "Sudah janjian dengan bengkel resmi Honda" },
    { vehicle: 8, title: "Ganti ban depan", from: -6, to: -5, notes: "Selesai, nota tersimpan di arsip", isDone: true },
  ]

  for (const plan of maintenance) {
    await prisma.maintenancePlan.create({
      data: {
        tenantId: tenant.id,
        vehicleId: vehicles[plan.vehicle].id,
        title: plan.title,
        startsAt: day(plan.from, 9),
        endsAt: day(plan.to, 16),
        notes: plan.notes,
        isDone: "isDone" in plan ? Boolean(plan.isDone) : false,
      },
    })
  }

  let counter = 1
  for (const booking of BOOKINGS) {
    const vehicle = vehicles[booking.vehicle]
    const customer = customers[booking.customer]
    const startsAt = day(booking.from, 9)
    const endsAt = day(booking.to, 9)
    const days = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / DAY))
    const rentalAmount = days * vehicle.priceDaily
    const withDriver = vehicle.type === "MOBIL" && booking.customer % 2 === 0
    const driverFee = withDriver ? days * vehicle.driverFee : 0
    // Sama seperti penawaran di halaman publik: deposit ikut dihitung dalam totalAmount.
    const totalAmount = rentalAmount + driverFee + vehicle.deposit
    const rentDue = rentalAmount + driverFee
    const rentPaid =
      booking.payment === "PAID" ? rentDue : booking.payment === "PARTIAL" ? Math.round(rentDue * 0.5) : 0
    // Deposit baru dianggap dipegang kalau uangnya benar-benar masuk.
    const depositTaken = booking.payment === "PAID" ? vehicle.deposit : 0
    const method = booking.payment === "PAID" ? "BANK_TRANSFER" : "CASH"

    const created = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        code: code(counter++),
        vehicleId: vehicle.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        startsAt,
        endsAt,
        days,
        status: booking.status,
        paymentStatus: booking.payment,
        deliveryMode: booking.customer % 3 === 0 ? "DELIVERY" : "SELF_PICKUP",
        deliveryArea: booking.customer % 3 === 0 ? "Bandung Kota" : null,
        deliveryFee: 0,
        withDriver,
        driverFee,
        rentalAmount,
        depositAmount: vehicle.deposit,
        totalAmount,
        paidAmount: rentPaid,
        depositStatus: booking.status === "COMPLETED" ? "REFUNDED" : "HELD",
        cancelledAt: booking.status === "CANCELLED" ? new Date(startsAt.getTime() - DAY) : null,
        cancelReason:
          booking.status === "CANCELLED" ? "Pelanggan membatalkan karena perubahan jadwal." : null,
      },
    })

    // Uang masuk ditulis sebagai baris pembayaran, bukan hanya kolom, supaya halaman
    // pembayaran, detail booking, dan ringkasan pelanggan memakai angka yang sama.
    if (rentPaid > 0) {
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          bookingId: created.id,
          kind: "RENTAL",
          method,
          status: "SETTLED",
          amount: rentPaid,
          paidAt: startsAt,
          recordedById: owner.id,
          notes: booking.payment === "PARTIAL" ? "Uang muka sewa" : "Pembayaran sewa lunas",
        },
      })
    }
    if (depositTaken > 0) {
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          bookingId: created.id,
          kind: "DEPOSIT",
          method,
          status: "SETTLED",
          amount: depositTaken,
          paidAt: startsAt,
          recordedById: owner.id,
          notes: "Deposit diterima saat serah-terima",
        },
      })
    }
    if (depositTaken > 0 && booking.status === "COMPLETED") {
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          bookingId: created.id,
          kind: "DEPOSIT",
          method,
          status: "REFUNDED",
          amount: depositTaken,
          paidAt: new Date(endsAt.getTime() + 2 * 60 * 60 * 1000),
          recordedById: owner.id,
          notes: "Deposit dikembalikan saat kendaraan kembali",
        },
      })
    }

    // Checklist kondisi untuk pesanan yang sudah diambil, supaya halaman detail
    // langsung punya data sebelum/sesudah. Waktu pencatatan sengaja didekatkan ke
    // jadwal agar demo tidak menampilkan keterlambatan palsu.
    if (booking.status === "ONGOING" || booking.status === "COMPLETED") {
      await prisma.handover.create({
        data: {
          bookingId: created.id,
          tenantId: tenant.id,
          type: "PICKUP",
          odometer: vehicle.odometer,
          fuelLevel: "FULL",
          conditionNotes: "Kondisi prima, helm dua, bahan bakar penuh.",
          recordedById: owner.id,
          createdAt: startsAt,
        },
      })
    }
    if (booking.status === "COMPLETED") {
      await prisma.handover.create({
        data: {
          bookingId: created.id,
          tenantId: tenant.id,
          type: "RETURN",
          odometer: (vehicle.odometer ?? 0) + days * 45,
          fuelLevel: "HALF",
          conditionNotes: "Dibersihkan sebelum kembali, mesin normal.",
          damageNotes: booking.vehicle === 6 ? "Baret halus di pintu kiri, tidak dikenakan biaya." : null,
          recordedById: owner.id,
          createdAt: new Date(endsAt.getTime() + 2 * 60 * 60 * 1000),
        },
      })
    }

    // Status kendaraan mengikuti pesanan yang sedang berjalan agar dashboard langsung masuk akal.
    if (booking.status === "ONGOING") {
      await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status: "RENTED" } })
    }
  }

  // Unit yang sedang di bengkel ikut ditandai agar dashboard konsisten dengan kalender.
  await prisma.vehicle.update({
    where: { id: vehicles[2].id },
    data: { status: "MAINTENANCE" },
  })

  console.log(
    `Selesai: ${vehicles.length} kendaraan, ${customers.length} pelanggan, ${BOOKINGS.length} pesanan.`
  )
  console.log(`Masuk sebagai ${ownerEmail} lewat tautan email (lihat terminal).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
