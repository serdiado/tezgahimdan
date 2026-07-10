-- Bildirim silme/temizleme (2026-07-10): kullanici kendi bildirimini listeden
-- kaldirabilir. Kalici silme yok (proje ilkesi) - soft-delete bayragi.
ALTER TABLE "Bildirim" ADD COLUMN "silindiMi" BOOLEAN NOT NULL DEFAULT false;
