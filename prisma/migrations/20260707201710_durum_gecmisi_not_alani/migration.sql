-- AlterTable
ALTER TABLE "DurumGecmisi" ADD COLUMN     "not" TEXT;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
