# Pazar Yaşam Döngüsü — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#pazar-yaşam-döngüsü-ililçe-serbest-metin--aktifmi-kapanma). Satıcı onboarding ile kesişimi için: [`satici-onboarding.md`](./satici-onboarding.md).

## Karar: `bolge` yerine `il` + `ilce` + `semt?` + `googleHaritaLinki`, serbest metin

Eski tek `bolge` (serbest metin) alanı kaldırıldı; yerine `il` (zorunlu), `ilce`
(zorunlu), `semt` (opsiyonel), `googleHaritaLinki` (zorunlu) geldi. Harita **GÖMÜLMEZ**
— admin Google Maps'ten kopyaladığı paylaşım linkini yapıştırır, mağaza/pazar
sayfalarında bu link yeni sekmede açılır. Gömülü harita (iframe/embed API) bilinçli
olarak reddedildi: API anahtarı yönetimi, kota/maliyet ve ekstra bağımlılık getirirdi;
oysa hedef kullanıcı (alıcı) zaten telefonundaki harita uygulamasında yön tarifi almak
istiyor — dış linke yönlendirmek yeterli ve daha basit (kutsal kural).

## Reddedilen alternatif: Türkiye geneli il/ilçe referans verisi

Bilinçli olarak **eklenmedi** (81 il + ~973 ilçe'lik referans tablosu/dropdown yok).
Gerekçe: pazarlar organik büyümüyor — her biri bir belediyeyle yapılan **gerçek
anlaşma** sonucu admin tarafından **tek tek elle** açılıyor (bkz. `prisma/seed.js`
yorumu: "Pazarlar artık sadece admin panelinden (/admin/pazarlar) elle oluşturulur").
Ulusal ölçekte "her ilçe seçilebilsin" dropdown'u bu iş akışında karşılığı olmayan bir
mühendislik yatırımı olurdu — ne kadar il/ilçe girileceği admin'in eliyle sınırlı,
serbest metin girişi hem yeterli hem de yanlış zamanlama riski taşımıyor (yazım hatası
olsa bile tek bir admin, tek bir pazar için, nadiren düzeltir). İleride gerçekten
ulusal self-servis bir "pazar öner" akışı gelirse bu karar yeniden değerlendirilebilir.

## `Pazar.aktifMi`: eskiden bilgi amaçlıydı, şimdi 3 çalışma-zamanı etkisi var

**Eski davranış:** `aktifMi=false` yapmanın hiçbir çalışma-zamanı etkisi yoktu, salt
bilgi alanıydı.

**Yeni davranış — pasif (`aktifMi=false`) olduğunda üç şey birden olur:**

1. **Vitrinde görünmez.** `src/app/page.tsx`'teki anasayfa mağaza sorgusu ve
   `src/lib/magaza.ts`'teki `getMagazaBySlug` artık `pazar: { aktifMi: true }`
   filtresi taşıyor — o pazara bağlı **tüm** mağazalar (kendileri `gizliMi=false` ve
   `silindiMi=false` olsa bile) anasayfadan ve kendi mağaza sayfalarından düşer.
2. **Satıcı panele giremez.** Yeni `src/app/panel/layout.tsx` (projede ilk kez eklenen
   panel-geneli ortak layout) `getOwnMagaza(userId)` çağırıp `magaza.pazar.aktifMi`
   kontrolü yapıyor; pasifse `/panel/*` altındaki **hiçbir** sayfa yerine "Bu Pazar
   Artık Aktif Değil" mesajı gösteriliyor. Rol/yetki kontrolü bilinçli olarak bu
   layout'a taşınmadı — her sayfa kendi `getSaticiSession()` kontrolünü koruyor
   (`/panel/magaza-ac` özellikle henüz satıcı olmayan `alici` rolü için açık kalmalı,
   bu layout'un eline geçmemesi gerekiyor). Mağazası olmayan kullanıcı (ör. henüz
   onboarding'de olan alıcı) için kontrol devre dışı kalır, sayfa normal render olur.
3. **Yeni mağaza açılışında seçilemez.** `magazaAc()` (`src/lib/magaza.ts`) pazarı
   `where: { id, aktifMi: true }` ile arar; pasif pazar `gecersiz-pazar` döner.

**Kalıcı silme YOK.** Bu sadece bir bayrak — admin dilerse mağaza/satıcı kayıtlarını
ayrıca mevcut `silindiMi`/`gizliMi` mekanizmalarıyla gizleyebilir, ama bu **otomatik
değil**. Pazarı pasifleştirmek başlı başına hiçbir mağaza/ürün/rezervasyon kaydını
silmez ya da gizlemez; yalnızca yukarıdaki 3 görünürlük/erişim noktasını kapatır.

### Neden `panel/layout.tsx` — 13 farklı sayfada tekrar yerine tek nokta

Panel altında bağımsız sayfa sayısı arttıkça (`urun-ekle`, `urun-duzenle`,
`magaza-ac`, `rezervasyonlar`, `ayarlar`, ...) her birine "pazar pasif mi" kontrolünü
tek tek eklemek hem kopya kod hem de **unutma riski** demekti — yeni bir panel
sayfası eklendiğinde geliştirici bu kontrolü eklemeyi unutabilir, pasif pazardaki
satıcı o tek sayfaya sızabilirdi. Ortak `layout.tsx` bunu **tek noktada** garanti
eder: `children` render edilmeden önce kapı kontrolü yapılır, yeni eklenen her panel
sayfası otomatik korunur. Bu, projede ilk "panel-geneli ortak layout" örneğidir (daha
önce her panel sayfası bağımsızdı, ortak bir gate yoktu).

## `varsayilanPazariGetirVeyaOlustur()` kaldırıldı — artık gerçek pazar seçimi zorunlu

Eski otomatik/gizli varsayılan pazar oluşturma fallback'i (`src/lib/magaza.ts`)
**tamamen kaldırıldı**, `prisma/varsayilan-pazar.json` silindi, `prisma/seed.js`
artık pazar tohumlamıyor (yalnızca başlangıç kategorileri). Gerekçe: bu fallback,
pazarların artık yalnızca admin tarafından gerçek bir belediye anlaşmasıyla
oluşturulduğu modelle çelişiyordu — "sessizce bir varsayılan pazar uydur" davranışı,
`il`/`ilce`/`googleHaritaLinki` gibi artık zorunlu olan gerçek pazar bilgilerini
karşılıksız bırakırdı.

Sonuç: `magazaAc()`'in `pazarId` parametresi artık **zorunlu** (eskiden opsiyoneldi).
İki çağıran nokta da gerçek/aktif bir pazar seçimi ister:

- **Ana onboarding sihirbazı** (`/panel/magaza-ac`, `MagazaAcForm.tsx`) — henüz
  satıcı olmayan bir `alici`'nin ilk mağaza açışı.
- **İkincil "mağaza sil, ürün-ekle'den yeniden oluştur" yolu**
  (`src/app/panel/urun-ekle/MagazaOlusturForm.tsx`) — zaten satıcı olan ama mağazasını
  kaldırmış birinin yeniden açışı.

İkisi de aynı `magazaAc()` fonksiyonunu kullanır (bkz. `satici-onboarding.md` — terfi/
iz/kilit mantığı tek yerde), ikisi de artık **otomatik pazar oluşturma senaryosu
olmadan**, kullanıcıya (tek pazar varsa gizli input, birden fazla varsa `<select>`)
gerçek bir pazar seçtirir.

## `getOwnMagaza`: `cache()` + `include: { pazar: true }`

`getOwnMagaza(userId)` (`src/lib/magaza.ts`) React'in `cache()` fonksiyonuyla
sarılı ve artık `pazar` ilişkisini de dahil ediyor. İki neden bir arada:

- **`cache()`**: aynı istekte (`panel/layout.tsx` + o sayfanın kendi çağrısı) birden
  fazla çağrılırsa React'in istek-başı memoization'ı sayesinde tek Prisma sorgusuna
  düşer — layout'un eklenmesi ekstra sorgu maliyeti getirmez.
- **`include: { pazar: true }`**: `panel/layout.tsx`'in `magaza.pazar.aktifMi`'yi
  okuyabilmesi için aynı istekte ikinci bir Prisma sorgusu atmasına gerek kalmaz.

## Dev veritabanı sıfırlaması

Bu değişiklik için geliştirme veritabanı komple sıfırlandı (`prisma migrate reset`) —
eski `bolge` alanına bağlı tüm test pazar/mağaza verisi silindi (dev-only, üretim
etkisi yok). Canlıya geçişte admin, pilot bölge (Seferihisar) için pazar kaydını
`/admin/pazarlar` üzerinden elle girecek; `prisma/seed.js` artık pazar tohumlamadığı
için bu adım **atlanamaz** — deploy sonrası ilk admin girişinde yapılması gereken bir
manuel adım olarak not düşülür.
