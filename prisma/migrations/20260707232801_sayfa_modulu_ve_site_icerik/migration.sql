-- CreateEnum
CREATE TYPE "SayfaModulTuru" AS ENUM ('haftalik_ritim', 'yeni_urunler', 'en_cok_begenilen', 'magaza_listesi');

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- CreateTable
CREATE TABLE "SayfaModulu" (
    "id" TEXT NOT NULL,
    "tur" "SayfaModulTuru" NOT NULL,
    "sira" INTEGER NOT NULL,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "ayarlar" JSONB NOT NULL DEFAULT '{}',
    "guncellenmeZamani" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SayfaModulu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteIcerik" (
    "anahtar" TEXT NOT NULL,
    "deger" TEXT NOT NULL,
    "guncellenmeZamani" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteIcerik_pkey" PRIMARY KEY ("anahtar")
);

-- CreateIndex
CREATE UNIQUE INDEX "SayfaModulu_tur_key" ON "SayfaModulu"("tur");
