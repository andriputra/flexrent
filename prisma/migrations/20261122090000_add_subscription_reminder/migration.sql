-- Pengingat langganan (H-7/H-3/H-1 dan telat bayar) ikut dicatat di log notifikasi.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_REMINDER';
