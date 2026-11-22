# Flexrent

SaaS penyewaan motor & mobil untuk rental lokal. Setiap rental (tenant) punya
halaman admin sendiri dan satu halaman publik `/{slug}` untuk menerima pesanan.

Fase yang sudah jalan di repo ini: **Fase 1 (fondasi)**, **Fase 2 (armada &
perawatan)**, **Fase 3 (halaman publik & booking)**, **Fase 4 (pembayaran Midtrans
+ pencatatan manual, notifikasi WhatsApp, cron)**, **Fase 5 (operasional
harian: status pesanan, kalender armada, checklist serah-terima, denda & deposit,
halaman pelanggan)**, **Fase 6 (langganan SaaS tenant: tagihan & cron, dashboard
ringkasan + grafik, laporan pendapatan per kendaraan + CSV, pengaturan tenant &
staf)**, dan **Fase 7 (control center platform: super-admin, tenant, paket,
suspend/reactivate, serta audit log)**. Undangan staf lewat email sudah ada;
penjadwalan biaya antar-jemput dan halaman riwayat notifikasi masih terbuka —
lihat bagian **Belum dikerjakan**. Dashboard platform diakses lewat `/admin` oleh
akun yang diberi akses menggunakan `npm run account:platform-admin -- email on|off`.

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

Masuk demo: email `demo@flexrent.local`, sandi `Flexrent-Demo-2026!` (nilai itu
dipasang `npm run db:seed` sebagai hash scrypt; override lewat env
`DEMO_PASSWORD`, atau ganti kemudian dengan
`npm run account:password -- demo@flexrent.local "sandi baru"`).

Cara masuk utama adalah **email + sandi**, jadi tidak perlu email yang benar-benar
terkirim. Tautan sekali pakai (magic link) masih ada sebagai jalan kedua, tetapi
tombolnya hanya muncul bila `SMTP_HOST` terisi; tanpa SMTP isi email — termasuk
undangan staf — hanya dicetak ke log. Formulir masuk butuh JavaScript: tombol baru
aktif setelah halaman siap supaya klik lebih awal tidak bisa mengirim sandi lewat
URL (form tetap dipasang `method="post"` sebagai penjaga kedua).
Data seed membuat satu tenant `bandung-ride` ("Bandung Ride Rental") dengan 10
kendaraan (lengkap dengan tarif denda keterlambatan per unit), 5 pelanggan, 10
pesanan, 3 jadwal perawatan, serta checklist PICKUP/RETURN untuk pesanan
`ONGOING` dan `COMPLETED` supaya halaman detail Fase 5 langsung terisi. Halaman
publiknya sudah aktif di `http://localhost:3000/bandung-ride`.

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | dev server (Turbopack) |
| `npm run build` / `npm start` | build & jalankan produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (harga, jadwal, tanggal, rekonsiliasi pembayaran, tanda tangan Midtrans, template WhatsApp, mesin status pesanan, checklist handover, denda & deposit) |
| `npm run test:e2e` | Playwright: alur booking publik, penjaga halaman, dan control center platform (lihat "Tes end-to-end") |
| `npm run db:migrate` | buat migrasi baru saat `schema.prisma` berubah |
| `npm run db:deploy` | terapkan migrasi ke database target |
| `npm run db:seed` | isi data demo (idempoten, menghapus baris demo lama) |
| `npm run account:password -- "<email>" "<sandi>"` | pasang/ganti sandi akun yang sudah ada (membaca `.env`) |
| `npm run db:studio` | Prisma Studio |

## Variabel environment

Semua rahasia lewat environment, tidak ada yang di-hardcode di kode.

- `DATABASE_URL` — endpoint **pooler** Neon (`?sslmode=require&channel_binding=require`,
  dipakai runtime). `DIRECT_URL` — endpoint **direct**, dipakai Prisma supaya
  `CREATE EXTENSION` dan `ALTER TABLE` jalan.
- `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` — Auth.js v5. Sesi memakai JWT,
  dan `AUTH_URL` menentukan host tautan magic link serta nama cookie sesi, jadi
  harus sama persis dengan origin yang dibuka browser.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — kosong = tombol Google disembunyikan.
- `SMTP_HOST` dkk — kosong = email tidak dikirim; tombol tautan masuk ikut
  disembunyikan dan masuk hanya lewat sandi.
- `DEMO_PASSWORD` — sandi yang dipasang `prisma/seed.ts` untuk `demo@flexrent.local`.
- `BLOB_READ_WRITE_TOKEN` — kosong = foto kendaraan dan foto checklist serah-terima
  ditulis ke `public/uploads`, KTP/SIM ditulis ke `private/uploads` (dua-duanya
  di-gitignore).
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
  app/(dashboard)/dashboard/        ringkasan, armada, booking (+ kalender armada &
                                    detail pesanan), pelanggan (+ detail), perawatan,
                                    pembayaran, laporan, langganan, pengaturan
  app/api/auth/[...nextauth]/       route handler Auth.js
  app/api/dokumen/[id]/             baca KTP/SIM lewat tautan bertanda tangan
  app/api/webhooks/midtrans/        callback pembayaran (verifikasi + idempoten)
  app/api/cron/booking-expired/     expire PENDING lewat batas waktu
  app/api/cron/booking-reminders/   pengingat H-1, hampir selesai, terlambat
  app/api/cron/subscription/        tagihan periode baru, PAST_DUE, pengingat perpanjangan
  components/                       ui/ (primitif), shared/, dashboard/, vehicles/,
                                    bookings/, customers/, maintenance/, auth/,
                                    marketing/, public/, payments/, billing/, settings/
  lib/
    auth.ts                         konfigurasi Auth.js: credentials + magic link (+ Google)
    password.ts                     hash & verifikasi scrypt untuk sandi
    email.ts                        transporter SMTP (magic link + undangan staf)
    tenant.ts                       getTenantContext / requireTenant / requireWritable
    tenant-public.ts                resolusi {slug} -> tenant untuk halaman publik
    db.ts                           Prisma client singleton
    pricing.ts                      harga termurah harian/mingguan/bulanan
    quote.ts                        total sewa + sopir + deposit dari tarif DB
    booking-code.ts                 kode BR-YYMM-####
    bookings/status.ts              mesin status: aksi mana yang boleh dari status sekarang
    handover.ts                     posisi foto checklist, level bahan bakar, selisih odometer
    documents.ts                    tanda tangan HMAC tautan dokumen
    form.ts                         pembaca field FormData untuk semua action
    terms.ts                        syarat sewa tenant + fallback
    opening-hours.ts                bentuk JSON jam operasional + label hari
    schedule.ts                     konversi durasi <-> tanggal, bentrok slot
    datetime.ts                     semua perhitungan tanggal pakai WIB
    billing.ts                      siklus langganan: periode berikutnya, jatuh tempo
    invoices.ts                     tagihan periode baru + total yang sudah masuk
    csv.ts                          penulis CSV (BOM + kutip) untuk ekspor
    reports.ts                      perhitungan laporan pendapatan per kendaraan
    result.ts                       kontrak ActionResult untuk server action
    storage.ts                      Vercel Blob dengan fallback lokal
    cron.ts                         penjaga Authorization: Bearer untuk /api/cron/*
    payments/                       provider.ts (interface) + midtrans.ts (Snap v2)
                                    + reconcile.ts (due/paid/status) + fees.ts
                                    (denda & rencana pengembalian deposit) + apply.ts
                                    (webhook & manual lewat satu jalur)
    notifications/                  provider.ts (interface) + fonnte.ts + templates.ts
                                    + send.ts (dedupe lewat NotificationLog)
    validators/                     skema Zod
  server/
    actions/                        tulis (FormData masuk, ActionResult keluar)
    queries/                        baca (selalu difilter tenantId)
vercel.json                         build command Vercel (prisma generate + next build)
.github/workflows/cron.yml          pemanggil /api/cron/* tiap jam dari GitHub Actions
scripts/set-user-password.ts        alat CLI di balik npm run account:password
```

## Cara kerja multi-tenant

- **Masuk = email + sandi** (Auth.js `credentials`, hash scrypt di
  `users.passwordHash`). Sesi JWT 30 hari; `session.user.id` diambil dari
  `token.sub` lewat callback, dan hak akses tetap dihitung dari `Membership` di
  setiap permintaan — jadi staf yang dihapus kehilangan akses walau tokennya
  belum kedaluwarsa. Tautan email (Nodemailer) dan Google tetap terdaftar sebagai
  jalan kedua; keduanya butuh konfigurasi supaya muncul di formulir.
- `requireTenant()` (src/lib/tenant.ts) mengembalikan sesi + membership +
  subscription + plan, atau melempar redirect ke `/login` / `/onboarding`.
  Dipakai di setiap halaman dashboard dan di awal setiap server action.
- Percobaan masuk dibatasi `login` (10 percobaan / 5 menit per email + IP) lewat
  `ipRateRejection()` yang sama dengan formulir booking.
- `tenantId` **tidak pernah** dibaca dari input klien. Action mengambilnya dari
  konteks, lalu `where: { id, tenantId }` — milik tenant lain tidak tersentuh.
- `context.canManage` (OWNER/ADMIN) menentukan hak ubah, `context.isReadOnly`
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
| `/api/dokumen/{id}` | hanya dibuka dengan tautan bertanda tangan yang belum kedaluwarsa, dari sesi staf tenant pemilik, dan dibatasi per menit |

Gerbang anti-spam di sisi tulis (semuanya dievaluasi sebelum menyentuh DB kecuali pencacah):

- **Pencacah per jendela** (`src/lib/rate-limit.ts`): satu baris `rate_limit_buckets`
  per (lingkup, alamat IP + identitas, awal jendela). Naiknya lewat satu
  `INSERT … ON CONFLICT … RETURNING` sehingga dua permintaan serentak tidak keduanya lolos.
  Ambang ada di `RATE_RULES` (pemesanan 8/10 menit per IP+slug, tautan masuk 10/5 menit
  per IP+email, buka dokumen 60/menit per IP+staf). Kalau DB pencacah sedang error,
  permintaan **diloloskan** — menolak pesanan yang sah lebih mahal.
- **Tiket form** (`src/lib/form-ticket.ts`): `pesan/{id}` menerbitkan token HMAC saat
  render; `createBookingAction` menolak kalau token belum berumur 5 detik (bot POST
  langsung), sudah lewat 30 menit, dipindah ke kendaraan lain, atau tanda tangannya
  diubah.
- **Honeypot**: input `company` tersembunyi di wizard; bila terisi, pesanan ditolak
  tanpa pesan detail.
- Cron `/api/cron/booking-expired` (jalan tiap jam) ikut menghapus bucket yang
  jendelanya lewat lebih dari 24 jam, jadi tabel pencacah tidak tumbuh terus.

SEO halaman publik (`src/lib/seo.ts`):

- Tiap halaman katalog & detail kendaraan memakai `publicMeta` → judul, deskripsi,
  `rel=canonical`, dan kartu Open Graph/Twitter. Gambarnya foto utama kendaraan,
  lalu logo rental, lalu kartu bawaan `src/app/opengraph-image.tsx` (ImageResponse).
- `/sitemap.xml` (revalidate 1 jam) berisi `/` + `/harga` plus `/{slug}` dan
  `/{slug}/kendaraan/{id}` untuk rental yang aktif dan tidak sedang diblokir
  langganan. Kegagalan DB hanya membuat daftarnya jadi pendek, bukan membatalkan build.
- `/robots.txt` melarang `/dashboard`, `/api`, `/login`, `/onboarding`.
- Wizard `pesan/{id}` dan halaman `booking/{code}` diberi `noindex` karena URL-nya
  memuat kode pesanan / nomor WhatsApp.
- `NEXT_PUBLIC_APP_URL` harus origin produksi: canonical, `og:url`, dan sitemap
  dibangun dari nilai itu, bukan dari header permintaan.

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
- **Penjaga tampilan:** `src/app/error.tsx` (gagal render dengan tombol "Coba lagi")
  dan `src/app/global-error.tsx` untuk kegagalan root layout; yang terakhir ini
  sengaja memakai gaya inline karena tidak boleh bergantung pada layout yang sedang
  rusak. Untuk 404 ada dua boundary: `/{slug}/not-found.tsx` hanya dipakai kalau
  tenant-nya ada tetapi halamannya tidak (mis. ID kendaraan salah ketik), karena
  keberadaan tenant sendiri diperiksa di `/{slug}/layout.tsx` — slug asing ikut
  melempar `notFound()` dari layout sehingga yang tampil `src/app/not-found.tsx`.
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

Jadwal cron dipegang `.github/workflows/cron.yml` (satu tick tiap jam, `0 * * * *` UTC
= WIB + 7): `/api/cron/booking-expired` menutup `PENDING` yang lewat `expiresAt` sekaligus
membersihkan pencacah laju, `/api/cron/booking-reminders` mengirim pengingat H-1 / hampir
selesai / keterlambatan, dan `/api/cron/subscription` mengurus tagihan langganan.
`vercel.json` sengaja tidak punya blok `crons` lagi — plan Hobby menolak ekspresi yang
jalan lebih dari sekali sehari dan validasinya membuat build gagal. Ketiga rute idempoten
(pengingat punya kunci dedupe, tagihan dicek per periode), jadi tick yang terlewat atau
dobel tidak menghasilkan pesan ganda. Booking `PENDING` lahir dengan `expiresAt` = +2 jam
(`PENDING_TTL_MS` di `src/server/actions/booking.ts`), dan cron pertama yang
memindahkan baris itu ke `EXPIRED` sekaligus me-refresh halaman publik tenant.
Jalankan manual:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/booking-reminders
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/subscription
```

Lima pesan dalam Bahasa Indonesia (`src/lib/notifications/templates.ts`): pesanan
dibuat, pembayaran lunas, pengingat H-1 pengambilan, pengingat sewa hampir
berakhir, dan notifikasi keterlambatan. Nomor booking, tanggal WIB, dan rupiah
selalu disebut supaya jelas pesanan mana (nomor pengirim WhatsApp bersifat umum).
Pesan dikirim lewat interface `WhatsAppNotifier`; tanpa Fonnte, `stubNotifier`
mencetaknya ke log. Ditambah satu surat langganan
(`subscriptionReminderMessage()`): pengingat perpanjangan H-7/H-3/H-1 dan
"tagihan sudah lewat jatuh tempo" untuk pemilik rental.

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

## Operasional harian: booking & pelanggan

| Rute | Isi |
| --- | --- |
| `/dashboard/bookings` | daftar pesanan (filter status + kendaraan + kata kunci, paginasi) — atau `?tampilan=kalender&mulai=YYYY-MM-DD` untuk timeline armada 14 hari |
| `/dashboard/bookings/{code}` | detail: tagihan & pembayaran, checklist kondisi sebelum/sesudah, dokumen pelanggan, panel aksi + form checklist |
| `/dashboard/customers` | daftar pelanggan + jumlah pesanan + nilai sewa + badge verifikasi, filter blacklist/verifikasi |
| `/dashboard/customers/{id}` | riwayat sewa (50 terakhir), dokumen identitas + tombol verifikasi, panel ringkasan, aksi blacklist |
| `/api/dokumen/{id}` | dipakai tombol "Buka" di detail pesanan & pelanggan |

### Mesin status pesanan

`src/lib/bookings/status.ts` satu-satunya tempat transisi ditandai:
`PENDING → CONFIRMED` (Konfirmasi), `CONFIRMED → ONGOING` (Mulai sewa),
`ONGOING → COMPLETED` (Selesai), `PENDING|CONFIRMED → CANCELLED` (Batalkan).
UI hanya menampilkan aksi yang diizinkan matriks itu, tapi
`changeBookingStatusAction` memvalidasi ulang di server — jadi tab lama atau dua
staf tidak bisa memaksa lompatan status. Efek sampingnya ikut ditangani di sana:
Konfirmasi mematikan `expiresAt` (cron tidak lagi kedaluwarsakan pesanan yang
sudah di-ACC), Batalkan menyimpan `cancelledAt` + `cancelReason`, dan Mulai/Selesai
memindahkan `Vehicle.status` (`RENTED` ↔ `AVAILABLE`; saat selesai kendaraan tetap
`MAINTENANCE` kalau sedang dijadwalkan).

Dua keputusan yang perlu diketahui:

- **`COMPLETED` tidak bisa lewat tombol biasa.** Menu "Selesai" membuka form
  pengembalian (`recordBookingClosingAction`) supaya denda dan deposit selalu ikut
  tercatat; `changeBookingStatusAction` menolak `action=COMPLETE` dengan pesan yang
  menjelaskan.
- **Sewa yang sedang berjalan tidak bisa dibatalkan.** Setelah `ONGOING`, satu-satunya
  jalan keluar adalah menyelesaikan lewat form pengembalian (uang dan kendaraan sudah
  berpindah). Ini asumsi sederhana yang dipilih supaya tidak ada status "dibatalkan
  tapi sudah dipakai".

### Denda keterlambatan, kerusakan, dan deposit

Form pengembalian menghitung nilainya dari baris `Payment`, bukan dari kolom:

- `lateFee` terisi otomatis dari `Vehicle.lateFeeDaily × lateDays(...)`, dan
  `lateDays` mengikuti kalender WIB (`endsAt` → tanggal kembali; balik sehari lewat
  jatuh tempo = 1 hari). `lateFeeDaily` per kendaraan disunting di halaman detail
  armada; kendaraan tanpa tarif denda = saran 0.
- `damageFee` diisi manual, berdasar catatan kerusakan di checklist pengembalian.
- Pengembalian deposit dibatasi `depositHeld − depositReturned` (deposit `SETTLED`
  dikurangi deposit `REFUNDED`); lebih dari itu ditolak dengan "Maksimal Rp …".
  Bila dipilih "Pakai Rp …", nilainya datang dari `depositRefundPlan()`: sisa sewa
  yang belum dibayar + denda baru dipotong dulu dari deposit, sisanya yang kembali ke
  pelanggan. `depositStatus` (`HELD`/`PARTIAL_REFUNDED`/`REFUNDED`/`FORFEITED`)
  diturunkan dari hasil itu lewat `depositStatusAfterRefund()`.
- Setiap pengembalian tercatat sebagai `Payment` `kind=DEPOSIT status=REFUNDED`
  dengan `recordedById`, jadi uang keluar bisa diaudit; penutup transaksi tetap
  memanggil `recomputeBooking()` sehingga status pelunasan tidak ditulis manual.

### Checklist serah-terima & pengembalian

Satu form (`HandoverChecklist`) untuk dua arah, `PICKUP`/`RETURN`, di panel kanan
detail pesanan. `saveHandoverAction` menolak checklist yang tidak pada tempatnya
(`typeRejection`): pengembalian butuh PICKUP dulu. Isinya: odometer, level bahan
bakar, catatan kondisi, catatan kerusakan, dan foto per posisi (`FRONT`, `BACK`,
`LEFT`, `RIGHT`, `DASHBOARD` + maksimum 8 file termasuk foto tambahan). Odometer
pengembalian tidak boleh lebih kecil dari odometer pengambilan, dan `Vehicle.odometer`
hanya naik mengikuti angka terbesar. Foto disimpan lewat `uploadImage()` ke folder
`handovers/{slug}`; bila transaksi gagal, file yang baru diunggah dihapus lagi.

`HandoverCompare` menampilkan PICKUP dan RETURN berdampingan plus selisihnya: jarak
tempuh (`odometerDelta`), berkurangnya bahan bakar dalam perempat tangki
(`fuelDropQuarters`/`fuelDropLabel`), dan posisi foto yang belum terisi
(`missingPhotoPositions`). Di daftar pesanan, kolom Checklist menandai mana yang sudah
ada. Karena tiap submit membuat baris `Handover` baru (bukan menimpa), koreksi
sengaja bisa diulang dan riwayatnya tersimpan; perbandingan memakai entri terakhir
tiap jenis.

### Pelanggan, verifikasi dokumen, blacklist

- `isBlacklisted` + `blacklistReason` disimpan di `Customer`. Penegakannya sudah ada
  sejak Fase 3 (`findBlockedCustomer` di `createBookingAction`, lewat nomor WhatsApp),
  jadi halaman ini hanya tempat mengaktifkannya; melepas blacklist mengosongkan
  alasannya.
- Verifikasi dokumen = `Document.isVerified` + `verifiedAt`, diubah lewat
  `setDocumentVerifiedAction`. Badge "Terverifikasi" di daftar hanya menghitung
  dokumen yang sudah disetujui staf. KTP/SIM dibuka lewat `documentViewLink()` —
  tautan HMAC 5 menit yang **tetap menuntut sesi staf tenant pemilik** (lihat
  "Halaman publik & booking").
- Riwayat sewa per pelanggan dihitung dari `Booking` (yang `CANCELLED`/`EXPIRED` ikut
  tampil dengan badge-nya), dan ringkasan daftar memakai satu `groupBy` per halaman,
  bukan query per baris. "Nilai pesanan" tetap **nilai pesanan**, tetapi "Sisa bayar"
  dan "Deposit tertahan" di halaman profil memakai `bookingMoney()` yang sama dengan
  detail booking, jadi angkanya berasal dari baris `Payment`, bukan dari kolom.
- `totalAmount` selalu termasuk deposit — sama seperti penawaran di halaman publik —
  sehingga `rentDueOf()` (= `totalAmount − depositAmount + denda`) cocok. Seed demo
  menulis angka itu beserta baris `Payment` (`RENTAL`/`DEPOSIT`), jadi data contoh
  tidak lagi terlihat "lunas" padahal tidak ada penerimaan tercatat.
- Tenant `PAST_DUE`/`CANCELLED` melihat semuanya dalam keadaan baca-saja: tombol aksi
  mati dan action menolak lewat `requireWritable()`.

## Langganan, laporan, dan pengaturan

### Siklus langganan (Fase 6)

Satu siklus bulanan, semuanya dihitung dari tanggal WIB:

```
TRIALING (14 hari) ──cron──▶ invoice periode 1 OPEN ──bayar──▶ ACTIVE
ACTIVE ──invoice lewat dueAt──▶ PAST_DUE (dashboard baca-saja, halaman publik
                               berhenti menerima pesanan) ──bayar──▶ ACTIVE
cancelAtPeriodEnd ──cron saat periode habis──▶ CANCELLED
```

- **Tagihan lahir dari cron, bukan dari halaman.** `/api/cron/subscription` — dipanggil
  tiap jam oleh `.github/workflows/cron.yml`, jadi invoice terbit paling lambat satu jam
  setelah periode habis — membuat invoice periode berikutnya untuk
  subscription yang `currentPeriodEnd <= sekarang`, menghormati
  `cancelAtPeriodEnd`, lalu menandai invoice yang lewat `dueAt` sebagai `PAST_DUE`.
  Nomor invoice `INV-YYMM-####` bernomor urut per bulan kalender; `ensureNextInvoice`
  memakai ulang tagihan yang sudah ada, jadi cron yang jalan dua kali tidak
  menagih dua kali.
- **Masa uji tidak menagih.** `trialEndsAt` dipakai sebagai `currentPeriodEnd`
  pertama, jadi invoice pertama baru terbit saat trial habis. `requireTenant()` juga
  memperlakukan trial yang sudah lewat sebagai `PAST_DUE` supaya akses tidak bisa
  bocor sebelum cron sempat jalan.
- **Lunas = jumlah baris `Payment`.** `invoicePaidTotal()` menjumlahkan
  `Payment{kind:"SUBSCRIPTION", status:"SETTLED"}`. Tidak ada kolom "sisa bayar"
  yang bisa berbeda sendiri; `settleInvoice()` yang menulis `paidAt`/`status=PAID`
  dan memajukan `currentPeriodEnd` hanya kalau tagihan yang dibayar memang menutup
  periode setelahnya (bayar sebagian tidak memajukan periode).
- **Bayar lewat Midtrans atau dicatat manual.** Snap memakai `order_id`
  `INV-…-I` (suffix `-I` = tagihan langganan, lihat `lib/payments/provider.ts`);
  webhook yang sama membedakan mode dari suffix dan memanggil
  `applyInvoicePaymentEvent()`. Pencatatan transfer/tunai memakai
  `recordInvoicePaymentAction()` dan melewati `settleInvoice()` yang sama.
  Aksi pembayaran **sengaja tidak** dicegat `requireWritable()` — justru lewat
  halaman inilah tenant yang terkunci membuka aksesnya kembali.
- **Ganti paket berlaku periode berikutnya.** `changePlanAction()` menolak paket yang
  lebih kecil dari pemakaian (jumlah kendaraan / staf aktif) dengan kode
  `PLAN_LIMIT`, dan tidak mengubah tagihan yang sudah terbit.
- **Pengingat perpanjangan** (H-7, H-3, H-1, dan surat "lewat jatuh tempo") dikirim
  ke nomor WhatsApp pemilik lewat `notifySubscription()`; dedupe
  `INV-…:renewal:H-7` menjamin satu pesan per tonggak.

### Dashboard ringkasan

`getDashboardSummary()` membaca semuanya dalam satu `Promise.all`. "Pendapatan bulan
ini" dan grafik 30 hari memakai baris `Payment` `SETTLED` (`kind: "RENTAL"`), sehingga
kas yang tampil adalah uang yang benar-benar masuk — bukan nilai pesanan. Okupansi
30 hari dihitung dari irisan `startsAt`/`endsAt` booking aktif dengan jendela 30 hari
dibagi `jumlah kendaraan × 30`. Grafik memakai Recharts (`components/dashboard/
revenue-chart.tsx`) dengan warna token `--chart-2`.

### Laporan per kendaraan + CSV

`/dashboard/reports` (filter rentang tanggal + preset bulan ini / 30 hari / 7 hari)
menampilkan bookings, hari sewa, dan kas masuk per kendaraan, dan
`/dashboard/reports/export` menyajikan tabel yang sama sebagai
`pendapatan-YYYY-MM-DD-YYYY-MM-DD.csv` (BOM UTF-8, CRLF, angka polos tanpa pemisah
ribuan). Kolomnya teks biasa supaya bisa langsung dihitung ulang di spreadsheet.

Dua hal yang sengaja dibedakan dan diberi label di halaman: **jumlah booking/hari
sewa** dihitung dari masa sewa yang menyentuh rentang, sedangkan **uang** dihitung
dari tanggal pembayaran. Sewa yang dibayar di bulan November tapi berjalan di
Desember karena itu muncul di laporan November dan tidak di Desember.

### Pengaturan tenant & staf

`/dashboard/settings`: profil (nama, slug publik, kota, WhatsApp, email, alamat,
tagline), logo, jam operasional 7 hari, syarat sewa (dengan pratinjau), dan daftar
staf + undangan email.

- Mengganti slug lebih dulu dicek ke `tenants.slug` milik tenant lain; kalau sudah
  dipakai, formulir menolak dengan pesan jelas (nama alamat baru tidak diam-diam
  diberi akhiran `-2` seperti saat onboarding). Setelah tersimpan, halaman publik
  alamat lama dan baru sama-sama di-revalidate.
- Logo memakai `uploadImage()` (`logos/{slug}`) — Vercel Blob kalau token diisi,
  `public/uploads` kalau tidak. Logo lama dihapus setelah yang baru tersimpan.
- Jam operasional disimpan apa adanya sebagai JSON di `Tenant.openingHours` dan
  dibaca halaman publik lewat `parseOpeningHours()`; selama belum diisi, footer
  publik tetap menampilkan pesan "jam pengambilan disepakati lewat WhatsApp".
- Syarat sewa disimpan sebagai teks multi-baris; `termsList()` memecahnya jadi
  butir dan tetap memakai syarat bawaan Flexrent kalau kosong.
- **Undangan staf tidak membuat kata sandi.** `inviteStaffAction()` membuat
  `User` (email saja, `passwordHash` kosong) bila belum ada, lalu men-upsert
  `Membership` dengan `invitedEmail` dan peran `ADMIN`/`STAFF`. Email undangan
  hanya berisi tautan `/login`, jadi tanpa SMTP staf itu belum bisa masuk:
  pemilik rental membuatkan sandinya lewat
  `npm run account:password -- email@staf.id "sandi"`, lalu menyampaikan sandi itu
  di luar aplikasi. Karena `getUserByEmail` dipakai lebih dulu, akun hasil
  undangan tidak dibuat dua kali.
  Batas `maxStaff` paket dijaga sebelum menambah kursi; tanpa `SMTP_HOST` pesan
  hanya dicetak ke log dan UI menandainya sebagai "belum terkirim".
  Staf non-admin melihat halaman pengaturan dalam mode baca-saja.

## Batas ukuran berkas

Gambar dan dokumen ikut terkirim di dalam request Server Action, jadi batas
sebenarnya bukan kuota Vercel Blob melainkan plafon body framework
(`experimental.serverActions.bodySizeLimit = "4mb"` di `next.config.ts`). Permintaan
di atas plafon ditolak framework sebelum kode kita jalan, dan yang muncul di layar
pemakai cuma halaman error tanpa penjelasan. Angkanya ada di satu tempat,
`src/lib/upload-limits.ts`:

| Konstanta | Nilai | Menjaga |
| --- | --- | --- |
| `ACTION_BODY_LIMIT_BYTES` | 4 MB | plafon framework; ada tes yang memaksa nilainya tetap sama dengan `next.config.ts` |
| `MAX_DOC_BYTES` = `MAX_IMAGE_BYTES` | 1,5 MB per berkas | `uploadImage()` dan `uploadPrivateFile()` di `storage.ts` |
| `UPLOAD_BODY_BUDGET_BYTES` | 3 MB per request | bagian berkas saja; ±1 MB sisanya untuk field teks dan overhead multipart |

Tiga lapis penjaga supaya yang dilihat pemakai adalah pesan, bukan halaman error:

1. **Dikecilkan di browser.** `shrinkDoc()` (`src/lib/shrink-doc.ts`) menggambar
   ulang lewat canvas sampai di bawah jatah. Jatahnya ikut mengecil seiring banyaknya
   berkas dalam satu request — `perFileBudget(n)`: 1 berkas 1,5 MB, 3 berkas 1 MB,
   6 berkas 512 KB, 8 berkas 384 KB.
2. **Ditolak di klien sebelum kirim.** Input file memeriksa plafon dan
   `uploadBudgetError()` lalu menampilkan toast, jadi request sia-sia tidak dikirim.
3. **Dijaga di server.** `uploadImage()` melempar `StorageError`, dan
   `uploadVehiclePhotosAction` / `saveHandoverAction` menjawab `VALIDATION` bila
   total berkas masih melewati jatah setelah kompresi.

Satu pengecualian yang disengaja: logo rental (`logo-form.tsx`) tidak dikonversi di
browser karena `shrinkDoc()` selalu keluar sebagai JPEG dan transparansi PNG hilang.
Logo di atas 1,5 MB ditolak dengan pesan supaya dikompres lebih dulu.

## Tes end-to-end (Playwright)

`npm run test:e2e` menjalankan dua puluh tes di `e2e/` pada satu worker Chromium.
Yang perlu diketahui kalau mengubahnya:

- **`login-flow.spec.ts` memakai sandi seed.** Nilainya harus sama dengan
  `DEMO_PASSWORD ?? "Flexrent-Demo-2026!"` di `prisma/seed.ts`; kalau sandbox
  memakai sandi lain, jalankan `E2E_DEMO_PASSWORD="sandi" npm run test:e2e`.
  Tes hanya mengirim 3–4 percobaan sehingga masih di bawah batas `login`
  (10/5 menit) — jangan ditambahkan percobaan sandi salah berulang-ulang.
- **`platform-admin.spec.ts` butuh akses platform.** Sebelum suite, jalankan
  `npm run account:platform-admin -- demo@flexrent.local on`; tanpa itu semua tes
  control center mendarat di `/dashboard` dan gagal. Alurnya sengaja berurutan
  (`mode: "serial"`) karena menyentuh data bersama: tenant disuspend lalu
  diaktifkan kembali (dibuktikan dengan `/{slug}` 404 → 200), dan form paket
  dikirim dengan nilai yang sedang terpakai supaya tidak ada harga yang berubah.
  Suite ini juga mengirim beberapa kali masuk, jadi satu bucket `login` dipakai
  bersama `login-flow` — helper `masuk()` menunggu 65 detik lalu mencoba lagi bila
  server menjawab "Terlalu sering mengirim", bukan menggagalkan tes.
- **Tidak ada ID yang dihafal.** Tenant diambil dari `/sitemap.xml`, lalu kendaraan
  pertama dari katalog bertanggal diklik seperti pengunjung biasa. Ganti seed, tes
  tetap jalan; kalau sitemap kosong, tes gagal dengan pesan "jalankan
  `npm run db:seed`".
- **Link "Pesan" wajib `exact: true`.** Footer tenant punya tautan "Cek status
  pesanan" yang datang lebih dulu di DOM, jadi pencarian longgar akan mengklik
  rute `/booking` dan suite mati menunggu halaman wizard. Di dev kesalahan ini
  tidak kelihatan — ulangi suite terhadap build produksi:
  `npx next start -p 3100` lalu `E2E_BASE_URL=http://localhost:3100 npm run test:e2e`.
- **Klik tombol masuk, jangan `requestSubmit()`.** Sebelum React menempelkan
  `onSubmit`, submit apa pun adalah submit native: form tanpa `method` mengirim
  email + sandi lewat GET sehingga sandi tertinggal di URL, riwayat browser, dan
  log server. `login-form.tsx` memasang `method="post"` dan menahan tombol sampai
  halaman siap; karena Playwright menunggu elemen menjadi bisa diklik,
  `button.click()` otomatis aman, sedangkan `form.requestSubmit()` dari
  `page.evaluate` melompati penjaga itu dan menghasilkan halaman kosong yang
  disangka "data test attribute".
- **Angka waktu dev tidak bisa dipercaya.** Rute yang belum pernah dibuka
  dikompilasi saat disentuh: suite login berjalan 27 detik terhadap build produksi
  tapi 1–2 menit terhadap `npm run dev`, dan `page.goto` pertama bisa habis
  melewati timeout 90 detik. Vonis "lambat" atau "mati" diambil dari
  `npm run build` + `next start`, bukan dari dev.
- **Jendela tanggal diacak 30–180 hari ke depan.** Pesanan buatan tes terakhir masih
  `PENDING` dan memblokir kendaraannya, jadi tanggal acak mencegah bentrok saat
  suite dijalankan dua kali berturut-turut.
- **Kerelaan 5 detik pada tiket form.** Jalur utama sengaja menunggu ≥7 detik setelah
  wizard tampil — meniru orang yang membaca ringkasan. Kirim lebih cepat dari itu
  ditolak `spamRejection`, dan tes jebakan bot membuktikan penolakan itu lewat
  `input[name="company"]` (diisi lewat setter asal prototype supaya state React ikut
  berubah).
- **Sisa data.** Satu kali jalan sukses meninggalkan satu booking `PENDING` bernama
  `E2E Penyewa …`; tidak ada tombol batal publik, jadi `api/cron/booking-expired`
  mengubahnya jadi `EXPIRED` setelah dua jam. Jangan jalankan suite ini ke database
  produksi.
- **Layar penjaga ikut dijaga.** Selain 404 dan `noindex`, ada tes bahwa halaman
  status publik tidak menampilkan nama penyewa — kodenya saja yang boleh bocor.
- **Server.** Config menyalakan `next dev -p 3100` sendiri, atau memakai server yang
  sudah jalan selama `E2E_BASE_URL` tidak diset. Rute yang baru dikompilasi bisa
  memakan puluhan detik, sehingga navigasi wizard memakai timeout 90 detik;
  `playwright.config.ts` juga menyimpan trace hanya saat tes gagal.

## Deploy ke Vercel

Tiga hal harus terjadi sebelum trafik produksi masuk: migrasi terpasang, Prisma
Client dibangkitkan saat build, dan origin publik sudah benar.

1. **Migrasi lebih dulu.** Vercel tidak menjalankan `prisma migrate`. Dari mesin yang
   bisa membuka `DIRECT_URL`:

   ```bash
   npx prisma migrate deploy
   ```

   Migrasi `20261122103000_add_rate_limit_bucket` wajib ikut terpasang. Tanpa tabelnya
   `consumeRate` memilih fail-open: booking tetap diterima, tapi pembatasan laju mati
   tanpa suara — yang tersisa hanya `console.error("[rate-limit] …")` di log.
   Migrasi `20261122180000_add_user_password_hash` juga wajib: kolom
   `users.passwordHash` dibaca setiap percobaan masuk, jadi tanpa kolom itu
   `/login` gagal duluan.
2. **Build command membangkitkan client.** `vercel.json` menyetel
   `"buildCommand": "prisma generate && next build"`. Isian manual di
   Settings → Build & Deployment → Build Command mengalahkan file itu, dan deploy lalu
   gagal dengan `Cannot find module '.prisma/client/default'`.
   `vercel.json` juga menyetel `"regions": ["sin1"]`: basis data Neon berada di
   `ap-southeast-1` (Singapura) sementara fungsi Vercel default jalan di `iad1`
   (Virginia), dan setiap permintaan dashboard minimal dua kali bolak-balik ke basis
   data — satu kali untuk membaca keanggotaan di layout, satu lagi untuk query halaman.
   Selisihnya ±220 ms per gelombang kalau regionnya berbeda benua, jadi halaman publik
   `/{slug}` yang query-nya cuma ±50 ms tetap butuh ±1 detik. Region fungsi bisa
   dicek dari header `x-vercel-id` (`sin1::iad1::…` berarti edge-nya Singapura tetapi
   fungsinya masih Virginia). Plan Hobby boleh memilih satu region; kalau project ini
   someday pindah ke beberapa region, Neon yang harus ikut pindah.
3. **Environment Production (dan Preview kalau perlu).** Lengkap di bagian
   "Variabel environment"; yang bikin produksi beda dari dev:

   | Variabel | Nilai produksi | Kalau tidak |
   | --- | --- | --- |
   | `DATABASE_URL` | endpoint **pooler** Neon (IPv4) | koneksi direct bisa tidak terbuka dari jaringan Vercel dan semua halaman 500 |
   | `NEXT_PUBLIC_APP_URL` + `AUTH_URL` | origin produksi, keduanya | canonical, `og:url`, sitemap, tautan status di WhatsApp, `finish_url` Midtrans, dan magic link ikut nilai ini |
   | `AUTH_SECRET` | `npx auth secret` | tiket form anti-bot dan tanda tangan tautan dokumen ikut mati |
   | `CRON_SECRET` | nilai baru | keempat rute cron menjawab `401`: booking `PENDING` tidak pernah `EXPIRED` dan pencacah laju tidak pernah dibersihkan |
   | `SMTP_HOST` dkk | kredensial nyata | masuk tetap jalan (email + sandi); yang hilang cuma tombol tautan masuk dan email undangan staf — isinya hanya tercetak di log server yang tidak bisa dibaca di Vercel |
   | `BLOB_READ_WRITE_TOKEN` | token Vercel Blob | unggahan ditulis ke filesystem sementara dan hilang begitu instance dingin — termasuk KTP/SIM pelanggan |
   | `MIDTRANS_IS_SANDBOX` + `MIDTRANS_SERVER_KEY` | `"false"` + key produksi | webhook masih menunjuk sandbox; daftarkan ulang `https://{origin}/api/webhooks/midtrans` |
   | `WHATSAPP_PROVIDER` + `FONNTE_API_KEY` | `"fonnte"` | `"stub"` hanya menulis `NotificationLog`; pengingat H-1 dan keterlambatan tidak pernah sampai |
4. **Cron tidak lagi dimiliki Vercel.** `vercel.json` hanya menyimpan `buildCommand`
   dan `regions`;
   jadwal ada di `.github/workflows/cron.yml` dan butuh dua isian di GitHub —
   secret `CRON_SECRET` (nilai yang sama dengan yang dipakai di Vercel) dan variable
   `APP_URL` = `https://flexbox-rent.vercel.app` (origin produksi). Verifikasi setelah
   keduanya diisi:

   ```bash
   gh workflow run cron.yml && gh run watch --exit-status
   ```

   Kalau project Vercel mengaktifkan Deployment Protection (Vercel Authentication /
   Only Vercel Trusted Network), panggilan dari Actions kena `401` dan perlu header
   `x-vercel-protection-bypass` — matikan proteksinya atau tambahkan secret
   `BYPASS_PROTECTION` lalu kirim lewat header itu.
5. **Smoke test setelah publish.**

   ```bash
   ORIGIN=https://flexbox-rent.vercel.app
   for p in / /harga /robots.txt /sitemap.xml /opengraph-image /rute-tak-ada; do
     printf "%-22s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN$p")"
   done
   curl -s "$ORIGIN/robots.txt" | grep -E "Sitemap|Disallow: /dashboard"
   curl -s -o /dev/null -w 'cron tanpa kunci: %{http_code}\n' "$ORIGIN/api/cron/booking-expired"
   curl -s "$ORIGIN/api/cron/booking-expired" -H "Authorization: Bearer $CRON_SECRET"
   ```

   Lima nilai pertama harus `200` dan `/rute-tak-ada` harus `404`. `og:url` di
   `/{slug}` dan baris `Sitemap:` di robots.txt harus menunjuk `$ORIGIN`, bukan
   localhost. Rute cron hanya menerima `GET` (Vercel Cron memakai GET); tanpa header
   `Authorization` jawabannya `401`, dan balasan yang sah berisi hitungan `expired`
   dan `pruned`.
6. **Dua hal yang tidak boleh dijalankan ke produksi:** `npm run db:seed` (menghapus
   lalu menimpa baris demo) dan `npm run test:e2e` (meninggalkan booking `PENDING`
   sungguhan di database yang disentuhnya).

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
- Kalender armada digambar sebagai satu CSS grid per kendaraan
  (`190px repeat(hari, minmax(52px,1fr))`) dengan kolom label sticky; sel latar
  berwarna dan bar segmen sama-sama diletakkan di `gridRow: 1`, jadi pesanan yang
  bertumpuk tampil menumpuk alih-alih berpindah baris.
- Uang dan tanggal dalam format Indonesia (`Rp 1.500.000`, `Sen, 21 Nov 2026`),
  seluruh perhitungan tanggal memakai WIB lewat `src/lib/datetime.ts`.

## Belum dikerjakan

Sisa dari Fase 3 yang baru tertutup sebagian:

- Biaya antar-jemput selalu disimpan `0` sampai pengaturan tenant (area + tarif
  antar) dibuat.
- Unggah KTP/SIM masih opsional di wizard publik, jadi verifikasi dokumen hanya
  berarti "yang diunggah sudah disetujui staf". Tombol "Buka" dokumen sekarang sudah
  dipasang (detail pesanan & pelanggan); rutenya diuji manual — tanda tangan valid +
  sesi staf = 200, kedaluwarsa/diubah = 403, tanpa sesi = 401.

Sisa dari Fase 4 (kecil, dan sengaja tidak dipaksakan supaya fase tidak melebar):

- **Refund pembayaran sewa belum jadi transaksi.** Status `REFUNDED` ada di enum dan
  badge, dan sejak Fase 5 dipakai untuk **pengembalian deposit** lewat form
  pengembalian. Tapi webhook Midtrans masih memperlakukan `refund` sebagai `PENDING`,
  dan belum ada aksi "kembalikan pembayaran sewa" (kind `RENTAL`) + alasan.
- **Denda lewat Midtrans belum bisa.** `lateFee`/`damageFee` sudah ikut
  menghitung sisa bayar dan ditolak kalau melebihi, tapi checkout publik selalu
  memakai `transaction.id` = kode booking; denda yang muncul setelah pesanan
  berjalan butuh order_id sendiri (skema nonce sudah mendukung).
- **Notifikasi belum punya halaman admin.** `NotificationLog` bisa dibaca lewat
  Prisma Studio; belum ada tab riwayat pesan per pesanan/klien.
- **Belum ada "lupa sandi".** Masuk sudah email + sandi dan pendaftaran langsung
  membuat sandi, tapi tidak ada alur reset mandiri: sandi akun yang sudah ada hanya
  bisa dipasang lewat `npm run account:password` (butuh akses ke basis data).
  Tautan reset sejati tetap menuntut SMTP yang benar-benar terkirim.
- **Pendaftaran lewat sandi belum membuktikan kepemilikan email.** Selama SMTP
  mati, `registerWithPasswordAction` menyimpan akun tanpa `emailVerified`, jadi
  siapa pun bisa mengklaim email orang lain sebagai akun miliknya sendiri —
  yang terpengaruh hanya tenant buatannya. Risiko naik kalau Google OAuth
  diaktifkan: Auth.js menautkan akun Google ke baris `User` beremail sama, sehingga
  klaim lebih dulu bisa menumpang identitas. Aktifkan SMTP + verifikasi email,
  atau biarkan `GOOGLE_CLIENT_ID` kosong, sebelum pendaftaran dibuka untuk publik.
- Midtrans hanya memakai Snap Redirect (`redirect_url`), jadi `MIDTRANS_CLIENT_KEY`
  tidak dibaca kode. Embedded JS/popup perlu client key di sisi klien.
- Cron bergantung pada GitHub Actions (`.github/workflows/cron.yml`). GitHub
  menghentikan schedule pada repo yang 60 hari tanpa commit, dan tick bisa molor beberapa
  menit di jam sibuk — belum ada alarm kalau sebuah tick gagal. Scheduler lain tetap bisa
  dipakai selama mengirim `Authorization: Bearer ${CRON_SECRET}` ke tiga rute itu.
- Pembayaran otomatis mengonfirmasi booking, tapi belum mengirim invoice/resi
  (PDF) dan belum ada penagihan deposit berulang.

Sisa dari Fase 5 (sengaja tidak dipaksakan supaya fase tidak melebar):

- **Deposit yang dipotong tidak menghasilkan bukti potong.** Form pengembalian
  menyimpan `damageFee`/`lateFee` dan `depositStatus`, tapi potongan yang tidak
  kembali ke pelanggan tidak ditulis sebagai baris uang keluar — hanya `depositRefunded`
  dan `Payment` `REFUNDED` untuk bagian yang dikembalikan.
- **Denda tidak menagih sendiri.** Setelah `COMPLETED`, sisa + denda tampil di halaman
  pembayaran dan bisa dicatat manual, tapi pelanggan tidak bisa membayar denda lewat
  Midtrans (butuh order_id khusus, lihat Fase 4) dan tidak ada pengingat denda.
- **Kalender armada hanya 14 hari** dan mulai dari hari ini (bisa digeser
  `±14` lewat `?mulai=`); belum ada zoom minggu/bulan dan belum bisa drag untuk
  memindahkan pesanan.
- **Checklist tidak mengunci angka akhir.** Odometer & foto bisa diulang berapa pun
  kali; versi terbaru yang dibandingkan, dan tidak ada audit "siapa mengubah apa".
- **Verifikasi dokumen belum mengalir ke halaman publik.** Status terverifikasi hanya
  tampak di admin; pelanggan yang dokumennya ditolak tidak diberi tahu (butuh template
  WhatsApp + alasan penolakan).

Sisa dari Fase 6 (sengaja tidak dipaksakan supaya fase tidak melebar):

- **Keluar / ubah peran staf belum ada.** Pengaturan bisa mengundang dan melihat
  daftar, tapi belum ada tombol "cabut akses" atau naik/turun peran ADMIN ↔ STAFF;
  satu-satunya jalan mencabut akses saat ini lewat Prisma Studio.
- **Tagihan langganan belum bisa diunduh.** Invoice tampil di halaman Langganan dan
  bisa dilunasi, tapi belum ada PDF/resi; laporan bulanan pun hanya CSV.
- **Belum ada siklus tahunan.** `Plan.priceMonthly` satu-satunya harga dan cron
  membuat tagihan per periode bulanan; paket tahunan butuh kolom harga sendiri.
- **Tarif antar-jemput masih di luar pengaturan.** Profil rental menyimpan nama,
  slug, kota, kontak, logo, jam, dan syarat sewa — biaya antar-jemput (lihat sisa
  Fase 3) belum punya field, jadi checkout publik tetap memakai `0`.
- **Riwayat notifikasi belum berhalaman.** Surat pengingat langganan yang terkirim
  tercatat di `NotificationLog` (bisa dibaca lewat Prisma Studio) tapi belum tampil
  di admin.

Di luar itu:

- E2E alur pemesanan di CI (sampai Fase 6 verifikasi dilakukan manual lewat
  browser + curl); unit test pricing/quote/booking-code/schedule/datetime,
  rekonsiliasi pembayaran, tanda tangan Midtrans, template WhatsApp, mesin status,
  handover, denda/deposit, tagihan & siklus langganan, laporan/CSV sudah ada.
