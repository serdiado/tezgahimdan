-- AlterEnum
ALTER TYPE "SayfaModulTuru" ADD VALUE 'magaza_hero_whatsapp';
ALTER TYPE "SayfaModulTuru" ADD VALUE 'magaza_hero_kroki';
ALTER TYPE "SayfaModulTuru" ADD VALUE 'magaza_hero_puan';

-- CreateEnum
CREATE TYPE "SayfaModulSayfasi" AS ENUM ('anasayfa', 'magaza_hero');

-- AlterTable
ALTER TABLE "SayfaModulu" ADD COLUMN     "sayfa" "SayfaModulSayfasi" NOT NULL DEFAULT 'anasayfa';

-- DropIndex
DROP INDEX "SayfaModulu_tur_key";

-- CreateIndex
CREATE UNIQUE INDEX "SayfaModulu_sayfa_tur_key" ON "SayfaModulu"("sayfa", "tur");
