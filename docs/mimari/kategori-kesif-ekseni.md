# Kategori Keşif Ekseni (global kategori menüsü) — Planlanan Mimari Karar

> **DURUM: ERTELENDİ — pilotta UYGULANMAYACAK, henüz uygulanmadı.** Bu dosya,
> "kategorileri vitrinde büyük ikonlu bir ana menü yapıp tıklayınca kategori
> sayfası / ileride resimli mega-menü açma" fikrinin **neden pilota alınmadığını**
> ve ileride yapılırsa **hangi sözleşmelere uyacağını** sağlama almak için yazıldı.
> Bugünkü keşif (pazar-merkezli + tezgah-içi kategori filtresi) Seferihisar pilotu
> için doğru. Karar: **2026-07-11**. Uygulama zamanı geldiğinde bu dosya üzerinde
> tekrar tasarım turu yapılacak; aşağıdakiler yön ve ilkelerdir, nihai kod değil.

İlgili: [`coklu-pazar-ve-coklu-gun.md`](./coklu-pazar-ve-coklu-gun.md) (asıl tetikleyici
budur), [`satici-onboarding.md`](./satici-onboarding.md) (`gizliMi` görünürlük filtresi),
[`bildirim-sistemi.md`](./bildirim-sistemi.md).

## 1. Fikir (kullanıcı önerisi)

Kategoriler şu an vitrinde yalnızca **tek tezgah sayfasında** (`/magaza/[slug]`,
`MagazaIcerik.tsx`) ve o tezgahın kullandığı kategorileri gösteren küçük çip satırı
olarak var. Öneri: kategorileri **ana sayfada** arama çubuğu civarına (arama-hero arası
ya da arama altı) **büyük ikon-butonlarla** koymak; bu butonlara tıklayınca ileride
alt-kategoriler için **resimli menü (mega-menu)** açmak; yani bir nevi **ana menü**.
Gerekçe: "sitede ana menü yok."

## 2. Neden pilota alınmadı (kararın özü)

**En kritik nokta — ucuz kısım pahalı kısma bağımlı:** Bugün bir kategoriye tıklayınca
gidilecek **global bir hedef yok**. Kategori yalnızca tek tezgah içinde (istemci-içi
`useState` ile) filtreliyor; çapraz-tezgah / çapraz-pazar "kategoriye göre ürünler"
diye bir sayfa/rota (`/kategori`) **mevcut değil**. Dolayısıyla "büyük ikon koyalım"
aslında yeni bir keşif ekseni + yeni sayfa + yönlendirme + boş-durum tasarımı kurmak
demek. **Hiçbir yere gitmeyen büyük buton, hiç olmamasından kötüdür.** Bu iki parça
ayrılamaz.

Pilota özgü **üç yapısal sorun** (hepsi yüksek önem):

1. **Boş raf sinyali.** Düz 5 kategori + tek pazarlı küçük envanter → öne çıkan bir
   ikona tıklayınca 0-1 ürün. Tezgah-içi çip çubuğu bunu bilinçli önlüyor (sadece
   **ürünü olan** kategoriyi gösterir); global menü bu garantiyi çöpe atar. Boş ızgara
   sadece alıcıya değil, **sunum yapılacak diğer belediyelere** de "platform cılız"
   diye ilan eder — lansmanda en istenmeyen izlenim.

2. **İki keşif ekseni çatışır.** Platformun tamamı pazar-merkezli tek eksen üzerine
   kurulu: *hangi pazar → hangi gün → hangi tezgah → çarşamba teslim al* (ana sayfa,
   `/pazar/[slug]`, `VitrinArama` — hepsi konum/pazar merkezli). Global ürün-türü
   menüsü buna **dik** ikinci bir mantık ekler. Teknolojiyle arası iyi olmayan kitlede
   "pazara göre mi türe göre mi arıyorum" IA aşırı-yüklemesi yaratır ve her karta gömülü
   "bu çarşamba şu tezgahtan teslim" çapasını sulandırır.

3. **Sadelik + marka kuralı.** Mega-menü + iniş sayfası "WhatsApp kadar basit" kutsal
   kuralında olmayan yeni bir IA katmanı. Büyük renkli ikon duvarı ise "yeni aksan
   renk/desen ekleme, sadece mercan-pembe+neutral" sadelik kuralıyla çatışır. Ek olarak
   `kategori-renkleri.ts`'te gerçek ikon yalnızca birkaç kategoride var; kalanı jenerik
   `Sparkles`'a düşer → yarım görünür.

Ve hepsinin üstüne: **lansmanı geciktirir.** Pilotun tek işi rezervasyon döngüsünü
(online rezerve → çarşamba teslim) gerçek Seferihisar kullanıcılarıyla doğrulamak. Tek
pazar olduğu için zaten herkes aynı pazarda — "pazarlar arası türe göre gezinme" henüz
kimsenin sahip olmadığı bir sorun.

## 3. "Ana menü" çerçevesinin netleştirilmesi

Kullanıcının gözlemi yarı-haklı ama iki ayrı kavram karışıyor:

- **Site navigasyonu** = `SiteHeader`'daki bölümler-arası yol bulma (global, kalıcı,
  uygulama düzeyi). Burada gerçekten sadelik var (logo + favori/bildirim/profil + rol
  linki).
- **Ürün taksonomisi gezinmesi** = ürünleri türe göre keşif (bağlamsal, içerik düzeyi
  kontrol).

Kategori çubuğu **ikincisidir**. Ona "ana menü" demek onu birincisi gibi davranmaya
(her sayfada sabit/sticky durma, `SiteHeader` ile yetki çekişmesi) iter ve pazar-merkezli
ekseni bulandırır. Doğru zihinsel model: **içerik-düzeyi bir "keşif rayı / taksonomi
kısayolu"** — `SiteHeader`'a değil `page.tsx` vitrin filtresine bağlı.

**Gerçek nav boşluğu varsa** çözümü kategori değildir: keşif eksenine sadık tek bir
**"Pazarlar / Nasıl çalışır"** linki. Bu ayrı, ucuz ve kategori kararından bağımsız bir
iştir — istenirse tek başına yapılabilir.

## 4. Ne zaman değerli olur (yeniden değerlendirme kapısı)

Ürün-türü ekseni ancak **iki koşul birlikte** sağlandığında gerçek değer üretir:

1. **Çoklu pazar/şehir** — birden çok pazar olunca "hangi pazarda olduğuna bakmaksızın
   tüm sabun üreticilerini göster" gerçek bir ihtiyaç olur (bkz.
   [`coklu-pazar-ve-coklu-gun.md`](./coklu-pazar-ve-coklu-gun.md)). Tek pazarlı
   Seferihisar'da bu talep yok.
2. **Yeterli derinlik** — öne çıkarılan hiçbir kategori cılız kalmamalı. Kaba eşik:
   kategori başına ~15-20+ canlı ürün → ~5-6 kategoriyle toplam ~100-150+ ürün, 3+
   pazara yayılmış ~30-50+ aktif tezgah.

Ek kapılar: (a) kategori seti stabilleşmiş olmalı (hâlâ icat ediliyorsa erken); (b) her
kategori için gerçek ikon/kimlik mevcut olmalı. Bu eşiklere kadar tezgah-içi çip filtresi
+ bölge araması ihtiyacı fazlasıyla karşılıyor. **Pratik ilk adım mega-menü değil**, ana
sayfaya yalnızca **dolu kategorileri** gösteren tek bir CMS chip rayıyla test etmek.

## 5. İleri-uyum sözleşmeleri (bugünden karara bağlanan)

Yapılınca sıfırdan yazmamak için üç sözleşme şimdiden sabitlenir:

1. **Rota sözleşmesi.** Kategori butonu istemci-state filtre DEĞİL, kanonik bir URL'e
   **link** olsun. İlk sürüm: `/?kategori=<slug>` → mevcut vitrini **yerinde** server-
   filtreler (tek eksen korunur, yeni sayfa yok). Mega-menü gelince aynı URL üst-buton
   hem gider (tap) hem alt-paneli açar. Ayrı `/kategori/[...]` iniş sayfasına gerçekten
   geçilirse `Kategori.slug` eklenir (magaza/pazar slug deseniyle tutarlı) — çirkin uuid
   URL'den kaçın.

2. **Veri modeli — additive.** Bileşen opsiyonel `altKategoriler` prop'u alacak şekilde
   yazılır; boşken hiçbir ek şey render etmez (pilotta düz görünür), doluyken paneli
   açar. Sonradan `Kategori`'ye `ustKategoriId` self-relation eklemek **tamamen
   kırılmayan (additive) migration**'dır (bkz. kategori taksonomisi düz→hiyerarşi
   yükseltmesi).

3. **Etkileşim — mobil-öncelikli.** Mobilde hover YOK; "mega-menü" mobilde hover değil
   **tap → açılan panel/accordion**'dur. Pilot butonu "tap = git", ileri sürüm "tap =
   aç sonra git"; dokunma hedefi ve etiket sabit kalır.

**Biçim sabitleri:** her zaman **yatay kayan ray** (grid değil — 5 düz öğe grid'de
"yetim satır" yapar; ray sabit ~96px yükseklikte N öğeyi taşır ve ilerideki drill-down'ın
doğal atası). Renk: **neutral yüzey + yalnız seçili durumda coral** (mevcut
`MagazaIcerik.tsx` çip deseni); `kategori-renkleri.ts`'teki çok-renkli paleti **büyük
butonlara TAŞIMA**.

## 6. Teknik tuzak + hazır veri sorgusu (uygulama gününe not)

**Tuzak:** `vitrinGorunurlukFiltresi()` (`src/app/page.tsx`) `magaza.silindiMi/gizliMi`
filtreler ama **`pazar.aktifMi`'yi filtrelemez** (pazar koşulu yalnızca arama varken OR
olarak giriyor). Çapraz-pazar bir kategori sorgusunda pasif pazarın ürünü sızmasın diye
`pazar: { aktifMi: true }` **elle eklenmeli** — helper olduğu gibi yeterli değildir.

Hedef sayfa/filtre yazılırsa temel iki okuma sorgusu (motora/şemaya dokunmaz):

```ts
// (a) Kategorideki görünür ürünler (çapraz-tezgah/çapraz-pazar):
prisma.urun.findMany({
  where: {
    kategoriId: id,
    silindiMi: false,
    durum: { in: ["sergide", "doldu"] },   // "satildi" HARIÇ (çapraz-vitrin keşif kuralı)
    magaza: { silindiMi: false, gizliMi: false, pazar: { aktifMi: true } }, // aktifMi'yi ELLE ekle
  },
  include: { kategori: true, magaza: { select: { id: true, ad: true, slug: true } } },
  orderBy: { createdAt: "desc" },
});
// (b) O kategoride görünür ürünü olan tezgahlar — MagazaVitrini/MagazaKarti ile render.
```

Yeniden kullanılabilir hazır altyapı: `UrunKarti` (opsiyonel `magaza` prop'uyla çapraz-
tezgah modu), `YeniEklenenler`, `MagazaVitrini`/`MagazaKarti`, ve pazar/anasayfayla aynı
favori/kuyruk/değerlendirme Map yardımcıları. Yapısal şablon: `/pazar/[slug]/page.tsx`
neredeyse birebir kopyalanır, tek gerçek fark WHERE cümlesidir. Yeni public rota
eklenirse `SiteHeader`'a erişim linki eklemek şarttır (nav-erişimi kuralı).

## 7. Uygulama notu

Pilot (Seferihisar, tek pazar, haftalık) bu ekseni **içermez**. Mevcut keşif korunur:
Bugünün Pazarları bandı + bölge araması + tezgah-içi kategori çip filtresi. Efor
rezervasyon güvenilirliği, satıcı onboarding ve belediye sunumu öncesi planlı SMS OTP'ye
gider. Yeniden değerlendirme kapısı (§4) aşıldığında: (1) bu dosyada tasarım turu,
(2) `/?kategori=slug` yerinde-filtre ile en hafif sürüm, (3) talep sürerse
`ustKategoriId` + `Kategori.slug` migration'ı ve mega-menü, (4) her adımda psql ile
bağımsız doğrulama — mevcut çalışma tarzıyla.
