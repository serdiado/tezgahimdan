-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- CreateTable
CREATE TABLE "MagazaTakip" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "magazaId" TEXT NOT NULL,
    "takipMi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagazaTakip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Degerlendirme" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "urunId" TEXT NOT NULL,
    "puan" INTEGER NOT NULL,
    "yorum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeZamani" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Degerlendirme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagazaTakip_kullaniciId_magazaId_key" ON "MagazaTakip"("kullaniciId", "magazaId");

-- CreateIndex
CREATE UNIQUE INDEX "Degerlendirme_kullaniciId_urunId_key" ON "Degerlendirme"("kullaniciId", "urunId");

-- AddForeignKey
ALTER TABLE "MagazaTakip" ADD CONSTRAINT "MagazaTakip_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazaTakip" ADD CONSTRAINT "MagazaTakip_magazaId_fkey" FOREIGN KEY ("magazaId") REFERENCES "Magaza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Degerlendirme" ADD CONSTRAINT "Degerlendirme_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Degerlendirme" ADD CONSTRAINT "Degerlendirme_urunId_fkey" FOREIGN KEY ("urunId") REFERENCES "Urun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
