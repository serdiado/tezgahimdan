-- AlterTable
ALTER TABLE "Bildirim" ADD COLUMN     "hedefYolu" TEXT;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
