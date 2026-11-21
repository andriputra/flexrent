-- AlterTable: sandi opsional untuk masuk lewat email + kata sandi.
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
