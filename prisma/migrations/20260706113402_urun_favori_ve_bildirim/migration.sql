-- AlterTable
ALTER TABLE "Pazar" ALTER COLUMN "baslangicSaati" SET DEFAULT '09:00:00'::time;

-- CreateTable
CREATE TABLE "UrunFavori" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "urunId" TEXT NOT NULL,
    "begeniMi" BOOLEAN NOT NULL DEFAULT false,
    "takipMi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UrunFavori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bildirim" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "urunId" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "okunduMu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bildirim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UrunFavori_kullaniciId_urunId_key" ON "UrunFavori"("kullaniciId", "urunId");

-- CreateIndex
CREATE INDEX "Bildirim_kullaniciId_okunduMu_idx" ON "Bildirim"("kullaniciId", "okunduMu");

-- AddForeignKey
ALTER TABLE "UrunFavori" ADD CONSTRAINT "UrunFavori_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrunFavori" ADD CONSTRAINT "UrunFavori_urunId_fkey" FOREIGN KEY ("urunId") REFERENCES "Urun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_urunId_fkey" FOREIGN KEY ("urunId") REFERENCES "Urun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
