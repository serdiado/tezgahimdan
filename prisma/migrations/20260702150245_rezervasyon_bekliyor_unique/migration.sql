-- Prisma's schema DSL cannot express a partial (filtered) unique index, so this
-- migration is hand-written. Business rule (PLAN.md SS3, "cift rezervasyon olmaz"):
-- a buyer may not hold more than one 'bekliyor' reservation on the same product
-- at once. Other statuses (satildi/gelmedi/iptal) are historical and must NOT be
-- constrained, otherwise a buyer could never re-reserve after a cancellation.
CREATE UNIQUE INDEX "Rezervasyon_urunId_aliciId_bekliyor_unique_idx"
ON "Rezervasyon" ("urunId", "aliciId")
WHERE "durum" = 'bekliyor'::"RezervasyonDurumu";
