# Değerlendirme/Yorum Sistemi

## Bağlam

PLAN.md'de bilinçli bir Faz-2 ertelemesi olarak işaretlenmişti ("değerlendirme/
yorum" — online ödeme, kargo gibi diğer Faz-2 kalemleriyle aynı cümlede).
Favori/Beğeni sisteminden sonra önerilen 4 ek özellikten biri olarak, kart
tasarımı sabitlendikten SONRA yapıldı (yorum sistemi karta/modala yeni görsel
öğe — yıldız göstergesi — eklediği için).

## Kim değerlendirebilir — "sadece gerçekten satın alan" kararı

Kullanıcının açık kararı: **SADECE** `Rezervasyon.durum="satildi"` VE
`aliciId=kullanıcı` olan bir kaydı varsa değerlendirme/yorum bırakabilir. Bu
kural DB seviyesinde bir FK ile ifade edilemez (Degerlendirme'nin Rezervasyon'a
değil doğrudan Urun'e bağlı olması gerekiyor — bir kullanıcı aynı ürünü birden
fazla kez alabilir, ürün-kullanıcı çifti tekil olmalı, hangi rezervasyondan
geldiği önemli değil). Bu yüzden kural **API katmanında** (`src/app/api/
degerlendirme/route.ts` → `src/lib/degerlendirme.ts:degerlendirmeUpsert`)
`Rezervasyon.findFirst({urunId, aliciId, durum:"satildi"})` ile (salt-okunur,
kilitsiz) doğrulanıyor. Rezervasyon motoruna (`rezervasyon.ts`) hiç çağrı
yapılmıyor.

Gerekçe: platform zaten rezervasyon tabanlı, "satıldı" durumu güvenilir bir
satın-alma kanıtı — sahte/gelişigüzel yorum riskini ortadan kaldırıyor
(alternatif "herkese açık" seçeneği kullanıcı tarafından reddedildi).

## Veri modeli — upsert, hiç hard-delete yok

```prisma
model Degerlendirme {
  id                String   @id @default(uuid())
  kullaniciId       String
  urunId            String
  puan              Int      // 1-5, DB'de kisitlanmiyor - proje genelindeki
                              // diger validasyonlar (fiyat>0, stok>=1) gibi
                              // SADECE API route'unda kontrol edilir
  yorum             String?
  createdAt         DateTime @default(now())
  guncellenmeZamani DateTime @updatedAt
  @@unique([kullaniciId, urunId])
}
```

Kullanıcının açık kararı: puanını/yorumunu SONRADAN güncelleyebilir (upsert —
begeni/takip toggle'ıyla aynı mantık). `@@unique([kullaniciId, urunId])` tek
satır garantisi verir; güncelleme aynı satırın üzerine yazar, yeni satır
oluşturmaz — "hiçbir kayıt kalıcı silinmez" ilkesiyle tutarlı (silme diye bir
şey yok, sadece güncelleme var).

## "Değerlendir" butonu neden `/rezervasyonum`'da, ürün kartında değil

Alternatif: ürün kartı/detay modalında herkese açık bir "Değerlendir" butonu,
sadece satın alan kullanıcı için aktif. Reddedildi çünkü:

1. Kart/detay modalı HERKESE açık (girişsiz dahil) genel vitrin bileşenleri —
   oraya "bu kullanıcı satın aldı mı" kontrolünü sokmak her kart render'ında
   gizli bir yetki sorgusu (N+1 potansiyeli) gerektirirdi.
2. `/rezervasyonum` zaten SADECE kullanıcının kendi rezervasyonlarını
   (`aliciId=session.user.id`) çekiyor — `durum==="satildi"` filtresi bu
   listede bedavaya geliyor, ekstra sorgu gerekmiyor.
3. Amazon/Trendyol gibi tanıdık bir desen: "siparişlerim → değerlendir".

## Gösterim — kart vs detay modalı ayrımı

- **Kart** (`UrunKarti.tsx`): sadece `YildizGosterge` (kompakt, ortalama+sayı).
  Yorum METİNLERİ kartta YOK (alan sınırlı).
- **Detay modalı** (`UrunDetayModal.tsx`): `YildizGosterge` (büyük) + altında
  yazılı yorumların tam listesi (kullanıcı adı, yıldız, yorum, tarih).
  Sayfalama YOK (kullanıcıyla netleşen kapsam — ürün başına yorum sayısının
  küçük kalacağı varsayımıyla).

`degerlendirmeSayisi===0` olan ürünlerde `YildizGosterge` HİÇ render edilmiyor
(begeniSayisi===0 için karttaki gizleme ilkesiyle aynı — gereksiz "0 yıldız"
UI gürültüsü olmasın).

## N+1 önleme — toplu sorgu + Map deseni

Projenin genelindeki `begeniSayilariHaritasi`/`kullaniciFavoriHaritasi` deseniyle
birebir tutarlı üç yeni fonksiyon (`src/lib/degerlendirme.ts`):
- `degerlendirmeOzetiHaritasi(urunIdler)` — `groupBy` + `_avg`/`_count` + Map.
- `urunYorumlariHaritasi(urunIdler)` — vitrin sayfalarında (mağaza sayfası,
  ana sayfa) TOPLU sorgu, tek tek `urunYorumlariniGetir(urunId)` çağırıp N+1
  yaratmak yerine.
- `kullaniciDegerlendirmeleriHaritasi(kullaniciId, urunIdler)` —
  `/rezervasyonum`'da "Değerlendirmeni Düzenle" butonunun formu önceden
  doldurması için (kullanıcının o ürünlere daha önce yaptığı değerlendirmeler).

## Canlı doğrulanan senaryolar (psql + Preview MCP)

- Satın almamış kullanıcı POST → 403 ("önce satın almış olmalısınız").
- Satın almış kullanıcı POST (puan=4) → 200, satır oluştu.
- Aynı kullanıcı tekrar POST (puan=5, farklı yorum) → 200, satır SAYISI
  değişmedi (upsert doğrulandı, `count=1`).
- İki farklı değerlendirme (5 ve 3 puan) → ortalama psql `avg()` ile 4.0
  olarak elle hesaplanıp Prisma'nın `_avg` sonucuyla karşılaştırıldı, eşleşti.
- `/rezervasyonum`'da "Değerlendirmeni Düzenle" butonu (mevcut değerlendirme
  varsa metin değişiyor) → modal açıldı, 5 yıldız + mevcut yorum ÖNCEDEN
  DOLU geldi (düzenleme modu doğrulandı).
- Mağaza sayfasında kart "4.0 (2)" gösterdi, detay modalında iki yorum da
  (kullanıcı adları dahil) listelendi.
