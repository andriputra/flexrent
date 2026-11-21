-- Anti double booking di level database.
-- Dua booking aktif (PENDING/CONFIRMED/ONGOING) tidak boleh menumpang
-- kendaraan yang sama pada rentang waktu yang bersentuhan.
-- Batas atas bersifat eksklusif: booking yang berakhir 10:00 tidak bentrok
-- dengan booking yang mulai 10:00 di hari yang sama.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_time_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'ONGOING'));

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_period_is_valid"
  CHECK ("endsAt" > "startsAt");

ALTER TABLE "maintenance_plans"
  ADD CONSTRAINT "maintenance_plans_period_is_valid"
  CHECK ("endsAt" > "startsAt");
