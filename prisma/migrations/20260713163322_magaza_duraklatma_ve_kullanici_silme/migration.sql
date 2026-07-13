-- AlterTable
ALTER TABLE "Kullanici" ADD COLUMN     "silindiMi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Magaza" ADD COLUMN     "duraklatildiMi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
