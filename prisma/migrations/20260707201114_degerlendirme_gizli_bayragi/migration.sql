-- AlterTable
ALTER TABLE "Degerlendirme" ADD COLUMN     "gizliMi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MagazaDegerlendirme" ADD COLUMN     "gizliMi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
