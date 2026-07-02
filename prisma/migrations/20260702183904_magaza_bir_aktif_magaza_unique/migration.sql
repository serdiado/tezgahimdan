-- Prisma'nin sema dili partial (filtreli) unique index'i ifade edemiyor (bkz.
-- Rezervasyon_urunId_aliciId_bekliyor_unique_idx icin ayni gerekce). Kural: bir
-- satici ayni anda en fazla 1 aktif (silindiMi = false) magazaya sahip olabilir.
-- Bu, magaza-olustur akisindaki check-then-act yarisini (iki ayri istek ayni
-- saticiya iki magaza olusturabilirdi) DB seviyesinde kapatir.
CREATE UNIQUE INDEX "Magaza_sahipId_aktif_unique_idx"
ON "Magaza" ("sahipId")
WHERE "silindiMi" = false;
