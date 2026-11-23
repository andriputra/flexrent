-- Ulasan pelanggan per tenant, dengan antrean moderasi untuk ulasan yang masuk dari halaman publik.
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

CREATE TYPE "TestimonialSource" AS ENUM ('STAFF', 'PUBLIC');

CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "photoUrl" TEXT,
    "photoKey" TEXT,
    "status" "TestimonialStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" "TestimonialSource" NOT NULL DEFAULT 'STAFF',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "testimonials_tenantId_status_occurredAt_idx" ON "testimonials"("tenantId", "status", "occurredAt");
CREATE INDEX "testimonials_vehicleId_idx" ON "testimonials"("vehicleId");

ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
