# Flexrent

SaaS penyewaan motor & mobil untuk rental lokal. Setiap rental (tenant) punya
halaman admin sendiri dan satu halaman publik `/{slug}` untuk menerima pesanan.

Fase yang sudah jalan di repo ini: **Fase 1 (fondasi)** dan **Fase 2 (armada &
perawatan)**. Halaman publik pemesanan, Midtrans, WhatsApp, cron, dan tagihan ada
di fase berikutnya — lihat bagian **Belum dikerjakan**.

## Menjalankan

Prasyarat: Node.js 20+ dan akses ke satu PostgreSQL (dipakai Neon).

```bash
npm install
cp .env.example .env      # isi DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:deploy         # atau: npx prisma migrate dev
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`.

Login demo: email `demo@flexrent.local`. Kalau `SMTP_HOST` dibiarkan kosong,
tautan masuk tidak dikirim ke email tapi dicetak ke terminal dalam format

```
[magic link] demo@flexrent.local
http://localhost:3000/api/auth/callback/nodemailer?token=...
```

Salin URL itu ke browser. Halaman `/login/verify` menjelaskan hal yang sama.
Data seed membuat satu tenant `bandung-ride` ("Bandung Ride Rental") dengan 10
kendaraan, 5 pelanggan, 10 pesanan, dan 3 jadwal perawatan. Halaman publik
`/bandung-ride` baru dibuat di Fase 3, jadi untuk melihat armadanya masuk ke
dashboard.

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | dev server (Turbopack) |
| `npm run build` / `npm start` | build & jalankan produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (pricing, jadwal konversi, konversi tanggal) |
| `npm run db:migrate` | buat migrasi baru saat `schema.prisma` berubah |
| `npm run db:deploy` | terapkan migrasi ke database target |
| `npm run db:seed` | isi data demo (idempoten, menghapus baris demo lama) |
| `npm run db:studio` | Prisma Studio |

## Variabel environment

Semua rahasia lewat environment, tidak ada yang di-hardcode di kode.

- `DATABASE_URL` — endpoint **pooler** Neon (`?sslmode=require&channel_binding=require`,
  dipakai runtime). `DIRECT_URL` — endpoint **direct**, dipakai Prisma supaya
  `CREATE EXTENSION` dan `ALTER TABLE` jalan.
- `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` — Auth.js v5. `AUTH_URL` wajib
  cocok dengan URL yang diakses browser, kalau tidak magic link salah host.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — kosong = tombol Google disembunyikan.
- `SMTP_HOST` dkk — kosong = magic link dicetak ke terminal (mode dev).
- `BLOB_READ_WRITE_TOKEN` — kosong = foto kendaraan ditulis ke `public/uploads`.
- `MIDTRANS_*`, `WHATSAPP_*`, `FONNTE_*`, `CRON_SECRET` — cadangan untuk fase
  berikutnya; sudah dideklarasikan supaya deploy tidak perlu mengubah kode.

## Struktur

```
prisma/
  schema.prisma                     model + enum multi-tenant
  migrations/20261121093944_init/   struktur tabel
  migrations/20261121093956_.../    constraint anti-double-booking (btree_gist)
  seed.ts                           data demo
src/
  app/(marketing)/                  landing + /harga
  app/(auth)/                       /login, /login/verify, /onboarding
  app/(dashboard)/dashboard/        ringkasan, armada, perawatan
  app/api/auth/[...nextauth]/       route handler Auth.js
  components/                       ui/ (primitif), shared/, dashboard/, vehicles/,
                                    maintenance/, auth/, marketing/
  lib/
    auth.ts                         konfigurasi Auth.js + magic link
    tenant.ts                       getTenantContext / requireTenant / requireWritable
    db.ts                           Prisma client singleton
    pricing.ts                      harga termurah harian/mingguan/bulanan
    schedule.ts                     konversi durasi <-> tanggal, bentrok slot
    datetime.ts                     semua perhitungan tanggal pakai WIB
    result.ts                       kontrak ActionResult untuk server action
    storage.ts                      Vercel Blob dengan fallback lokal
    validators/                     skema Zod
  server/
    actions/                        tulis (FormData masuk, ActionResult keluar)
    queries/                        baca (selalu difilter tenantId)
```

## Cara kerja multi-tenant

- `requireTenant()` (src/lib/tenant.ts) mengembalikan sesi + membership +
  subscription + plan, atau melempar redirect ke `/login` / `/onboarding`.
  Dipakai di setiap halaman dashboard dan di awal setiap server action.
- `tenantId` **tidak pernah** dibaca dari input klien. Action mengambilnya dari
  konteks, lalu `where: { id, tenantId }` — milik tenant lain tidak tersentuh.
- `context.canManage` (OWNER/STAFF) menentukan hak ubah, `context.isReadOnly`
  (PAST_DUE/CANCELED) membuat seluruh form dikunci tapi tetap bisa dibaca.
- `plan.maxVehicles` ditegakkan di action, bukan hanya di UI: menambah kendaraan
  ke-11 di paket Starter ditolak dengan pesan yang menjelaskan batas paket.
  `plan.maxStaff` baru dipakai di halaman harga; penegakannya ikut saat fitur
  undangan staf dibuat.
- Paket aktif menentukan harga yang tampil; `PAST_DUE`/`CANCELED` membuka
  halaman upgrade.

## Anti double booking

Dua lapis:

1. `src/server/actions/...` memeriksa `findConflictingBookings` /
   `findConflictingMaintenance` di dalam transaksi sebelum menulis.
2. `bookings_no_time_overlap` di database: `EXCLUDE USING gist ("vehicleId" WITH
   =, tstzrange("startsAt","endsAt",'[)') WITH &&) WHERE status IN (PENDING,
   CONFIRMED, ONGOING)`. Batas atas eksklusif, jadi sesi yang selesai 10:00 dan
   sesi yang mulai 10:00 di kendaraan sama keduanya boleh; dua tulis yang
   bersentuhan ditolak bahkan saat dua permintaan datang bersamaan.

Rentang perawatan dicek terpisah (`maintenance_plans_period_is_valid` + query
bentrok) karena tabel perawatan tidak ikut constraint booking.

## Desain

Navy `#0B1F3A` + amber `#F59E0B`, Plus Jakarta Sans, radius kartu 16px / input &
tombol 12px, dark mode class strategy. Token didefinisikan sekali di
`src/app/globals.css` (Tailwind v4, `@theme`), jadi warna status (`success`,
`warning`, `info`, `danger`) dipakai konsisten di badge, kalender, dan tombol.

Aturan UI yang sudah diterapkan dan silakan diikuti saat menambah halaman:

- Tabel data: header sticky, kolom aksi tiga titik, filter + pencarian +
  paginasi; di layar sempit tabel bertukar jadi kartu.
- Aksi merusak (hapus) selalu lewat modal konfirmasi, hasilnya lewat toast.
- Semua field ber-`label`, tombol ikon ber-`aria-label`, focus state terlihat,
  animasi menghormati `prefers-reduced-motion`.
- Sidebar bisa diciutkan (tersimpan di localStorage), di mobile diganti bottom
  nav dengan tombol "Lainnya".
- Uang dan tanggal dalam format Indonesia (`Rp 1.500.000`, `Sen, 21 Nov 2026`),
  seluruh perhitungan tanggal memakai WIB lewat `src/lib/datetime.ts`.

## Belum dikerjakan

- Halaman publik `/{slug}`: katalog, form pemesanan, checkout.
- Midtrans di belakang `PaymentProvider`, deposit, invoice, status bayar.
- Notifikasi WhatsApp, cron pengingat & penagihan (`CRON_SECRET`).
- Menu pelanggan, laporan, pengaturan tenant, dan undangan staf.
- Uji end-to-end alur pemesanan; unit test pricing/schedule sudah ada.
