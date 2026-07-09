-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- AlterTable
ALTER TABLE "Rezervasyon" ADD COLUMN     "saticiIhmalUyarisiGonderildi" BOOLEAN NOT NULL DEFAULT false;
