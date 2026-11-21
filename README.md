# Flexrent

SaaS penyewaan motor & mobil untuk rental lokal. Setiap rental (tenant) punya
halaman admin sendiri dan satu halaman publik `/{slug}` untuk menerima pesanan.

Fase yang sudah jalan di repo ini: **Fase 1 (fondasi)**, **Fase 2 (armada &
perawatan)**, **Fase 3 (halaman publik & booking)**, dan **Fase 4 (pembayaran
Midtrans + pencatatan manual, notifikasi WhatsApp, cron)**. Tagihan & deposit
otomatis, laporan, dan undangan staf ada di fase berikutnya — lihat bagian
**Belum dikerjakan**.

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
| `npm run test` | Vitest (harga, jadwal, tanggal, rekonsiliasi pembayaran, tanda tangan Midtrans, template WhatsApp) |
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
- `MIDTRANS_SERVER_KEY` — kunci server Snap v2. Kosong = pembayaran online mati:
  tombol bayar di halaman publik tidak muncul dan `createCheckoutAction` menolak
  dengan pesan yang menjelaskan. Webhook `/api/webhooks/midtrans` ikut menjawab
  `403` selama kunci belum ada. `MIDTRANS_IS_SANDBOX` (`"false"` = produksi,
  selain itu sandbox). `MIDTRANS_CLIENT_KEY` tidak dibaca kode — `redirect_url`
  dari Snap sudah membawa client key; isian ini hanya cadangan kalau nanti
  memakai Snap embedded JS.
- `WHATSAPP_PROVIDER` — `"fonnte"` + `FONNTE_API_KEY` = kirim sungguhan; nilai
  apa pun (default `"stub"`) = pesan hanya dicetak ke log dan baris
  `NotificationLog` tetap ditulis dengan `detail` "stub: tidak dikirim".
  `WHATSAPP_SENDER_ID` opsional (kolom `sender` Fonnte).
- `CRON_SECRET` — harus diganti; `/api/cron/*` menolak `401` selama nilainya
  kosong atau masih `"replace-me"`. Kirim sebagai
  `Authorization: Bearer ${CRON_SECRET}`.
- `NEXT_PUBLIC_APP_URL` — dipakai untuk URL status booking di pesan WhatsApp dan
  `finish_url`/`redirect` Midtrans. Harus URL publik yang bisa dibuka pelanggan.

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
  app/(dashboard)/dashboard/        ringkasan, armada, perawatan, pembayaran
  app/api/auth/[...nextauth]/       route handler Auth.js
  app/api/dokumen/[id]/             baca KTP/SIM lewat tautan bertanda tangan
  app/api/webhooks/midtrans/        callback pembayaran (verifikasi + idempoten)
  app/api/cron/booking-expired/     expire PENDING lewat batas waktu
  app/api/cron/booking-reminders/   pengingat H-1, hampir selesai, terlambat
  components/                       ui/ (primitif), shared/, dashboard/, vehicles/,
                                    maintenance/, auth/, marketing/, public/, payments/
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
    cron.ts                         penjaga Authorization: Bearer untuk /api/cron/*
    payments/                       provider.ts (interface) + midtrans.ts (Snap v2)
                                    + reconcile.ts (due/paid/status) + apply.ts
                                    (webhook & manual lewat satu jalur)
    notifications/                  provider.ts (interface) + fonnte.ts + templates.ts
                                    + send.ts (dedupe lewat NotificationLog)
    validators/                     skema Zod
  server/
    actions/                        tulis (FormData masuk, ActionResult keluar)
    queries/                        baca (selalu difilter tenantId)
vercel.json                         jadwal cron untuk /api/cron/*
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

## Pembayaran, Midtrans, dan WhatsApp

| Rute | Isi |
| --- | --- |
| `/dashboard/payments` | daftar semua transaksi (tunai, transfer, Midtrans) + filter status/metode/kata kunci + tombol **Catat pembayaran** |
| `/{slug}/booking/{code}?phone=08…` | tombol **Bayar sekarang** (Sewa / Deposit) kalau Midtrans aktif dan masih ada sisa bayar |
| `POST /api/webhooks/midtrans` | callback status pembayaran; tidak perlu sesi, tapi wajib tanda tangan |
| `GET /api/cron/booking-expired` | PENDING yang lewat `expiresAt` → `EXPIRED` |
| `GET /api/cron/booking-reminders` | pengingat H-1 pengambilan, sewa hampir berakhir, dan keterlambatan |

### Uang: satu reducer untuk semua jalur

`src/lib/payments/reconcile.ts` satu-satunya tempat angka booking dihitung, dan
dipakai webhook Midtrans, pencatatan manual admin, checkout publik, serta halaman
status:

- `rentDueOf()` = `totalAmount − depositAmount + lateFee + damageFee`.
  **Deposit bukan bagian dari tagihan sewa** karena harus bisa kembali, jadi
  pelunasan tidak pernah menunggu deposit. Deposit dicatat sebagai baris
  `Payment` `kind=DEPOSIT` dan hanya ditagih lewat Midtrans bila belum ada
  deposit `SETTLED`.
- `paidAmount` = jumlah `Payment` `kind=RENTAL` berstatus `SETTLED`. Status
  lunas (`UNPAID`/`PARTIAL`/`PAID`) dan `status` booking diturunkan dari angka
  itu, bukan dari kolom yang ditulis manual — jadi tidak bisa "sudah lunas"
  sementara transaksi belum masuk.
- Booking `PENDING` yang pelunasannya terdeteksi berubah menjadi `CONFIRMED`.
  Status lain (`ONGOING`, `COMPLETED`, `CANCELLED`, `EXPIRED`) tidak diubah.

Setiap tempat yang mengubah uang memanggil `recomputeBooking()` (di
`src/lib/payments/apply.ts`) setelah baris `Payment` ditulis, dalam transaksi
yang sama.

### Midtrans Snap

Implementasi ada di `src/lib/payments/midtrans.ts` (REST `POST /snap/v2/transaction`,
Basic auth `base64(SERVER_KEY + ":")`) di balik interface `PaymentProvider`
(`src/lib/payments/provider.ts`), jadi ganti gateway cukup menambah satu file.

- `order_id` = `{kode booking}-{R|D}[-{nonce}]` (`R` sewa, `D` deposit). Nonce
  `yyMMddHHmmss` dipakai ulang tiap pelanggan menekan tombol bayar, sehingga
  percobaan kedua tidak menabrak `order_id` yang sudah ada dan Midtrans tidak
  menolak transaksi duplikat. Webhook memecah string itu kembali menjadi
  (kode, jenis).
- Checkout hanya dibuat setelah Snap membalik `redirect_url`; selama itu gagal,
  tidak ada baris `Payment` yatim. Baris yang tersimpan berstatus `PENDING` dan
  baru menjadi `SETTLED` lewat webhook.
- Webhook memverifikasi SHA-512 `order_id + status_code + gross_amount + server_key`
  dengan perbandingan `timingSafeEqual` di atas buffer hex. Tanda tangan dibaca
  dari body (`signature_response` — string untuk VA/QRIS/e-wallet, array objek
  untuk kartu kredit) dan header `signature` dipakai sebagai cadangan; body boleh
  JSON atau `x-www-form-urlencoded` karena Midtrans memakai keduanya. Kandidat
  kosong, bukan hex 128, atau beda → `403` dan tidak ada satu baris pun ditulis.
- Idempoten di dua lapis: `WebhookEvent @@unique([provider, eventId])` (event
  yang sama datang dua kali → `200`, tidak memproses ulang) dan
  `Payment @@unique([tenantId, midtransTransactionId])` (transaksi Midtrans yang
  sama tidak bisa menghasilkan dua pembayaran).
- Mengaktifkan sandbox: isi `MIDTRANS_SERVER_KEY` sandbox, biarkan
  `MIDTRANS_IS_SANDBOX="true"`, lalu tempel
  `https://domain-anda/api/webhooks/midtrans` di **Midtrans Dashboard → Settings
  → Webhook / Notification redirect**. Sandbox dan production punya Web URL
  sendiri; kalau production, ganti `MIDTRANS_IS_SANDBOX="false"`.
- Uji tanpa dashboard Midtrans (sandbox key sudah di-set):

  ```bash
  order=BR-2611-0001-R
  code=201
  gross=150000
  sig=$(printf '%s%s%s%s' "$order" "$code" "$gross" "$MIDTRANS_SERVER_KEY" | sha512sum | cut -d' ' -f1)
  curl -sX POST http://localhost:3000/api/webhooks/midtrans \
    -H 'content-type: application/json' \
    -d "{\"transaction_id\":\"uji-1\",\"order_id\":\"$order\",\"status_code\":\"$code\",\"gross_amount\":\"$gross\",\"transaction_status\":\"settlement\",\"signature_source\":3,\"signature_response\":\"$sig\"}"
  ```

  `settlement` dan `capture` (kecuali `fraud_status: challenge`) → lunas;
  `expire`/`expiration` → `EXPIRED`; `cancel`/`deny`/`invalid`/`failed` →
  `FAILED`; sisanya (`pending`, `authorize`, `settlement-pending`, dan `refund`
  yang belum ditangani fase ini) tetap `PENDING`. Tabel lengkap ada di
  `midtransOutcome()`.

### Pencatatan manual admin

`/dashboard/payments` → **Catat pembayaran**: pilih booking yang masih punya sisa
bayar (hanya booking tidak tertutup yang muncul di daftar, lengkap dengan angka
sisa), pilih jenis (Sewa/Deposit), metode (Tunai/Transfer), jumlah, dan
opsional reference/notes. Yang perlu diketahui:

- Jumlah divalidasi tidak boleh melebihi sisa — kelebihan bayar ditolak dengan
  pesan "Maksimal Rp …" di field jumlah, bukan diam-diam dipotong.
- Baris yang dicatat admin langsung `SETTLED` dan `recordedById` tersimpan, jadi
  kolom **Dicatat oleh** bisa diaudit. `paidAt` = waktu submit.
- Tenant `PAST_DUE`/`CANCELLED` (`isReadOnly`) melihat tombol dalam keadaan mati;
  action-nya juga menolak lewat `requireWritable()`.

### Cron dan pengingat WhatsApp

`vercel.json` menyimpan tiga jadwal: `/api/cron/booking-expired` tiap jam (`5 * * * *`)
dan `/api/cron/booking-reminders` dua kali sehari (`0 1 * * *` dan `0 9 * * *`, UTC
= 08:00 dan 16:00 WIB). Booking `PENDING` lahir dengan `expiresAt` = +2 jam
(`PENDING_TTL_MS` di `src/server/actions/booking.ts`), dan cron pertama yang
memindahkan baris itu ke `EXPIRED` sekaligus me-refresh halaman publik tenant.
Jalankan manual:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/booking-reminders
```

Lima pesan dalam Bahasa Indonesia (`src/lib/notifications/templates.ts`): pesanan
dibuat, pembayaran lunas, pengingat H-1 pengambilan, pengingat sewa hampir
berakhir, dan notifikasi keterlambatan. Nomor booking, tanggal WIB, dan rupiah
selalu disebut supaya jelas pesanan mana (nomor pengirim WhatsApp bersifat umum).
Pesan dikirim lewat interface `WhatsAppNotifier`; tanpa Fonnte, `stubNotifier`
mencetaknya ke log.

- **Satu pesan per hal, dijamin database.** `NotificationLog
  @@unique([tenantId, kind, dedupeKey])` menahan duplikat, dengan `dedupeKey`
  misalnya `BR-2611-0001:pickup:2026-11-22` atau `…:late:2026-11-21`. Karena itu
  cron boleh jalan dua kali sehari tanpa spam, dan keterlambatan diingatkan lagi
  tiap hari berikutnya.
- Notifikasi tidak pernah membatalkan transaksi: `notifyBooking()` menelan error
  provider, dan penulisan `NotificationLog` pakai `.catch()`. Booking tetap aman
  kalau gateway WhatsApp mati.
- Nomor disimpan lokal (`08…` oleh `normalizePhone`); Fonnte butuh format
  internasional, jadi `toInternationalPhone()` mengubahnya saat kirim. Nomor yang
  tidak valid membuat pesan di-*skip* (baris log `SKIPPED`), bukan error.

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

Sisa dari Fase 3 yang baru tertutup sebagian:

- Biaya antar-jemput selalu disimpan `0` sampai pengaturan tenant (area + tarif
  antar) dibuat.
- Unggah KTP/SIM masih opsional, dan tautan bertanda tangan
  (`documentViewLink`) belum dipanggil dari mana-mana: tombol "buka dokumen"
  baru dipasang saat panel detail pesanan di admin dibuat (Fase 5). Rutenya
  sudah diuji manual — tanda tangan valid = 200, kedaluwarsa/diubah = 403.

Sisa dari Fase 4 (kecil, dan sengaja tidak dipaksakan supaya fase tidak melebar):

- **Refund belum jadi transaksi.** Status `REFUNDED` ada di enum dan badge, tapi
  webhook Midtrans memperlakukan `refund` sebagai `PENDING` dan admin hanya bisa
  mencatat pembayaran masuk. Perlu satu aksi "kembalikan pembayaran" + alasan.
- **Denda lewat Midtrans belum bisa.** `lateFee`/`damageFee` sudah ikut
  menghitung sisa bayar dan ditolak kalau melebihi, tapi checkout publik selalu
  memakai `transaction.id` = kode booking; denda yang muncul setelah pesanan
  berjalan butuh order_id sendiri (skema nonce sudah mendukung).
- **Notifikasi belum punya halaman admin.** `NotificationLog` bisa dibaca lewat
  Prisma Studio; belum ada tab riwayat pesan per pesanan/klien.
- Midtrans hanya memakai Snap Redirect (`redirect_url`), jadi `MIDTRANS_CLIENT_KEY`
  tidak dibaca kode. Embedded JS/popup perlu client key di sisi klien.
- Cron mengandalkan Vercel Cron (`vercel.json`). Di host lain, ganti dengan
  scheduler yang mengirim `Authorization: Bearer ${CRON_SECRET}` ke dua rute itu.
- Pembayaran otomatis mengonfirmasi booking, tapi belum mengirim invoice/resi
  (PDF) dan belum ada penagihan deposit berulang.

Di luar itu:

- Menu pelanggan, laporan, pengaturan tenant, dan undangan staf.
- E2E alur pemesanan di CI (sampai Fase 4 verifikasi dilakukan manual lewat
  browser + curl); unit test pricing/quote/booking-code/schedule/datetime,
  rekonsiliasi pembayaran, tanda tangan Midtrans, dan template WhatsApp sudah ada.
