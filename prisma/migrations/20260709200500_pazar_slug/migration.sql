-- Pazar.slug: herkese acik /pazar/[slug] sayfasi icin (Magaza.slug deseni).
-- Dolu tabloya NOT NULL + UNIQUE kolon tek adimda eklenemez: once nullable
-- ekle, ad'dan backfill et (TR karakter donusumu + slug temizligi), bos/
-- cakisan degerleri coz, SONRA NOT NULL + unique index uygula.
ALTER TABLE "Pazar" ADD COLUMN "slug" TEXT;

-- Backfill: slugTuret (src/lib/slug.ts) ile ayni mantik SQL'de - TR harfleri
-- sadelestir, kucult, alfasayisal-disi her seyi tek tireye indir, uc tireleri kirp.
UPDATE "Pazar" SET "slug" = trim(both '-' from regexp_replace(lower(translate("ad", 'ÇĞİÖŞÜçğıöşü', 'cgiosucgiosu')), '[^a-z0-9]+', '-', 'g'));

-- Ad tamamen ozel karakterlerden olusuyorsa (bos slug) id-tabanli fallback.
UPDATE "Pazar" SET "slug" = 'pazar-' || left("id", 8) WHERE "slug" IS NULL OR "slug" = '';

-- Ayni slug'i ureten pazarlar varsa (ayni ad) 2. ve sonrakilere -2, -3... eki.
WITH sirali AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
  FROM "Pazar"
)
UPDATE "Pazar" p SET "slug" = p."slug" || '-' || s.rn
FROM sirali s WHERE p."id" = s."id" AND s.rn > 1;

ALTER TABLE "Pazar" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Pazar_slug_key" ON "Pazar"("slug");
