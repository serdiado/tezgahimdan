-- AlterTable
ALTER TABLE "Magaza" ADD COLUMN     "krokiFotoUrl" TEXT,
ADD COLUMN     "tezgahBilgisi" TEXT;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
