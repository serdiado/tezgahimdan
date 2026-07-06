# Mağaza Takibi + İlişkili Genişlemeler (Fiyat Düşüşü, En Çok Beğenilenler)

## Bağlam

Favori/Beğeni/Bildirim sisteminin (bkz. `docs/mimari/` — bu dosya o sistemin
üzerine 3 küçük genişleme ekliyor) ardından kullanıcı 4 ek özellik istedi.
Bunlardan üçü (mağaza takibi, fiyat düşüşü bildirimi, en çok beğenilenler
vitrini) burada; dördüncüsü (değerlendirme/yorum sistemi) ayrı, daha büyük bir
karar olduğu için `docs/mimari/degerlendirme-sistemi.md`'de.

## Mağaza Takibi — neden `UrunFavori`'yi genişletmek yerine ayrı tablo

`UrunFavori` modelinde `begeniMi`/`takipMi` iki bağımsız bayrak aynı satırda
duruyor çünkü ikisi de AYNI hedefe (ürün) bakıyor. Mağaza takibi kavramsal
olarak farklı bir hedefi (Magaza) işaret ediyor. İki seçenek değerlendirildi:

- **(A) Ayrı `MagazaTakip` tablosu** — seçilen yol.
- **(B) `UrunFavori.urunId`'yi nullable yapıp `magazaId` eklemek** (Sikayet
  modelindeki `hedefUrunId`/`hedefMagazaId` XOR deseni gibi) — reddedildi:
  `favoriToggle`/`begeniSayilariHaritasi`/`kullaniciFavoriHaritasi` gibi HER
  mevcut sorgunun "urunId null olabilir" ihtimaline karşı gözden geçirilmesini
  gerektirirdi; ayrıca mağaza takibinin `begeniMi` karşılığı olmadığı için
  satırın yarısı hep anlamsız kalırdı.

```prisma
model MagazaTakip {
  id          String    @id @default(uuid())
  kullaniciId String
  magazaId    String
  takipMi     Boolean   @default(true)  // silmek yerine false yapilir
  createdAt   DateTime  @default(now())
  @@unique([kullaniciId, magazaId])
}
```

`takipMi: Boolean` (tek bayrak olsa da) `UrunFavori` ile simetrik tutuldu —
"hiçbir kayıt kalıcı silinmez" ilkesiyle uyumlu: takibi bırakmak `false` yapmak,
satır silinmiyor.

## Bildirim tetikleme — motor/lib fonksiyonları SAF kalıyor

`src/lib/urun.ts`'teki `urunEkle()` (hem satıcı hem admin route'u tarafından
paylaşılan fonksiyon) hiç değiştirilmedi. Bildirim, HER İKİ route'ta
(`/api/panel/urun-ekle`, `/api/admin/magaza-urun-ekle`) `urunEkle()` başarıyla
döndükten SONRA, yeni `bildirimGonderMagazaTakipcilerine()` (`src/lib/bildirim.ts`)
ile tetikleniyor — mevcut `bildirimGonderTakipcilere` deseninin (motor çağrısı
bittikten sonra, kilit dışında) birebir aynısı, farklı kaynak tablo
(`MagazaTakip` vs `UrunFavori`) için küçük bir ikiz fonksiyon (genel/parametrik
bir soyutlama yerine).

## Fiyat Düşüşü Bildirimi — yeni fonksiyon YOK, mevcut yeniden kullanıldı

`bildirimGonderTakipcilere` zaten ürün-bazlı (`UrunFavori.takipMi` okuyor) —
tam ihtiyaç buydu. `src/app/api/panel/urun-duzenle/route.ts`'te `mevcutUrun`
zaten transaction ÖNCESİ (kilitsiz) fetch ediliyordu (sahiplik kontrolü için);
bu değer artık fiyat karşılaştırması için de kullanılıyor. Karşılaştırma
motor kilidinin (`FOR UPDATE`) DIŞINDA yapılıyor — bildirim audit değil, UX
sinyali olduğu için kritik-bölge süresini uzatmamak önceliklendirildi. Sadece
DÜŞÜŞTE (`yeniFiyat < eskiFiyat`) tetiklenir.

## En Çok Beğenilenler Vitrini — mevcut bileşen yeniden kullanıldı

`src/app/YeniEklenenler.tsx` zaten jenerik (`urunler: YeniUrunVeri[]` alıyor,
"yeni ürün" kavramına bağımlı değil) — yeni bileşen yazılmadı, aynı bileşen
`src/app/page.tsx`'te ikinci kez, farklı veri+başlıkla render ediliyor.

Sıralama Prisma'nın resmi desteklediği `groupBy` + `orderBy:{_count:{alan:
"desc"}}` deseniyle yapılıyor (`src/lib/favori.ts:enCokBegenilenUrunIdleriGetir`)
— tahmin değil, `src/generated/prisma/index.d.ts`'teki tip tanımlarıyla
doğrulandı. Bu fonksiyon GÖRÜNÜRLÜK FİLTRESİ (silindiMi/durum/magaza.gizliMi)
uygulamaz, sadece beğeni-sıralı ID listesi döner — `page.tsx` bu ID'lerle AYRI
bir `Urun.findMany` yapıp "Bu Hafta Eklenenler"deki AYNI görünürlük filtresini
uygular. `findMany({id:{in:...}})` sıra garantisi vermediği için dönen
satırlar `Map`'e konup orijinal beğeni-sırasına göre JS'de geri dizilir.

**Canlı doğrulanan kritik senaryo:** çok beğenilen (5 beğeni) ama `gizliMi:true`
bir mağazanın ürünü vitrinde ÇIKMADI, daha az beğenili (3 beğeni) ama görünür
mağazanın ürünü çıktı — görünürlük filtresi doğru çalışıyor.

## Rezervasyon motoruna dokunuş

**Hiç.** Üç özellik de ya tamamen ayrı tablolar (`MagazaTakip`) üzerinde ya da
salt-okunur `groupBy`/`findMany` sorguları üzerinde çalışıyor. `urun-duzenle`
zaten motorun `FOR UPDATE` kilidini stok tutarlılığı için kullanıyordu (önceki
karar) — bu değişiklik sadece transaction SONRASI bir karşılaştırma ekliyor,
motor fonksiyonuna (`rezervasyon.ts`) hiç çağrı yapmıyor.
