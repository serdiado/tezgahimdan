-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- CreateTable
CREATE TABLE "MagazaDegerlendirme" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "magazaId" TEXT NOT NULL,
    "puan" INTEGER NOT NULL,
    "yorum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeZamani" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagazaDegerlendirme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagazaDegerlendirme_kullaniciId_magazaId_key" ON "MagazaDegerlendirme"("kullaniciId", "magazaId");

-- AddForeignKey
ALTER TABLE "MagazaDegerlendirme" ADD CONSTRAINT "MagazaDegerlendirme_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazaDegerlendirme" ADD CONSTRAINT "MagazaDegerlendirme_magazaId_fkey" FOREIGN KEY ("magazaId") REFERENCES "Magaza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
