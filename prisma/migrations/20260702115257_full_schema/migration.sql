-- CreateEnum
CREATE TYPE "HaftaGunu" AS ENUM ('Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar');

-- CreateEnum
CREATE TYPE "KullaniciRolu" AS ENUM ('satici', 'alici', 'admin');

-- CreateEnum
CREATE TYPE "UrunDurumu" AS ENUM ('sergide', 'doldu', 'satildi');

-- CreateEnum
CREATE TYPE "RezervasyonTipi" AS ENUM ('aktif', 'yedek');

-- CreateEnum
CREATE TYPE "RezervasyonDurumu" AS ENUM ('bekliyor', 'satildi', 'gelmedi', 'iptal');

-- CreateEnum
CREATE TYPE "SikayetDurumu" AS ENUM ('bekliyor', 'inceleniyor', 'cozuldu', 'reddedildi');

-- AlterTable
ALTER TABLE "Kullanici" ADD COLUMN     "rol" "KullaniciRolu" NOT NULL DEFAULT 'alici';

-- CreateTable
CREATE TABLE "Pazar" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "bolge" TEXT NOT NULL,
    "sifirlamaGunu" "HaftaGunu" NOT NULL,
    "sifirlamaSaati" TIME NOT NULL,
    "saatDilimi" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pazar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Magaza" (
    "id" TEXT NOT NULL,
    "sahipId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aciklama" TEXT,
    "whatsappNo" TEXT NOT NULL,
    "pazarId" TEXT NOT NULL,
    "silindiMi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Magaza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Urun" (
    "id" TEXT NOT NULL,
    "magazaId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "fiyat" DECIMAL(10,2) NOT NULL,
    "stokAdedi" INTEGER NOT NULL DEFAULT 1,
    "fotograflar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durum" "UrunDurumu" NOT NULL DEFAULT 'sergide',
    "silindiMi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Urun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rezervasyon" (
    "id" TEXT NOT NULL,
    "urunId" TEXT NOT NULL,
    "aliciId" TEXT NOT NULL,
    "tip" "RezervasyonTipi" NOT NULL,
    "siraNo" INTEGER NOT NULL,
    "durum" "RezervasyonDurumu" NOT NULL DEFAULT 'bekliyor',
    "rezervKodu" TEXT NOT NULL,
    "pazarHaftasi" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rezervasyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DurumGecmisi" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "varlikTuru" TEXT NOT NULL,
    "varlikId" TEXT NOT NULL,
    "olay" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DurumGecmisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sikayet" (
    "id" TEXT NOT NULL,
    "sikayetciId" TEXT NOT NULL,
    "hedefUrunId" TEXT,
    "hedefMagazaId" TEXT,
    "sebep" TEXT NOT NULL,
    "durum" "SikayetDurumu" NOT NULL DEFAULT 'bekliyor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sikayet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Magaza_slug_key" ON "Magaza"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Rezervasyon_rezervKodu_key" ON "Rezervasyon"("rezervKodu");

-- AddForeignKey
ALTER TABLE "Magaza" ADD CONSTRAINT "Magaza_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Magaza" ADD CONSTRAINT "Magaza_pazarId_fkey" FOREIGN KEY ("pazarId") REFERENCES "Pazar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urun" ADD CONSTRAINT "Urun_magazaId_fkey" FOREIGN KEY ("magazaId") REFERENCES "Magaza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urun" ADD CONSTRAINT "Urun_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rezervasyon" ADD CONSTRAINT "Rezervasyon_urunId_fkey" FOREIGN KEY ("urunId") REFERENCES "Urun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rezervasyon" ADD CONSTRAINT "Rezervasyon_aliciId_fkey" FOREIGN KEY ("aliciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DurumGecmisi" ADD CONSTRAINT "DurumGecmisi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sikayet" ADD CONSTRAINT "Sikayet_sikayetciId_fkey" FOREIGN KEY ("sikayetciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sikayet" ADD CONSTRAINT "Sikayet_hedefUrunId_fkey" FOREIGN KEY ("hedefUrunId") REFERENCES "Urun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sikayet" ADD CONSTRAINT "Sikayet_hedefMagazaId_fkey" FOREIGN KEY ("hedefMagazaId") REFERENCES "Magaza"("id") ON DELETE SET NULL ON UPDATE CASCADE;
