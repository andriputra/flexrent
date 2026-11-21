# Flexrent

SaaS penyewaan motor & mobil untuk rental lokal. Setiap rental (tenant) punya
halaman admin sendiri dan satu halaman publik `/{slug}` untuk menerima pesanan.

Fase yang sudah jalan di repo ini: **Fase 1 (fondasi)**, **Fase 2 (armada &
perawatan)**, **Fase 3 (halaman publik & booking)**, **Fase 4 (pembayaran Midtrans
+ pencatatan manual, notifikasi WhatsApp, cron)**, dan **Fase 5 (operasional
harian: status pesanan, kalender armada, checklist serah-terima, denda & deposit,
halaman pelanggan)**. Laporan, pengaturan tenant, dan undangan staf ada di fase
berikutnya — lihat bagian **Belum dikerjakan**.

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
                                    pembayaran
  app/api/auth/[...nextauth]/       route handler Auth.js
  app/api/dokumen/[id]/             baca KTP/SIM lewat tautan bertanda tangan
  app/api/webhooks/midtrans/        callback pembayaran (verifikasi + idempoten)
  app/api/cron/booking-expired/     expire PENDING lewat batas waktu
  app/api/cron/booking-reminders/   pengingat H-1, hampir selesai, terlambat
  components/                       ui/ (primitif), shared/, dashboard/, vehicles/,
                                    bookings/, customers/, maintenance/, auth/,
                                    marketing/, public/, payments/
  lib/
    auth.ts                         konfigurasi Auth.js + magic link
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
    schedule.ts                     konversi durasi <-> tanggal, bentrok slot
    datetime.ts                     semua perhitungan tanggal pakai WIB
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
- Midtrans hanya memakai Snap Redirect (`redirect_url`), jadi `MIDTRANS_CLIENT_KEY`
  tidak dibaca kode. Embedded JS/popup perlu client key di sisi klien.
- Cron mengandalkan Vercel Cron (`vercel.json`). Di host lain, ganti dengan
  scheduler yang mengirim `Authorization: Bearer ${CRON_SECRET}` ke dua rute itu.
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

Di luar itu:

- Laporan, pengaturan tenant, dan undangan staf.
- E2E alur pemesanan di CI (sampai Fase 5 verifikasi dilakukan manual lewat
  browser + curl); unit test pricing/quote/booking-code/schedule/datetime,
  rekonsiliasi pembayaran, tanda tangan Midtrans, template WhatsApp, mesin status,
  handover, dan denda/deposit sudah ada.
