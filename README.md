# Flexrent

SaaS penyewaan motor & mobil untuk rental lokal. Setiap rental (tenant) punya
halaman admin sendiri dan satu halaman publik `/{slug}` untuk menerima pesanan.

Fase yang sudah jalan di repo ini: **Fase 1 (fondasi)**, **Fase 2 (armada &
perawatan)**, dan **Fase 3 (halaman publik & booking)**. Midtrans, notifikasi
WhatsApp, cron, dan tagihan ada di fase berikutnya — lihat bagian **Belum
dikerjakan**.

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
kendaraan, 5 pelanggan, 10 pesanan, dan 3 jadwal perawatan. Halaman publiknya
sudah aktif di `http://localhost:3000/bandung-ride`.

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
- `BLOB_READ_WRITE_TOKEN` — kosong = foto kendaraan ditulis ke `public/uploads`,
  KTP/SIM ditulis ke `private/uploads` (dua-duanya di-gitignore).
- `DOCUMENT_SECRET` — kunci HMAC untuk tautan berumur 5 menit yang membuka
  KTP/SIM di `/api/dokumen/{id}`. Kosong = memakai `AUTH_SECRET`; ganti nilainya
  kalau `AUTH_SECRET` berubah supaya tautan lama ikut mati.
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
  app/[slug]/                         halaman publik tenant (lihat di bawah)
  app/(marketing)/                  landing + /harga
  app/(auth)/                       /login, /login/verify, /onboarding
  app/(dashboard)/dashboard/        ringkasan, armada, perawatan
  app/api/auth/[...nextauth]/       route handler Auth.js
  app/api/dokumen/[id]/             baca KTP/SIM lewat tautan bertanda tangan
  components/                       ui/ (primitif), shared/, dashboard/, vehicles/,
                                    maintenance/, auth/, marketing/, public/
  lib/
    auth.ts                         konfigurasi Auth.js + magic link
    tenant.ts                       getTenantContext / requireTenant / requireWritable
    tenant-public.ts                resolusi {slug} -> tenant untuk halaman publik
    db.ts                           Prisma client singleton
    pricing.ts                      harga termurah harian/mingguan/bulanan
    quote.ts                        total sewa + sopir + deposit dari tarif DB
    booking-code.ts                 kode BR-YYMM-####
    documents.ts                    tanda tangan HMAC tautan dokumen
    terms.ts                        syarat sewa tenant + fallback
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

## Halaman publik & booking

| Rute | Isi |
| --- | --- |
| `/{slug}` | katalog + pencarian tanggal, filter tipe/transmisi/harga; kendaraan yang sudah terisi pada rentang tanggal disembunyikan dan jumlah yang terisi ditampilkan sebagai catatan |
| `/{slug}/kendaraan/{id}` | galeri 4:3, spesifikasi, kalender ketersediaan 3 bulan, kalkulator harga, syarat sewa, panel aksi menempel |
| `/{slug}/pesan/{id}` | wizard 4 langkah: tanggal → data diri + KTP/SIM → pembayaran → konfirmasi |
| `/{slug}/booking` | cek status pesanan dengan kode + nomor WhatsApp |
| `/{slug}/booking/{code}?phone=08…` | status, timeline, jadwal, total, dan tombol WhatsApp |
| `/api/dokumen/{id}` | hanya dibuka dengan tautan bertanda tangan yang belum kedaluwarsa |

Yang perlu diketahui kalau mengubah bagian ini:

- **Harga tidak dihitung di browser.** `useVehicleQuote` menanyakan
  `quoteVehicleAction` (debounce 250 ms) dan action itu memakai `quoteRental`
  dengan tarif dari database, jadi angka di halaman = angka yang ditulis ke
  booking.
- **Booking ditulis dalam satu transaksi**: cek bentrok, cek jadwal perawatan,
  cek pelanggan yang di-blacklist (`findBlockedCustomer` lewat nomor
  WhatsApp), upsert pelanggan (`tenantId + phone`), simpan dokumen, baru
  `booking.create`. Kode `BR-YYMM-####` diambil dari nomor urut bulan berjalan
  dan diulang sampai unik; kalau transaksi gagal, file yang baru diunggah ikut
  dihapus lagi.
- **KTP/SIM privat.** Filenya tidak pernah muncul di `public/`; hanya rute
  `/api/dokumen/[id]` yang membacanya, dan rute itu menuntut sesi staf dari
  tenant pemilik dokumen **plus** tanda tangan HMAC (`?e=`, `?s=`) yang umur
  defaultnya 5 menit (`DOCUMENT_SECRET` / `AUTH_SECRET`, `timingSafeEqual`).
- **Halaman publik memakai query tanpa nama pelanggan**
  (`getPublicCalendarIntervals`), jadi kalender tidak membocorkan kode booking
  atau nama penyewa.
- **Skeleton dipasang sebagai `<Suspense>` inline, bukan `loading.tsx`.**
  `loading.tsx` di segmen induk ternyata ikut membungkus rute anak, sehingga
  `notFound()` (mis. ID kendaraan salah ketik) terkirim sebagai HTTP 200.
  Sekarang gerbang `notFound()` selalu di atas boundary: katalog membungkus
  hasil filter dengan `CatalogSkeleton`, detail kendaraan membungkus kalender
  dengan `VehicleAvailabilitySkeleton`, dan satu-satunya `loading.tsx` yang
  tersisa ada di `/{slug}/booking/{code}` (rute itu tidak punya gerbang 404).
  Saat menambah halaman publik, jangan menaruh `notFound()` di dalam komponen
  yang dibungkus `<Suspense>`.
- Langganan `PAST_DUE` / `CANCELLED` membuat `acceptingBookings` false: banner
  "sedang tidak menerima pesanan" muncul, kalkulator berhenti, dan
  `createBookingAction` menolak submit dengan pesan yang sama — halaman tetap
  bisa dibaca.

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

Sisa dari Fase 3 (sengaja ditinggal supaya tidak menabrak fase berikutnya):

- Langkah 3 wizard baru menampilkan instruksi transfer/manual; belum ada
  pembayaran online Midtrans di belakang `PaymentProvider`, belum ada invoice
  dan rekonsiliasi status bayar.
- Biaya antar-jemput selalu disimpan `0` sampai pengaturan tenant (area + tarif
  antar) dibuat.
- Unggah KTP/SIM masih opsional, dan tautan bertanda tangan
  (`documentViewLink`) belum dipanggil dari mana-mana: tombol "buka dokumen"
  baru dipasang saat panel detail pesanan di admin dibuat (Fase 5). Rutenya
  sudah diuji manual — tanda tangan valid = 200, kedaluwarsa/diubah = 403.
- `expiresAt` (2 jam) sudah ditulis ke booking, tapi belum ada cron yang
  memindahkan `PENDING` → `EXPIRED`.

Di luar itu:

- Notifikasi WhatsApp, cron pengingat & penagihan (`CRON_SECRET`).
- Menu pelanggan, laporan, pengaturan tenant, dan undangan staf.
- E2E alur pemesanan di CI (sampai Fase 3 verifikasi dilakukan manual lewat
  browser); unit test pricing/quote/booking-code/schedule sudah ada.
