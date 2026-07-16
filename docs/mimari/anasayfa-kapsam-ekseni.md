# Ana Sayfa Kapsam Ekseni — "20 pazar olunca `/` ne olacak?"

> **DURUM: KARAR ALINDI (2026-07-15), KISMEN UYGULANDI.** N=1 adımı bugün
> yapıldı (bağlam satırı + `/magazalar`'ın kaldırılması). Navigasyon ana sayfası
> **ikinci pazar sözleşmesinde** yapılacak — tetikleyici tarih değil, olay.
> Aşağıdakiler yön ve sözleşmelerdir; uygulama zamanı geldiğinde bu dosya
> üzerinde tekrar tasarım turu yapılacak.

İlgili: [`coklu-pazar-ve-coklu-gun.md`](./coklu-pazar-ve-coklu-gun.md) (motor/veri
modeli — bu dosya onun **bilgi mimarisi** karşılığı),
[`kategori-kesif-ekseni.md`](./kategori-kesif-ekseni.md) (dik eksen ertelemesi),
[`vitrin-sayfalama.md`](./vitrin-sayfalama.md).

## 1. Tespit: ana sayfa bugün gizlice Seferihisar sayfası

Kullanıcı sordu: *"Diyelim ki 5 şehir ve 20 pazar oldu. Şimdiki ana sayfa aslında
Seferihisar sayfası mı? 20 farklı sayfa mı yapacağız?"*

**Ölçüldü, evet:** sistemde 1 pazar var; ana sayfadaki 18 tekil ürünün **18'i**
Seferihisar'dan; `/` ile `/pazar/seferihisar-pazari` arasındaki tek fark sayfalama
penceresi. `/` fiilen kapsamlı bir pazar vitrini — ama kapsamı **görünmez** ve
**değiştirilemez**.

Bu bugün hata değil (yalan söylemiyor, başka pazar yok), ama **gizli bir varsayım**:
"ana sayfa = tek pazar". İkinci pazar açıldığı gün varsayım sessizce yalana döner.

**"20 sayfa mı yazacağız?" → HAYIR.** O 20 sayfa **zaten var**: `/pazar/[slug]`
dinamik route (belediye logosu, kapak, harita, gün/saat, tezgahlar, ürünler,
pazar-içi arama, sayfalama). 21. pazarda yazılacak kod sıfır. Asıl soru hep
`/`'in ne olacağıydı.

## 2. Neden çapraz-pazar ürün ızgarası ölçekte çalışmaz

**Kargo yok** (Faz 1: para pazarda nakit, teslim elden — CLAUDE.md). Her ürün kartı
fiilen şunu vaat ediyor: *"bu çarşamba ŞU tezgahtan teslim al."* 20 pazarda çapraz
ızgara, Seferihisarlıya Ankara'daki reçeli gösterir — alıcı onu **asla** alamaz.
Bu gürültü değil, **tutulamayacak bir söz**.

Yani bugünkü ürün bölümleri ancak N=1 olduğu için tutarlı.

## 3. Karar: iki katmanlı, kapsamlı ana sayfa

`/` ikiye ayrılır:

| Katman | İçerik | Kural |
|---|---|---|
| **Üst — kalıcı, çapraz** | Haftalık Ritim, arama, "bu ne?" | **Ürün göstermez** — bu yüzden N=20'de de dürüst |
| **Alt — kapsama tabi** | Ürünler, Beğenilenler, Tezgahlar | Her zaman bir pazar/havza filtresine bağlı |

> **Tek kural:** Ana sayfada **ürün kartı gösteren her modül kapsama tabidir.**
> Haftalık Ritim'in zararsızlığının sebebi çapraz olması değil, **ürün göstermemesi**.

**Elenen alternatifler:**
- **Saf pazar-bulucu (ürünler yalnızca pazar sayfasında):** N=1'de saf gerileme — tanınmayan markada ürün göstermeyen soğuk bir dizin; %100 kullanıcı henüz kimsenin sahip olmadığı bir sorun için fazladan tık öder.
- **Yemeksepeti modeli (bir kez seç, hapsol):** alıcıyı tek pazara kilitler. Urla'da oturup Seferihisar'a da giden sınır alıcısı gerçektir; keşfi öldürür.

**Seçilenin zaafı (görünmez state) baştan kapatıldı:** kanonik gerçek **URL**'dir
(`/pazar/[slug]`); çerez yalnızca `/`'in nereden başlayacağını söyler. Paylaşılan
hiçbir link çerezle kırılmaz.

## 4. Bugün sabitlenen sözleşmeler

Yarın sıfırdan yazmamak için — bugün kod yazmıyoruz, **uyumsuz bir şey yazmamış** oluyoruz.

1. **Kapsam bir FİLTRE'dir, ROUTE değil.** Ana sayfa sorguları `pazarId` parametresi alacak şekilde düşünülür (bugün sabit tek değer geçilse bile). `/sehir/izmir` gibi route AÇILMAZ.
2. **Kapsam ÇOĞULDUR.** Veri tipi tekil `pazarId` değil, **liste**. Havza (şehir / ~45dk) bunu gerektirecek; tekilden çoğula geçmek sonradan pahalı.
3. **URL asıl, çerez tercih.** Çerez asla neyin gerçek olduğunu belirlemez.
4. **Çapraz katman ürün göstermez.** (§3'teki tek kural.)
5. **`/` platform yüzü değildir.** Ulusal anlatı `/hakkimizda` + ileride `/pazarlar`'a yazılır. Belediye sunumunda gösterilecek sayfa `/` değil, **o belediyenin kendi `/pazar/[slug]`'ı**.
6. **Ana sayfa uzamayacak.** Mobilde ölçüldü: 6.7 ekran (5957px) — zaten fazla. Kapsam eklenirken alt katman **kısalacak**, yeni modül eklenmeyecek.

## 5. Geçiş yolu

| Aşama | Tetikleyici | İş | Efor |
|---|---|---|---|
| **N=1** | — | **YAPILDI:** bağlam satırı + `/magazalar` kaldırıldı | ~1 saat |
| **N=2** | 2. pazar sözleşmesi | Bağlam satırı → kapsam seçici. Alt katman seçili kapsama filtrelenir. [`coklu-pazar-ve-coklu-gun.md`](./coklu-pazar-ve-coklu-gun.md) migration'ı **burada** yapılır, önce değil. | 1-2 gün |
| **N=5 / 2-3 şehir** | — | Kapsam "pazar"dan **havza**ya (il) genişler. `/pazarlar` dizini + `/hakkimizda` platform yüzü olarak ayrılır. | 3-5 gün |
| **N=20** | — | Çoğul kapsam ("Seferihisar + Urla"), il seçimi, Haftalık Ritim'in günü olan pazarı manşet yapması. | 1-2 hafta |

**`/` hiçbir aşamada yeniden yazılmaz** — sadece kapsam bileşeni büyür.

### N=1'de yapılanlar (2026-07-15)

**Bağlam satırı** (`src/app/PazarBaglamSatiri.tsx`): ürün katmanının üstünde
"📍 Seferihisar Pazarı · her Çarşamba · Seferihisar, İzmir · Pazar sayfası".
Verdiği söz: *"aşağıda gördüğün her şey bu pazardan, bu gün alınabilir."*

> **En önemli özelliği ne söylediği değil, ne zaman susacağı:** yalnızca **tek aktif
> pazar** varken render edilir. İkinci pazar açıldığı an cümle yalan olacağı için satır
> **kendiliğinden kaybolur** (fail-safe) — ve bıraktığı boşluk "artık kapsam seçicisi
> lazım" sinyalidir. Yerine gelecek bileşen bunun büyümüş hâlidir ("Pazar: Seferihisar ▾").
> Test edildi: 2. pazar eklendi → satır ve "Bu Pazardaki Tüm Ürünler" linki kayboldu;
> silindi → geri geldi.

Sıra admin'den değiştirilebildiği için satır sabit konuma değil **ilk kapsamlı
modülün** üstüne basılır (`haftalik_ritim` çapraz + ürün göstermez → kapsam dışı).

Aynı `tekPazar` koşuluna bağlı iki link: **"Bu Pazardaki Tüm Ürünler"** ve
**"Bu Pazardaki Tüm Tezgahlar"** → `/pazar/[slug]`.

## 6. `/magazalar` neden kaldırıldı

Kullanıcı kararı: *"Tüm tezgahlar diye bir sayfa kurarsak ileride birbirine karışık
yüzlerce tezgah olur. En zahmetsiz ve en temiz çözüm yerel pazar sayfasına gidip
orada gösterilmesi."*

Doğru, çünkü **tezgah her zaman BİR pazarın bağlamında anlamlı** ("bu çarşamba şu
pazarda"). Bağlamsız tezgah listesi, kapsam ekseninin ihlalidir — ürün ızgarasıyla
aynı sebepten (§2).

- `/magazalar/seferihisar` **elendi**: o URL "pazara göre filtrelenmiş tezgah listesi"
  demek — yani `/pazar/[slug]`'in ikizi. İki URL'in aynı şeyi göstermesi bakım borcu.
- Hedef: ana sayfadaki "Bu Pazardaki Tüm Tezgahlar" → `/pazar/[slug]#tezgahlar`
  (pazar sayfasında **zaten var olan** "Bu Pazardaki Tezgahlar" bölümü; yeni sayfa yazılmadı).
- **Footer'daki "Tezgahlar" nav linki kaldırıldı** — kullanıcı kararı: "gereksiz, böyle
  bir linke ihtiyaç yok". Yerine link konmadı.
- `magaza_listesi.ogeSayisi` ayarının anlamı daraldı: artık yalnızca **ana sayfa
  önizlemesinin uzunluğu** (kısa bir dönem `/magazalar`'ın da sayfa boyuydu).
- Route silindi; yönlendirme konmadı (site canlı ama pilot başlamadı, trafik ~0).
  Bir bookmark/indeks sorunu çıkarsa `next.config.ts`'e redirect eklemek tek satır.

## 7. Çapraz-pazar "en çok beğenilen" slider'ları — HAYIR

Kullanıcı önerdi (*"tüm pazarlarda en çok beğeni alan satıcılar / en çok favoriye
eklenen ürünler"*), sonra kendi karşı argümanını da yazdı (*"alamayacağı ürünü görecek
insanlar"*). **Karşı argüman kazanıyor ve kendi önerisini de kesiyor:** Ankara'daki en
çok beğenilen satıcı, Seferihisarlı için Ankara'daki reçel kadar ulaşılmaz. Ürün yerine
satıcı koymak sorunu çözmez, bir katman ötesine taşır.

O slider'ın gerçek işi alışveriş değil **sosyal kanıt** ("bak platform canlı") — meşru
bir ihtiyaç ama yeri alışveriş yüzeyi değil, `/hakkimizda`. Ayrıca N=1'de bugünkü "En
Çok Beğenilenler"in aynısı olur (tüm satıcılar Seferihisar'ın).

**Ne şimdi ne pilot sonrası.** Kargo gelirse yeniden değerlendirilir (§9).

## 8. N≥2'de `/` ne göstermeli (hedef tasarım)

Sıra platformun kendi zincirini izler — **ürün yok**:

1. **"Bugün hangi pazar kuruluyor?"** — Haftalık Ritim ana kahraman. Platformun ruhu: pazarın bir **ritmi** var.
2. **"Benim pazarım hangisi?"** — mevcut `VitrinArama` (il/ilçe/semt autocomplete) tek giriş kapısı olarak kalır.
3. **Yaklaşan pazarlar** — yarın / bu hafta.
4. **Şehre göre pazar listesi.**
5. **"Bu ne?"** — 3 adım: rezerve et → pazara git → elden al.

**İki şey bunu "soğuk dizin" olmaktan kurtarır:**

- **Pazar kartları fotoğraflı olmalı.** `Pazar.kapakFotoUrl` **zaten şemada var** ama
  bugün **boş** (Seferihisar'da yalnızca `belediyeLogoUrl` dolu). Ön koşul: her pazara
  kapak fotoğrafı girilmesi. O zaman navigasyon sayfası metin listesi değil, pazar
  fotoğraflarından oluşan sıcak bir ızgara olur.
- **Dönen kullanıcı seçim yapmamalı.** Her hafta gelen Seferihisarlı'ya her seferinde
  "hangi pazar?" sormak saçma. En üstte "Senin pazarın: Seferihisar Pazarı — bugün
  kuruluyor →" kısayolu (çerez). **Yabancıya navigasyon, müdavime kısayol.**

## 9. Kargo (Faz 2) senaryosu

Bu karar kargoyla **bozulmaz, güçlenir**. Kapsam bir *filtre* olarak kurulduğu için
yapılacak iş: seçiciye "Tümü / Kargolu" eklemek. Dahası kargo **ürün bazında** gelecek
(turşu, cam kavanoz, kırılgan mal gitmez) — yani kalıcı olarak karma bir dünya olacak
ve kapsam filtresi **zaten** gerekecek. Çapraz-pazar ürün listesi o gün yalnızca
"kargolu" alt kümesi için anlamlı olur, tam liste için değil.

Saf pazar-bulucu modeli seçilseydi yerelleştirme route'a gömülür, bu kapı pahalıya
geri açılırdı.

## 10. Yapılmayacaklar

- **20 statik sayfa yazmak** — `/pazar/[slug]` zaten o iş.
- **GPS izni istemek / IP'den şehir tahmini** — teknolojiyle arası iyi olmayan kitleye ilk saniyede tarayıcı popup'ı kutsal kural ihlali; mobil operatör IP'si Seferihisarlıyı İstanbul'a düşürür.
- **"Şehir seç" ara kapısı (interstitial)** — alıcıyı ürünü görmeden çalıştırmak.
- **Çoklu-pazar veri modelini şimdi migrate etmek** — tetikleyici N=2.
- **Kategori mega-menüsü** — kapsam ekseni yerleşmeden ikinci **dik** eksen açılmaz ([`kategori-kesif-ekseni.md`](./kategori-kesif-ekseni.md) ertelemesi geçerli).
- **Ana sayfaya yeni modül eklemek.**

---

**Tek cümle:** Ana sayfa bugün gizlice Seferihisar sayfası; yapılacak iş onu Seferihisar
sayfası olmaktan çıkarmak **değil**, Seferihisar sayfası olduğunu **söyletmek** — çünkü o
etiketi söyleyen bileşen, 20 pazarda açılır menüye dönüşecek olan bileşenin ta kendisi.
