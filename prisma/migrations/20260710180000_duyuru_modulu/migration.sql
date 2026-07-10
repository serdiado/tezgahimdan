-- Duyuru modulu (2026-07-10): admin editoryal duyurulari (uzun icerik) icin
-- ayri tablo + Bildirim'e duyuru pointer'i.
CREATE TYPE "DuyuruTuru" AS ENUM ('bilgi', 'egitim', 'uyari');

CREATE TABLE "Duyuru" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "govde" TEXT NOT NULL,
    "gorselUrl" TEXT,
    "tur" "DuyuruTuru" NOT NULL DEFAULT 'bilgi',
    "hedefKitle" TEXT NOT NULL,
    "yayinlandiMi" BOOLEAN NOT NULL DEFAULT false,
    "yayinTarihi" TIMESTAMP(3),
    "gonderilenSayisi" INTEGER NOT NULL DEFAULT 0,
    "olusturanId" TEXT NOT NULL,
    "silindiMi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeZamani" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Duyuru_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Duyuru" ADD CONSTRAINT "Duyuru_olusturanId_fkey"
    FOREIGN KEY ("olusturanId") REFERENCES "Kullanici"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Bildirim" ADD COLUMN "duyuruId" TEXT;

ALTER TABLE "Bildirim" ADD CONSTRAINT "Bildirim_duyuruId_fkey"
    FOREIGN KEY ("duyuruId") REFERENCES "Duyuru"("id") ON DELETE SET NULL ON UPDATE CASCADE;
