-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- CreateTable
CREATE TABLE "PlatformAyarlari" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "guvenilirlikEsigi" INTEGER NOT NULL DEFAULT 3,
    "maxYedek" INTEGER NOT NULL DEFAULT 5,
    "guncellenmeZamani" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAyarlari_pkey" PRIMARY KEY ("id")
);
