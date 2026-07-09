-- AlterTable
ALTER TABLE "Pazar" ADD COLUMN     "aciklama" TEXT,
ADD COLUMN     "belediyeAdi" TEXT,
ADD COLUMN     "hatirlatmaGunu" "HaftaGunu",
ADD COLUMN     "hatirlatmaSaati" TIME,
ADD COLUMN     "islemSonGunu" "HaftaGunu",
ADD COLUMN     "islemSonSaati" TIME,
ADD COLUMN     "sorumluAdi" TEXT,
ADD COLUMN     "sorumluTelefon" TEXT,
ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;
