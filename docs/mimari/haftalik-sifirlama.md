# Haftalık Sıfırlama — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#haftalık-sıfırlama-otomatik). Rezervasyon kuyruk mantığı ve kilit stratejisi için: [`rezervasyon-motoru.md`](./rezervasyon-motoru.md) (bu akış onunla **aynı** `FOR UPDATE` kilidini kullanır).

`pazarlariSifirla` (`src/lib/rezervasyon.ts`) — otomatik, harici cron tetikler. Pazarın **gün sonu** (aşağıya bkz.) geçince o pazara ait ürünlerin bekleyen kuyruğu **tamamen temizlenir** (sıra taşıma yok; ürün sonraki hafta sıfırdan). Bu, manuel Gelmedi'nin toplu hali **değildir** — o yükseltir, bu temizler.

## 2026-07-09 güncellemesi: sweep artık kapanış anında DEĞİL, admin'in ayarladığı "işlem sonu" anında tetiklenir

İlk karar: satıcı, pazar kapanışında hemen cezalandırılmak yerine o günün sonuna (gece yarısı) kadar "Sattım/Gelmedi" işaretlemesi için süre almalı. **Aynı gün içinde ikinci bir düzeltme geldi:** sabit "gece yarısı" varsayımı **gece pazarları** (kapanışı 01:00-02:00 gibi geç saatlere uzanan pazarlar) için yanlış olabilir — kullanıcı kararı: işlem-sonu ve hatırlatma anlarının **her ikisi de admin tarafından pazar bazında manuel ayarlanabilmeli**, sabit bir varsayıma zorlanmamalı.

Sonuç: `Pazar` modeline **dört yeni opsiyonel alan** eklendi (migration `20260709144934_pazar_icerik_ve_zamanlama_alanlari`): `islemSonGunu`+`islemSonSaati`, `hatirlatmaGunu`+`hatirlatmaSaati`. Admin bunları pazar formunda boş bırakırsa (`PazarForm.tsx`), kod eski sabit varsayımlara düşer (işlem-sonu → kapanış gününün gece yarısı, hatırlatma → kapanıştan 1 saat sonra) — **regresyon yok**, mevcut pazarlar (ör. Seferihisar) davranış değiştirmez. Admin manuel ayarlarsa, `pazar-olustur`/`pazar-guncelle` route'ları (`opsiyonelGunSaatDogrula`, `hedefOnceMi` — `pazar-dogrulama.ts`) şunu zorunlu kılar: (1) hem gün hem saat birlikte girilmeli, (2) ikisi de kapanıştan SONRAYA denk gelmeli, (3) hatırlatma, işlem-sonundan ÖNCE olmalı (aksi halde hatırlatma anlamsızlaşır — bkz. aşağıdaki "bulunan iki gerçek hata").

No-show belirleme kuralının kendisi (aşağıdaki `aktifOlmaZamani < pazarBaslangicAni` karşılaştırması) **hiç değişmedi** — sadece sweep'in NE ZAMAN çalıştığı (artık `pazarIslemSonAni`) ve hatırlatmanın NE ZAMAN gittiği (artık `pazarHatirlatmaAni`) değişti/yapılandırılabilir hale geldi.

**O gün için ERTELENEN karar (aynı gün içinde çözüldü, bkz. aşağıdaki bölüm):** "Gelmedi" cezasının tam mekanizması (satıcı hâlâ işaretlemezse ne olur) o an netleşmemişti — davranış eskisiyle aynıydı (işlem-sonu anında otomatik `gelmedi`), sadece zamanlama yapılandırılabilir hale gelmişti. **Bu karar artık netleşti ve TERSİNE çevrildi** — otomatik `gelmedi` cezası tamamen kaldırıldı, bkz. "2026-07-09 İKİNCİ güncelleme" bölümü.

**Bulunan iki gerçek hata (canlı testle):** (1) İlk tasarımda hatırlatma kapanıştan ÖNCE (2 saat erken) gönderiliyordu — kullanıcı "satıcı pazar bitmeden karar veremez" diye düzeltti. (2) Düzeltme sırasında, mevcut (değiştirilmeyen) otomatik ceza kapanış ANINDA çalıştığı için, kapanıştan SONRA gelen bir hatırlatmanın her zaman cezadan SONRA varacağı fark edildi — hatırlatma işlevsiz kalıyordu. Çözüm: cezanın kendisi de (varsayılan olarak) gün sonuna ertelendi, ikisi de artık bağımsız yapılandırılabilir.

## 2026-07-09 İKİNCİ güncelleme: otomatik "gelmedi" cezası TAMAMEN kaldırıldı — satıcı ihmali artık asla alıcı cezası değil

Yukarıdaki güncellemeyle aynı gün, kullanıcı temel prensibi netleştirdi: **"Her satıcı ihmali, alıcı lehine çalışmalı."** Sistemin "satıcı mı işaretlemeyi unuttu, yoksa alıcı mı hiç gelmedi" ayrımını yapmasının imkânsız olduğu fark edildi — kayıt her iki durumda da aynı görünür (`bekliyor` kalır). Alıcının bu belirsizlikten ceza alması kabul edilemez.

**Yeni model:** `urunSifirla` artık "pazar başlangıcında aktif + hâlâ işaretlenmemiş" kategoriye **hiç dokunmuyor** — bu kayıtlar `bekliyor` durumunda, hiçbir `DurumGecmisi` izi bırakmadan kalmaya devam eder. Bunun yerine üç bağımsız tüketici aynı temel sorguyu (aktif + `bekliyor` + `aktifOlmaZamani < pazarBaslangicAni` + `now >= pazarIslemSonAni`) paylaşır (`src/lib/rezervasyon.ts`, "Satıcı ihmali" bölümü):

1. **Zorunlu panel kilidi** (`saticininBekleyenIslemleriGetir` + `src/app/panel/layout.tsx` + `src/app/panel/BekleyenIslemlerEkrani.tsx`): satıcı giriş yapıp `/panel` altında HERHANGİ bir sayfaya gitmeye çalıştığında, bekleyen işaretlenmemiş rezervasyonu varsa layout `{children}` yerine zorunlu bir ekran render eder — mevcut `KuyrukKarti`/`rezervasyonSonuclandir` akışıyla "Sattı"/"Gelmedi" işaretlemeden PANELİN HİÇBİR BAŞKA SAYFASINA geçemez. İşaretleyince `router.refresh()` layout'u yeniden çalıştırır, liste boşalınca otomatik olarak normal panele döner.
2. **Site geneli uyarı şeridi** (`src/components/SiteHeader.tsx`): satıcı panelin DIŞINDayken (vitrinde/anasayfada gezinirken) de habersiz kalmasın diye, aynı header'ın üstünde `/panel`'e link veren amber bir bant gösterilir — "N rezervasyon işaretlenmeyi bekliyor - panele girmek için tıkla".
3. **Vitrin "beklemede" görünümü** (`pasifUrunIdSeti` + `UrunKarti.tsx`/`UrunDetayModal.tsx`/mağaza sayfası/anasayfa): `Urun.durum`'a hiç dokunulmadan, alıcıya gösterilen vitrinde "Beklemede" rozetiyle işaretlenir ve "Rezerve Et" kapatılır. **2026-07-09 canlı testte düzeltilen kapsam:** ilk sürüm SADECE sorunlu ürünü pasifleştiriyordu — ama panel zaten TAMAMEN kilitli olduğu için (satıcı hiçbir işlem yapamıyor) bu tutarsızdı, mağazanın geri kalanı normal satışa devam ediyormuş gibi görünüyordu. Düzeltme: bekleyen işareti olan mağazanın **TÜM ürünleri** pasifleşir, sadece sorunlu ürün değil (`pasifUrunIdSeti` artık önce "hangi mağazalar sorunlu" kümesini çıkarır, sonra o mağazaların TÜM ürün id'lerini döner).

**Terk edilmiş satıcı — 3 günlük admin uyarısı:** Satıcı hiç giriş yapmazsa (hesabı terk etmiş olabilir) sistem sonsuza kadar bekleyemez. `saticiIhmalUyarilariGonder` (aynı cron içinde, `pazarHatirlatmalariGonder`+`pazarlariSifirla`'dan SONRA çağrılır) işlem-sonu anından **3 gün** sonra (`IHMAL_UYARISI_GUN` sabiti) hâlâ işaretlenmemiş kayıtlar için TÜM admin kullanıcılarına tek seferlik bir bildirim gönderir ("satıcı platforma girmemiş olabilir"). Bu **alıcı/satıcı durumunu OTOMATİK çözmez** — sadece admin'in manuel müdahale edebilmesi için bir sinyal. İdempotency: `Rezervasyon.saticiIhmalUyarisiGonderildi` bayrağı + atomik `updateMany({ where: { ..., saticiIhmalUyarisiGonderildi: false } })` (satır zaten `false` koşuluyla korunduğu için ayrı bir kilide gerek yok — `count===0` ise başka bir cron tetiklemesi zaten işlemiştir).

**Migration:** `20260709154854_satici_ihmal_uyarisi` (`Rezervasyon.saticiIhmalUyarisiGonderildi Boolean @default(false)`).

**Canlı test (2026-07-09, geliştirme DB'sinde, temizlenmiş test verisiyle):** gerçek bir mağaza+ürün+rezervasyon (işlem-sonu anı geçmiş, `aktifOlmaZamani` başlangıçtan önce) kuruldu → satıcı girişinde `/panel` VE doğrudan `/panel/urunlerim` her ikisi de zorunlu ekranı gösterdi ✓; SiteHeader banner'ı hem panelde hem anasayfada göründü ✓; mağaza sayfası VE anasayfa vitrini ürünü "Beklemede" + `disabled` butonla gösterdi ✓; "Satıldı" işaretlenince panel ANINDA açıldı, banner kayboldu, vitrin "Satıldı" durumuna döndü ✓. Ayrı bir senaryoda `saticiIhmalUyarilariGonder`: işlem-sonu+2gün'de 0 uyarı (henüz erken) ✓, +3.5gün'de 1 uyarı (`saticiIhmalUyarisiGonderildi` true oldu) ✓, aynı aralık tekrar çalıştırılınca idempotent 0 uyarı ✓, admin sayısı kadar (2 admin → 2 bildirim satırı) bildirim oluştu ✓.

## Dört farklı zaman (kritik)
- **Başlangıç anı** (`Pazar.baslangicGunu`+`baslangicSaati`): ceza eşiği — "kim cezalı" belirler. Değişmedi.
- **Kapanış anı** (`Pazar.sifirlamaGunu`+`sifirlamaSaati`, UI etiketi artık "Kapanış Günü/Saati" — eskiden "Sıfırlama"): pazarın gerçek/ilan edilen kapanış saati. Artık SADECE (1) `pazarRitimBilgisi`'nin "pazar açık mı" göstergesi ve (2) işlem-sonu/hatırlatma hesaplarının CAPA noktası için kullanılıyor — sweep'i doğrudan TETİKLEMİYOR.
- **İşlem sonu anı** (`pazarIslemSonAni` — admin `islemSonGunu`/`islemSonSaati` ayarladıysa o an, yoksa kapanış gününün yerel gece yarısı): sweep'in gerçekten ÇALIŞTIĞI an, kuyruğu temizler + cezaları yazar + bildirim izi bırakır.
- **Hatırlatma anı** (`pazarHatirlatmaAni` — admin `hatirlatmaGunu`/`hatirlatmaSaati` ayarladıysa o an, yoksa kapanıştan 1 saat sonra): satıcıya "işaretlemeyi unutma" bildiriminin gittiği an (`pazarHatirlatmalariGonder`, aynı cron içinde, `PazarHatirlatma` tablosuyla idempotent).
- Hepsi `pazar-haftasi.ts`'te hesaplanır (Europe/Istanbul; `timeZoneName:"shortOffset"` ile genel TZ, Türkiye sabit +3). İşlem-sonu/hatırlatma, `kapanisSonrasiAni` adlı ortak bir yardımcı ile kapanış gününden **ileri** doğru (gün+saat çifti, gerekirse kapanıştan farklı bir güne bile denk gelebilir) hesaplanır — `pazarBaslangicAni`'nin **geriye** doğru mantığının ayna simetriği.

## "Başlangıçta aktif miydi" — kapanışta kuyruktan okunamaz (aktifOlmaZamani gerekçesi)
Kapanış anındaki kuyruk, başlangıç ile kapanış arası değiştiği için (satışlar, gelmediler, yükselmeler) "kim başlangıçta aktifti"yi taşımaz. Çözüm: **`Rezervasyon.aktifOlmaZamani`** — kayıt aktife her geçtiğinde (oluşturmada aktif atanma / `aktifSlotBosalt` yükselme / `rezervasyonGeriAl`; bu üç nokta `rezervasyon-motoru.md`'deki akışlarda) kaydedilir. Kural saf karşılaştırma:

```
no-show  ⟺  tip='aktif' AND durum='bekliyor' AND aktifOlmaZamani < pazarBaslangicAni
```

Ayrı bir başlangıç cron fazı gerekmez — bilgi rezervasyonda taşınır, tek kapanış işi yeter.

## Kimlere ne olur (işlem-sonu anında, hâlâ `bekliyor` olanlar)
- **Başlangıçta aktif + satılmamış** (satıcı sorumlu olması gereken durum) → **artık HİÇ DOKUNULMAZ** (2026-07-09 ikinci güncelleme, yukarı bkz.) — `bekliyor` kalır, hiçbir `DurumGecmisi` izi bırakılmaz. Bunun yerine satıcı zorunlu panel ekranıyla + site geneli banner'la + 3 günlük admin uyarısıyla konuşturulur; ürün vitrinde "Beklemede" görünür.
- **Sonradan yükselen aktif + tüm yedekler** (satıcı sorumlu OLMAYAN durum — kayıt pazar başlangıcından SONRA aktife geçmiş) → `iptal` (cezasız). Audit: `rezervasyon_sifirlama_iptal:{hafta}` (ceza değil, sadece iz). Bu tek otomatik dal, `urunSifirla`'nın hâlâ yaptığı iş.
- **`satildi`/`gelmedi`/`iptal`** (zaten sonuçlanmış) → **dokunulmaz** (sorgu yalnızca `durum='bekliyor'`). Manuel gelmedi → **çift ceza olmaz**.
- Temizlenen (yalnızca yukarıdaki "sonradan yükselen + yedekler" grubu) **herkese** bildirim izi: `bildirimKanali='whatsapp'`, `bildirimGonderildi=false`. **Gönderim yok** (Faz 2: "ürün tekrar açıldı, öncelikli davet").
- Kuyruk (bu iptal grubuyla) boşalınca ürün `satildi` değilse → `sergide`. **Not:** başlangıçta-aktif-ve-işaretlenmemiş kayıt hâlâ varsa (satıcı henüz işaretlemediyse) o mağazanın TÜM ürünleri vitrinde ayrıca `pasifUrunIdSeti` katmanıyla "Beklemede" gösterilir (yalnızca sorunlu ürün değil, bkz. yukarıdaki kapsam notu) — bu, `Urun.durum`'dan BAĞIMSIZ bir görünürlük katmanı.

## Tetikleme + idempotency
- **Harici cron** (Docker/VPS, ~5 dk) → `POST /api/cron/pazar-sifirlama`, `Authorization: Bearer $CRON_SECRET`.
- **Zamana değil duruma bakar:** gün sonu geçmiş VE hâlâ bekleyen kuyruğu olan ürünleri işler → **restart'ta kaçmaz** (catch-up).
- **İki katman idempotency:** (1) her ürün ayrı transaction + `FOR UPDATE` + "hâlâ bekliyor mu" — çift tetikleme no-op; (2) `PazarSifirlama` tablosu `(pazarId, pazarHaftasi)` unique, atomik `ON CONFLICT` upsert — açık "bu hafta yapıldı mı" takibi + audit (`etkilenenSayi`).

## Kapanış hatırlatması (`pazarHatirlatmalariGonder`)

Aynı cron route'u içinde, sweep'ten ÖNCE çağrılır (ama zaman pencereleri zaten ayrışık: hatırlatma `[kapanış+1saat, ...)`, sweep `[gün sonu, ...)` — aynı anda ikisi birden bir pazar için tetiklenmez). Amaç: satıcıya "işaretlemeyi unutma" uyarısı, hiçbir rezervasyon durumunu DEĞİŞTİRMEZ.

**Dikkat edilmesi gereken bir tuzak (canlı test sırasında bulundu):** `pazarHaftasi`, `sonrakiSifirlamaTarihi(pazar, now)` ile hesaplanamaz — bu fonksiyon "bundan sonraki İLK kapanış" verir, ama hatırlatma TAM OLARAK kapanıştan sonra çalıştığı için `now` zaten o haftanın kapanışını geçmiş olur ve fonksiyon otomatik bir SONRAKİ haftaya yuvarlar. Doğru hafta, bu yuvarlanmış tarihten **7 gün geri** gidilerek bulunur (`sonrakiSifirlamaTarihi(...) - 7 gün`) — döngüler her zaman tam 7 gün ara olduğu için bu her koşulda (kapanıştan önce ya da sonra çağrılsa da) doğru sonucu verir.

İdempotency: `PazarHatirlatma` tablosu, `PazarSifirlama` ile AYNI desen (`(pazarId, pazarHaftasi)` unique) ama `ON CONFLICT DO NOTHING` — biriktirme yok, sadece tek seferlik "gönderildi mi" bayrağı.

## Puan / güvenilirlik sistemine bağlantı

**2026-07-09 ikinci güncelleme sonrası ÖNEMLİ değişiklik:** `rezervasyon_gelmedi:otomatik:{pazarHaftasi}` audit olayı artık **hiç üretilmiyor** — bu bölümün önceki hâli güncel değildi. Otomatik no-show tamamen kaldırıldığı için, `Kullanici.gelmedi` sayımına (bkz. [`guvenilirlik-sistemi.md`](./guvenilirlik-sistemi.md)) katkı **yalnızca** satıcının bizzat tıkladığı manuel Gelmedi'den gelir:

- **Gelmedi (no-show) olayları** — `DurumGecmisi.olay` alanında, `kullaniciId = aliciId` ile:
  - `rezervasyon_gelmedi:aktif:{siraNo}` → satıcının manuel işaretlediği Gelmedi (bkz. `rezervasyon-motoru.md`). **Artık TEK kaynak.**
  - ~~`rezervasyon_gelmedi:otomatik:{pazarHaftasi}`~~ — KALDIRILDI, artık yazılmıyor. Geçmişte (2026-07-09 ikinci güncellemeden ÖNCE) yazılmış kayıtlar DB'de kalıcı olarak durur (hiçbir kayıt silinmez ilkesi) ama yeni üretilmez.
- **Ceza SAYILMAYACAK olaylar** (güvenilirlik havuzuna girmemeli):
  - `rezervasyon_sifirlama_iptal:{hafta}` → sıfırlamada cezasız temizlenen (sonradan yükselen aktif + yedekler). Kişi "gelme sözü" vermemişti.
  - `rezervasyon_iptal:...` → alıcının kendi vazgeçmesi (dürüst çekilme). "Geç iptal hafif kusurdur" gibi bir kural istenirse, o **puan sisteminin** kararı — sıfırlama bunu ceza saymaz.
- **"Aldı" tarafı** (güvenilirlik oranının paydası) — `satildi` durumundaki rezervasyonlar / `rezervasyon_satildi:%` olayları.

Özetle: bu adım **veri bırakır**, puan **kuralı koymaz**. Kurallar puan-sistemi adımında `DurumGecmisi` üzerinden sayımla gelir (PLAN §3 & §6: "veri kayıtlı kaldığı sürece istatistik sonradan çıkar").

## İtiraz
Otomatik ceza artık YOK, dolayısıyla "otomatik cezaya itiraz" senaryosu da ortadan kalktı. Kalan tek admin-müdahale senaryosu: satıcı 3 gün boyunca işaretlemezse (`saticiIhmalUyarilariGonder`) admin'e giden uyarı — admin bu durumda satıcıyla manuel iletişime geçer ya da (henüz kodlanmamış) mağaza/rezervasyon üzerinde elle işlem yapar.

## Test kanıtı (7 rezervasyon, izole test pazarı, psql doğrulandı) — ⚠️ TARİHSEL, (a) artık geçerli değil

**Bu iki test-kanıtı bölümü 2026-07-09 ikinci güncellemeden ÖNCE, otomatik `gelmedi` cezası hâlâ varken yazıldı.** (b)-(e) maddeleri ve TZ doğrulaması bugün de geçerli (o mantık değişmedi), ama **(a) artık YANLIŞ**: "başlangıçta aktif+satılmamış" kategori bugün `gelmedi`+ceza almaz, `bekliyor` kalır (bkz. yukarıdaki "İKİNCİ güncelleme" bölümündeki güncel canlı test kanıtı). Bölümler silinmedi (karar geçmişinin izi olarak bilinçli tutuluyor).

- (a) ~~başlangıçta aktif+satılmamış → `gelmedi`+ceza~~ — ARTIK GEÇERSİZ, bkz. yukarı.
- (b) başlangıçtan sonra yükselen → cezasız `iptal` ✓ (hâlâ geçerli)
- (c) `satildi` → dokunulmadı ✓ (hâlâ geçerli)
- yedekler → cezasız `iptal` + bildirim izi ✓ (hâlâ geçerli)
- (d) idempotency: ikinci tetikleme `{islenenUrun:0}`, `etkilenenSayi` sabit, çift ceza yok ✓ (hâlâ geçerli)
- (e) farklı hafta (gelecek `pazarHaftasi`) + farklı pazar (kapanışı gelmemiş) → dokunulmadı ✓ (hâlâ geçerli)
- TZ: başlangıç eşiği 06:00Z (=Istanbul 09:00) doğru; 05:00Z cezalı / 12:00Z cezasız net ayrıştı ✓ (hâlâ geçerli — bu eşik hâlâ "satıcı sorumlu mu" ayrımında kullanılıyor, sadece sonucu artık ceza değil "bekliyor kalır")

## Test kanıtı — çok-pazarlı izolasyon — ⚠️ TARİHSEL, "no-show cezası" ifadesi artık geçersiz

**Aynı şekilde bu bölüm de eski davranışla yazıldı** — Seferihisar'ın rezervasyonunun bugün alacağı gerçek sonuç `gelmedi` DEĞİL, `bekliyor` kalmasıdır (satıcı işaretleyene kadar). İzolasyonun kendisi (her ürün kendi pazarına göre değerlendiriliyor, farklı pazarlar karışmıyor) hâlâ doğru ve geçerli — sadece "hangi sonuç yazılıyor" kısmı değişti.

`pazarlariSifirla` her ürünü **kendi** `magaza.pazar`'ının kapanış anına göre değerlendirdiği için, farklı `sifirlamaGunu`/`saatDilimi` sahip pazarlara bağlı mağazaların aynı cron çağrısında karışmaması bekleniyor. Bu daha önce yalnızca tek pazarla kanıtlanmıştı (yukarıdaki bölüm); bugünkü mağaza-açılışında pazar seçimi eklenince (SP-4) ilk kez birden fazla pazar aynı anda üretimde var oldu.

**Kurulum:** 2 farklı pazar (Seferihisar: Çarşamba 20:00, Yeşilyurt: Salı 20:00), her birine ayrı bir mağaza+ürün+bekleyen aktif rezervasyon bağlandı. Seferihisar'ınki geçmişte kalan bir `pazarHaftasi` ile (kapanışı çoktan geçmiş, `aktifOlmaZamani` başlangıç anından önce → no-show bekleniyor), Yeşilyurt'unki gelecekte bir `pazarHaftasi` ile (kapanışı henüz gelmemiş) kuruldu.

**Gerçek cron çağrısı** (`POST /api/cron/pazar-sifirlama`, doğru `CRON_SECRET`) → `{"islenenUrun":1,"toplamEtkilenen":1}`.

**Bağımsız doğrulama (`psql`):**
- Seferihisar'ın rezervasyonu → `gelmedi`, ürün → `sergide` ✓ (no-show cezası doğru pazarın kendi `baslangicAni`'sine göre uygulandı)
- Yeşilyurt'un rezervasyonu → hâlâ `bekliyor`, tamamen dokunulmamış ✓
- `PazarSifirlama` tablosunda **yalnızca** Seferihisar için kayıt var, Yeşilyurt için hiç kayıt yok ✓

Sonuç: çok-pazarlı ortamda sıfırlama beklenen izolasyonu koruyor, regresyon yok.

## Veri modeli (migration `20260703035648_haftalik_sifirlama`, `PazarHatirlatma` → `20260709140233_pazar_hatirlatma`, işlem-sonu/hatırlatma alanları → `20260709144934_pazar_icerik_ve_zamanlama_alanlari`)
- **Pazar**: `baslangicGunu` + `baslangicSaati` (ceza eşiği, değişmedi); `sifirlamaGunu`/`sifirlamaSaati` (kapanış, UI'da "Kapanış Günü/Saati"); `islemSonGunu`/`islemSonSaati` (opsiyonel, NULL ise gün-sonu/gece-yarısı varsayımı); `hatirlatmaGunu`/`hatirlatmaSaati` (opsiyonel, NULL ise kapanış+1saat varsayımı); ayrıca içerik alanları `belediyeAdi`/`aciklama`/`sorumluAdi`/`sorumluTelefon` (bu akışı etkilemez, raporlama/admin referansı).
- **Rezervasyon**: `aktifOlmaZamani`, `bildirimGonderildi`, `bildirimKanali`, `saticiIhmalUyarisiGonderildi` (2026-07-09 ikinci güncelleme — 3-gün admin uyarısı idempotency'si).
- **PazarSifirlama**: `(pazarId, pazarHaftasi)` unique, `calismaZamani`, `etkilenenSayi` — sweep idempotency.
- **PazarHatirlatma**: `(pazarId, pazarHaftasi)` unique, `gonderilmeZamani` — hatırlatma idempotency (ayrı tablo, sweep ile karışmasın).

## İleride
- **Karar netleşti (bkz. yukarıdaki "2026-07-09 İKİNCİ güncelleme" bölümü):** Satıcı işlem-sonuna kadar işaretlemezse artık HİÇBİR otomatik ceza uygulanmıyor — zorunlu panel kilidi + vitrin pasifliği + 3 günlük admin uyarısı ile çözülüyor. Bu bölümdeki eski "ertelenen karar" notu kapandı.
- Bildirim gönderimi (whatsapp) Faz 2 — şu an yalnızca in-app bildirim (`Bildirim` tablosu) var.
- Admin'in 3-gün uyarısı sonrası ne yapacağı (satıcıyla iletişim dışında, mağaza/rezervasyon üzerinde elle bir işlem imkânı) henüz kodlanmadı — bugün yalnızca bilgilendirme amaçlı.
