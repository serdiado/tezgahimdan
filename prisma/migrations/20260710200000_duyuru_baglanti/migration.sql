-- Duyuru CTA baglantisi (2026-07-10): detay sayfasi altindaki opsiyonel eylem
-- butonu (or. "Egitime Git").
ALTER TABLE "Duyuru" ADD COLUMN "baglantiUrl" TEXT;
ALTER TABLE "Duyuru" ADD COLUMN "baglantiMetni" TEXT;
