-- DropForeignKey
ALTER TABLE "Bildirim" DROP CONSTRAINT "Bildirim_urunId_fkey";

-- AlterTable
ALTER TABLE "Bildirim" ALTER COLUMN "urunId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- AddForeignKey
ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_urunId_fkey" FOREIGN KEY ("urunId") REFERENCES "Urun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
