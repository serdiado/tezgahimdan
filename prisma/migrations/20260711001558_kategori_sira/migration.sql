-- AlterTable
ALTER TABLE "Kategori" ADD COLUMN     "sira" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
