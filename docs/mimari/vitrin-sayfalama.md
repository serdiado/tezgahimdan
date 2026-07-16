# Vitrin sayfalama — "Daha Fazla Göster"

2026-07-15 kararı. Vitrindeki ürün/tezgah listeleri sayfalı: **ana sayfa** ("Yeni Ürünler"), **/magaza/[slug]**, **/pazar/[slug]**.

> **Sonradan not (aynı gün):** `/magazalar` da bu işte sayfalanmıştı, ama route **kaldırıldı** — çapraz-pazar "tüm tezgahlar" listesi ölçekte birbirine karışmış yüzlerce tezgah demekti. Bkz. [`anasayfa-kapsam-ekseni.md`](./anasayfa-kapsam-ekseni.md). Aşağıdaki desen (URL param + biriken take + `sayfaKes`) kalan üç yüzeyde aynen geçerli.

## Sorun neydi

Ölçüldü (37 ürün / 14 tezgahlık demo veriyle):

| Yüzey | Durum |
|---|---|
| Ana sayfa | `ogeSayisi=12` ile **zaten sınırlıydı** — ama 12'den fazlasını görmenin **hiçbir yolu yoktu**. 37 ürünün 25'i ulaşılamazdı. |
| `/magazalar` | **Sınırsız** — "bu sayfanın tek işi tam listeyi göstermek" *(route sonradan kaldırıldı)* |
| `/magaza/[slug]` | **Sınırsız** |
| `/pazar/[slug]` | **Sınırsız** — "tek pazarın ürün sayısı küçük kalır" varsayımı |

Görseller zaten `next/image` ile tembel yükleniyordu (27 görselin 24'ü), yani asıl yük görsellerde değil **RSC payload'unda**: ana sayfa 313 KB.

Yani iki ayrı iş: **keşif** (12'nin ötesini görebilmek) ve **sınırlama** (üç sayfanın sınırsız büyümesini durdurmak).

## Neden "Daha Fazla" — sonsuz kaydırma ve sayfa numaraları değil

Hedef kitle teknolojiyle arası iyi olmayan yerel alıcılar (CLAUDE.md).

- **Sonsuz kaydırma elendi:** footer'a asla ulaşılamaz (iletişim/KVKK/SSS erişilemez hale gelir), "nerede kaldım" kaybolur, sayfa şişer, kimse istemeden tetiklenir. Kutsal kurala aykırı.
- **Sayfa numaraları (1-2-3) elendi:** mobilde küçük rakamlara isabet zor; pazar gezmek katalog taramaya benzemez, insan sırayla kaydırır.
- **"Daha Fazla Göster" seçildi:** kontrol kullanıcıda, footer erişilebilir kalır, buton parmakla basılır (44px), geri gelince yer kaybolmaz.

## Nasıl çalışıyor

**URL parametresi + biriken take.** `?sayfa=2` → `take = ogeSayisi * 2`. Buton bir `<Link href="?sayfa=N+1" scroll={false} prefetch={false}>`.

- **Neden URL (server action / client append değil):** geri tuşu, paylaşılabilirlik ve JS'siz çalışma bedavaya gelir; sunucu bileşeni mevcut tüm toplama mantığını (beğeni/kuyruk/yorum haritaları) **aynen yeniden kullanır**, yeni API yazılmaz. Ürün kartı verisi çok parçalı — o şekli bir action'da yeniden üretmek üç yüzey için üç kez ödenirdi.
- **Neden biriken take, skip değil:** vitrin gezinmesinde kullanıcıya ilk 12'yi kaybettirmek yanlış — liste **altına eklenir**. (Admin panelindeki `admin/kullanicilar` skip'li sayfalama kullanır; farklı kitle, farklı bağlam — desen oradan taşınmadı.)
- **`scroll={false}` şart:** yeni kartlar altta belirir, kullanıcı yerinde kalır. Doğrulandı: tıklama sonrası `scrollY` korunuyor.
- **`prefetch={false}` bilinçli:** bu link her zaman DAHA BÜYÜK bir sorgu tetikler; görünür olur olmaz ön-yüklemek her ziyaretçiye boşuna maliyet çıkarır. (Ayrıca projede prefetch kaynaklı oturum sorunu yaşandı.)
- **`useLinkStatus`** ile "Yükleniyor…" göstergesi — yoksa kullanıcı sessiz beklemede tekrar tıklar.

**Buton ne zaman gizlenir:** `take: limit + 1` ile bir satır fazla okunur; `satirlar.length > limit` ise daha var demektir (`lib/vitrin-sayfalama.ts` → `sayfaKes`). **`count()` yok, ek sorgu yok.** Fazladan satır **haritalar kurulmadan önce** atılır — yoksa gösterilmeyen ürünün yorumları/fotoğrafları boşuna çekilip payload'a girer.

**Tavan şart:** `MAX_SAYFA = 8`. Biriken take'te `?sayfa=99999` aksi halde tüm tabloyu okuturdu (skip'li desende take sabit olduğu için bu risk yoktu).

## Sayfa boyu nerede yaşıyor (admin)

`SayfaModulu.ayarlar.ogeSayisi` (4–24). `PlatformAyarlari`'na **girmedi** — orası motor tablosu (`rezervasyonOlustur` her çağrıda okur), sunum ayarı o sözleşmeyi kirletir. Yeni bir tablo da açılmadı (iki int için tablo + ekran = gereksiz soyutlama).

| Yüzey | Ayar kaynağı |
|---|---|
| Ana sayfa "Yeni Ürünler" | `anasayfa / yeni_urunler.ogeSayisi` |
| `/pazar/[slug]` ürünleri | **aynı** `yeni_urunler.ogeSayisi` — burası da mağazalar-arası bir ürün ızgarası; ayrı ayar admin'e karşılıksız bir kontrol daha koymak olurdu |
| Ana sayfa tezgah önizlemesi | `anasayfa / magaza_listesi.ogeSayisi` — *(kısa bir dönem `/magazalar`'ın da sayfa boyuydu; o route kaldırıldı, ayar artık yalnızca "önizleme uzunluğu" demek)* |
| `/magaza/[slug]` ürünleri | **yeni** `magaza_hero / magaza_urun_listesi.ogeSayisi` |

`magaza_urun_listesi` bir **hero bileşeni değil** — `magaza_hero` grubunda yaşıyor çünkü admin'de o grubun ekranı zaten "Tezgah Sayfası Şablonu" başlığıyla sunuluyor ve o sayfa `sayfaModulleriGetir("magaza_hero")`'yu zaten çağırıyor (**ek sorgu yok**). Ayrı bir `SayfaModulSayfasi` değeri tek modüllü bir grup yaratır, sıra/görünürlük kontrolleri karşılıksız kalırdı. `MagazaHero`'ya sızmaması için `magaza/[slug]` hero listesini `tur.startsWith("magaza_hero_")` ile süzer; admin kartında sıra/görünürlük kontrolleri kapalı.

## Bu işte düzeltilen iki mevcut hata

Sayfalamanın **ön koşuluydu** — düzeltilmeden özellik sessizce bozuk çalışırdı.

1. **Admin `ayarlar` JSON'unu eziyordu** (`api/admin/sayfa-modulu-guncelle`). İstemci her kontrolü ayrı istekte gönderiyor; route `data.ayarlar = ayarlar` ile kolonu **replace** ediyordu. Sonuç: admin sadece "Kolon Sayısı"nı değiştirince `sunumTipi` **ve** `ogeSayisi` siliniyor, input ekrandan kayboluyor (`ayarlar.ogeSayisi !== undefined` koşulu), limit sessizce varsayılana dönüyordu. Artık mevcut JSON aynı transaction'da okunup **birleştiriliyor** (iki admin eşzamanlı farklı kontrol değiştirirse biri ötekini ezmesin).
2. **`sayfaModulleriGetir` yalnızca grup BOŞKEN tohumluyordu** (`if (mevcutlar.length > 0) return`). Gruba sonradan eklenen modül (`magaza_urun_listesi`) mevcut kurulumlarda **hiç oluşmazdı** — yeni ayar prod'da hiç görünmezdi, ama lokalde DB yeni resetlendiği için fark edilmezdi. Artık koşul "eksik mi" (`length < beklenen`); `skipDuplicates` + `@@unique([sayfa,tur])` sayesinde idempotent, her deploy kendini iyileştirir, ayrı veri migration'ı gerekmez. **Var olan satırların ayarları EZİLMEZ** — sadece eksik satır eklenir.

> **Enum + transaction tuzağı:** `ALTER TYPE ... ADD VALUE` ile eklenen değer **aynı** migration transaction'ında kullanılamaz. Bu yüzden `20260715230000_sayfa_modulu_urun_listesi` sadece enum'u ekler; satır tohumlaması çalışma anında (yukarıdaki find-or-seed) yapılır.

## Kategori çipleri sunucuya taşındı (zorunluydu)

Çipler `YeniEklenenler`/`MagazaIcerik` içinde **yüklenen ürünlerden** `useMemo` ile türetiliyor, filtre istemcide yapılıyordu. Ana sayfa zaten `take:12` olduğu için bu **bugün de yanıltıcıydı**: DB'de 30 "Mutfaktan" ürünü varken pencerede 2 varsa kullanıcı 2 görüp bunu tüm katalog sanıyordu; pencerede hiç görünmeyen kategorinin çipi hiç çıkmıyordu. Sayfalama bunu ağırlaştırır (seçili kategori yeni sette yoksa liste bomboş görünür) ve `/magaza/[slug]` ile `/pazar/[slug]`'de **yeni bir regresyon** yaratırdı (orada liste tamdı, yani çipler doğruydu).

Artık: çipler ayrı bir `prisma.kategori.findMany` ile (aynı görünürlük filtresini paylaşan `some` koşulu), filtre `?kategori=<id>` ile Prisma `where`'ine giriyor, çipler `<button onClick>` yerine `<Link>` (JS'siz çalışır, paylaşılabilir, geri tuşu doğru). Çip linki **`sayfa` parametresini taşımaz** — kategori değişince 1'e döner. Bileşenlerden `useState`+`useMemo`+`filter` çıktı, ikisi de artık sunucu bileşeni.

Doğrulandı: ana sayfada çipler önce 3 kategori gösteriyordu, şimdi 7'sini de gösteriyor.

## Yapılmayanlar / bilinen kısıtlar

- **"En Çok Beğenilenler"e "Daha Fazla" konmadı.** Tanımı gereği top-N listesi. Ayrıca `enCokBegenilenUrunIdleriGetir` ID'leri **görünürlük filtresinden önce** çekiyor (`lib/favori.ts`), yani sayfalaması yapısal olarak yanlış sayı gösterirdi. Aynı sebeple `ogeSayisi=12` istense de 8 kart çıkabilir — bu bugün de böyle.
- **Ana sayfadaki tezgah slider'ı sayfalanmadı** — "Bu Pazardaki Tüm Tezgahlar" linki pazarın kendi sayfasına götürür, tam liste orada. Arama aktifken slider limitsiz kalır (bilinçli, mevcut karar).
- **`/pazar/[slug]`'de tezgah listesi sayfalanmadı** — bir pazarın tezgah sayısı doğal olarak küçük.
- **`urunYorumlariHaritasi` limitsiz kaldı.** "Kart zaten tüm yorumları göstermiyor, `slice(0,2)` güvenli" önerisi **doğrulamada düştü**: `UrunDetayModal` ürünün BÜTÜN yorumlarını listeliyor ve içinde "tümünü gör" yok — kesmek modalda yorumları sessizce gizlerdi. Payload'u küçültmek isteniyorsa önce modale bir "tüm yorumlar" akışı gerekir; ayrı iş.
- **`pasifUrunIdSeti()` scope'suz** (`rezervasyon.ts`) — tüm platformun bekleyen rezervasyonlarını tarar. Sayfa boyutundan bağımsız ama sayfanın en pahalı çağrısı; "sayfa yavaş" şikayeti gelirse ilk bakılacak yer.
- **`"{arama}" için N sonuç` etiketi düzeltildi** — `yeniUrunler.length` (kesilmiş pencere) yerine gerçek `count()`. Sadece arama varken atılır. Eskiden 30 eşleşmede "12 sonuç" diyordu.

## Doğrulama

`ogeSayisi=12` ile, 37 ürün / 14 tezgahlık demo veride:

- Ana sayfa: 12 kart + buton → tıkla → **24 kart**, `scrollY` korundu, buton `?sayfa=3`'e döndü ✓
- `/magazalar`: sayfa 1'de buton **var**, sayfa 2'de **yok** (14 ≤ 24) ✓ *(route sonradan kaldırıldı)*
- `/magaza/ayse-teyzenin-mutfagi`: 3 ürün → buton yok ✓
- `/pazar/seferihisar-pazari`: 12 + buton ✓
- `?kategori=<Mutfaktan>` → 6 ürün; psql ile bağımsız doğrulandı: DB'de tam 6 ✓
- Çipler: 3 → **7** kategori ✓
- `?sayfa=99999` ve `?kategori=uydurma-id` → 200, çökmüyor ✓
- Admin: `ogeSayisi=6` → sayfa 1'de 6, sayfa 2'de 12 ✓
- Admin JSON birleştirme: `ogeSayisi=6` ayarla → sadece `kolonSayisi=4` gönder → `{"ogeSayisi":6,"sunumTipi":"grid","kolonSayisi":4}` (üçü de duruyor) ✓
- Yeni modül tohumlaması: `magaza_hero` grubu 3 → 4 satır, mevcut satırların ayarları ezilmedi ✓
- Mobil: buton 44px (dokunma hedefi), footer hemen altında erişilebilir ✓
