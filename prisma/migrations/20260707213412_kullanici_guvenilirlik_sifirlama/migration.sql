-- AlterTable
ALTER TABLE "Kullanici" ADD COLUMN     "guvenilirlikSifirlamaTarihi" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
