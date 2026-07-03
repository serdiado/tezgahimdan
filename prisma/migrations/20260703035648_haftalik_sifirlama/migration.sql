-- Pazar: baslangic (ceza esigi) alanlari
ALTER TABLE "Pazar" ADD COLUMN "baslangicGunu" "HaftaGunu" NOT NULL DEFAULT 'Carsamba';
ALTER TABLE "Pazar" ADD COLUMN "baslangicSaati" TIME NOT NULL DEFAULT '09:00:00'::time;

-- Rezervasyon: aktif olma zamani + bildirim izi
ALTER TABLE "Rezervasyon" ADD COLUMN "aktifOlmaZamani" TIMESTAMP(3);
ALTER TABLE "Rezervasyon" ADD COLUMN "bildirimGonderildi" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Rezervasyon" ADD COLUMN "bildirimKanali" TEXT;

-- Backfill: mevcut aktif rezervasyonlarin aktifOlmaZamani'ni createdAt yap
-- (yaklasik ama makul - eski veri icin baslangic karsilastirmasi anlamli kalsin).
UPDATE "Rezervasyon" SET "aktifOlmaZamani" = "createdAt" WHERE "tip" = 'aktif';

-- PazarSifirlama tablosu (idempotency + audit)
CREATE TABLE "PazarSifirlama" (
    "id" TEXT NOT NULL,
    "pazarId" TEXT NOT NULL,
    "pazarHaftasi" DATE NOT NULL,
    "calismaZamani" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etkilenenSayi" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PazarSifirlama_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PazarSifirlama_pazarId_pazarHaftasi_key" ON "PazarSifirlama"("pazarId", "pazarHaftasi");
ALTER TABLE "PazarSifirlama" ADD CONSTRAINT "PazarSifirlama_pazarId_fkey" FOREIGN KEY ("pazarId") REFERENCES "Pazar"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
