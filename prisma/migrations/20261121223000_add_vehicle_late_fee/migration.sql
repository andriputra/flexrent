-- AlterTable: denda keterlambatan per hari dapat diatur per kendaraan.
ALTER TABLE "vehicles" ADD COLUMN "lateFeeDaily" INTEGER;
