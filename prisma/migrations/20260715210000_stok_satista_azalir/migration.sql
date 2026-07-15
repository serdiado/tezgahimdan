-- Stok modeli degisikligi (2026-07-15): "stokAdedi" artik OMUR BOYU toplam degil,
-- "su an elde kac tane var" demek. Satis aninda motor stogu 1 dusuruyor
-- (bkz. src/lib/rezervasyon.ts sonuclandir), boylece kalan birim dogrudan
-- stokAdedi oluyor.
--
-- NEDEN: eski modelde kalanBirim = stokAdedi - satildiSayisi idi ve satildiSayisi
-- HAFTA FILTRESIZ sayiliyordu. Satici haftaya yeni mal getirdiginde urunu geri
-- getirmenin yolu yoktu: satildiSayisi >= stokAdedi olunca durum='satildi'
-- yaziliyordu, urunGuncelle durum'a dokunmuyordu ve haftalik sifirlama
-- 'satildi'yi bilerek atliyordu -> urun sonsuza kadar satisa kapali kaliyordu
-- (canli dogrulandi). Detay: docs/mimari/rezervasyon-motoru.md "Stok modeli".
--
-- GERI ALMA (rollback): bu migration veri kaybettirmez ama geri donusu manuel -
-- eski semantige donmek icin stokAdedi'ye satildiSayisi geri EKLENMELIDIR.

-- Mevcut satirlari yeni semantige tasi: kalan = eski stok - satilan.
-- GREATEST(...,0): eski INVARIANT (satildi <= stok) geregi negatif cikmamali,
-- yine de bozuk bir satir migration'i patlatmasin - 0'a sabitlenir.
UPDATE "Urun" u
SET "stokAdedi" = GREATEST(
  u."stokAdedi" - (
    SELECT count(*) FROM "Rezervasyon" r
    WHERE r."urunId" = u."id" AND r."durum" = 'satildi'
  ), 0)::int;

-- Tutarlilik: stogu bitmis her urun 'satildi' olmali (eski modelde de oyleydi,
-- burada sadece garantiye aliniyor). Tersi YAPILMAZ - stogu olan ama 'satildi'
-- isaretli urunler tam da bu hatanin kurbanlari; onlari otomatik acmak yerine
-- saticinin stok girmesine birakiyoruz (yanlislikla satisa acilan urun,
-- gelmeyecegi bir tezgaha alici gonderir).
UPDATE "Urun" SET "durum" = 'satildi'
WHERE "stokAdedi" <= 0 AND "durum" <> 'satildi';
