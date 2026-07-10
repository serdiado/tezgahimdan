# Mimari Kararlar — Tezgahımdan

Bu dosya bir **indeks**: projedeki büyük mimari kararların kısa özeti ve nerede detaylandırıldığı. "Neden böyle yapıldı" sorusunun kısa cevabı burada, tam cevap ilgili detay dosyasında (`docs/mimari/` altında).

Yeni bir mimari karar alındığında (özellikle eşzamanlılık, veri bütünlüğü, ölçeklenme gibi geri dönüşü zor kararlarda):
1. Konuya özel bir detay dosyası aç (`docs/mimari/<konu-adi>.md`)
2. Bu dosyaya 3-5 satırlık bir özet + link ekle

---

## Rezervasyon motoru (kilit + kuyruk + kullanıcı/satıcı akışları)

Pesimistik satır kilidi (`SELECT ... FOR UPDATE`) ile aktif+yedek kuyruğu yönetimi. Eşzamanlılık riski en yüksek bölüm. Aynı kilit dört akışı serileştirir: **rezervasyon oluştur** (8 paralel istekle test), **Vazgeç** (alıcı), **Satıldı/Gelmedi** (satıcı), **Geri Al** (satıcı yanlış işaretlemeyi geri alır). Satıldı stok-tutarlı: her satış bir birim tüketir, kapasite `stok − satıldı` üzerinden (INVARIANT: `aktif ≤ stok − satıldı`, fazla-satış imkânsız). Geri Al iki durumda reddedilir (`urun_satildi` / `kapasite_dolu`), red nedeni `DurumGecmisi`'ne yazılır.

→ Detay: [`docs/mimari/rezervasyon-motoru.md`](./mimari/rezervasyon-motoru.md)

**Bilinmesi gereken bağımlılık:** Ürünü `doldu` durumuna çeviren tek yer bu akış. Slot boşaltan her yeni özellik (Vazgeç ✓, Gelmedi ✓, haftalık sıfırlama ✓, admin müdahalesi) `doldu → sergide` geri dönüşünü yapmayı unutmamalı.

---

## Haftalık sıfırlama (otomatik) + satıcı ihmali asla alıcı cezası değil

Pazar **işlem-sonu anında** (admin pazar bazında manuel ayarlayabilir — `Pazar.islemSonGunu/Saati`, boş bırakılırsa kapanış-gününün-gece-yarısı; gece geç saatlere kadar açık pazarlar için düşünüldü) o pazarın bekleyen kuyruğu değerlendirilir (rezervasyon motoruyla **aynı** `FOR UPDATE` kilidi, ama davranış ayrı — motor yükseltir, sıfırlama temizler). **2026-07-09 kararı (önemli):** "pazar başlangıcında zaten aktif olup hâlâ işaretlenmemiş" kayıtlara (satıcının sorumlu olduğu durum) **otomatik `gelmedi` cezası artık UYGULANMAZ** — sistem satıcının mı unuttuğunu yoksa alıcının mı hiç gelmediğini ayırt edemediği için "her satıcı ihmali alıcı lehine çalışmalı" prensibiyle bu kayıtlar `bekliyor` kalır. Bunun yerine satıcı **zorunlu panel kilidiyle** (`/panel` altı hiçbir sayfa açılmaz, `panel/layout.tsx`) + **site geneli uyarı banner'ıyla** (`SiteHeader.tsx`) + tezgahındaki TÜM ürünlerin vitrinde **"Beklemede"** gösterilmesiyle (`pasifUrunIdSeti` — sadece sorunlu ürün değil, panel zaten tamamen kilitli olduğu için mağazanın tamamı pasifleşir) bizzat işaretlemeye zorlanır; 3 gün boyunca hiç giriş yapmazsa admin'e tek seferlik uyarı gider (`saticiIhmalUyarilariGonder`). Sonradan yükselen aktif + yedekler → hâlâ cezasız `iptal` (bu dal değişmedi); `satildi` dokunulmaz. Hatırlatma anı da admin tarafından ayrıca yapılandırılabilir. Harici cron + korumalı API (`/api/cron/pazar-sifirlama`), duruma-bakan (restart'ta kaçmaz), idempotent (`PazarSifirlama` + `PazarHatirlatma` + `Rezervasyon.saticiIhmalUyarisiGonderildi`).

→ Detay: [`docs/mimari/haftalik-sifirlama.md`](./mimari/haftalik-sifirlama.md)

---

## Güvenilirlik (ceza-ödül) sistemi

**2026-07-10'da baştan tasarlandı.** Görünür bir -100/+100 puan skalası bilinçli REDDEDİLDİ (tek cümlede anlatılamaz, negatif sayı damgalar, pilot ölçeğinde anlam üretmez). Kural: alıcının sonuçlanmış rezervasyonlarında **üst üste** `guvenilirlikEsigi` (varsayılan 3) "gelmedi" serisi oluştuğu anda **`yasakSuresiGun`** (varsayılan 7 gün) yeni-rezervasyon yasağı başlar (`Kullanici.rezervasyonYasagiBitisi`), alıcının bekleyen rezervasyonları o an iptal edilir (yalnızca pazarı HENÜZ BAŞLAMAMIŞ olanlar — o gün devam eden pazarın ve geçmiş haftanın işaretlenmemiş kayıtlarının hükmü satıcıda kalır; yasağın kendisi yine anında başlar) ve sayaç sıfırlanır — yasak bitince temiz sayfa. "Satıldı" seriyi bozar, alıcının kendi vazgeçmesi nötrdür; sıra ölçütü işaretlenme anı değil pazarın yaşandığı haftadır (geç işaretleme adaleti bozmaz). Satıcı "gelmedi"yi Geri Al'ırsa yasak otomatik kalkar (alıcı lehine önyargı; süpürülen rezervasyonlar geri gelmez — kabul edilen asimetri). Admin affı yasak+seriyi birlikte temizler; eşik ve süre `/admin/ayarlar`'dan değiştirilebilir. Eski "eşik + elinde aktif varken alamaz" iki-şartlı kapı kaldırıldı — kronik gelmeyeni hiç durdurmuyordu, rozetle de tutarsızdı.

→ Detay: [`docs/mimari/guvenilirlik-sistemi.md`](./mimari/guvenilirlik-sistemi.md)

---

## Satıcı onboarding (self-servis + moderasyon)

"Mağaza Aç" ile bir kişi **anında** satıcı olur (admin onayı yok): `magazaAc()` tek
transaction'da mağazayı açar + `alici→satici` terfi eder + `DurumGecmisi`'ne
`magaza_olusturuldu` izi bırakır. Kalite denetimi sonradan **`gizliMi`** bayrağıyla:
admin mağazayı vitrinsen gizler. `gizliMi`, `silindiMi`'den **ayrı** tutulur — çünkü
`silindiMi` hem `getOwnMagaza`'yı filtreler (satıcı erişimini keser) hem de
tek-aktif-mağaza unique index'i yüzünden gizlenen satıcının ikinci mağaza açmasına yol
açardı. `gizliMi` ayrıca yeni rezervasyonu da kapatır (mevcut bekleyenlere dokunmadan).
Rol JWT'de bayat kalabildiği için (aynı oturumda terfi) yetki `getSaticiSession` içinde
**DB'den** okunur.

→ Detay: [`docs/mimari/satici-onboarding.md`](./mimari/satici-onboarding.md)

**İleri referans:** Ana Sayfa çok-mağaza vitrini kurulunca `gizliMi` filtresi oraya da
eklenmeli (bugün yalnız `getMagazaBySlug` filtreliyor).

---

## Mağaza takibi + fiyat düşüşü bildirimi + en çok beğenilenler vitrini

Favori/Beğeni sisteminin 3 küçük genişlemesi. **Mağaza takibi**: `UrunFavori`'yi
genişletmek yerine ayrı `MagazaTakip` tablosu (farklı hedef varlık, `begeniMi`
karşılığı yok — genişletmek her mevcut favori sorgusunu "urunId null olabilir"
ihtimaline karşı gözden geçirmeyi gerektirirdi). **Fiyat düşüşü**: yeni fonksiyon
yok, mevcut `bildirimGonderTakipcilere` yeniden kullanıldı, karşılaştırma motor
kilidi DIŞINDA. **En çok beğenilenler**: Prisma'nın resmi desteklediği
`groupBy`+`orderBy:{_count}` ile sıralama, görünürlük filtresi ayrı bir
`Urun.findMany`'de uygulanıyor (test: gizli mağazanın çok-beğenilen ürünü
vitrinde çıkmıyor). Üçü de rezervasyon motoruna HİÇ dokunmuyor.

→ Detay: [`docs/mimari/magaza-takip.md`](./mimari/magaza-takip.md)

---

## Değerlendirme/yorum sistemi

PLAN.md'nin bilinçli Faz-2 ertelemesiydi. Kullanıcı kararı: **SADECE gerçekten
satın alan** (`Rezervasyon.durum="satildi"` VE `aliciId`=kullanıcı) değerlendirme
bırakabilir — bu kural DB'de zorlanmaz, API katmanında salt-okunur
`Rezervasyon.findFirst` ile doğrulanır (motora hiç çağrı yok). Puan/yorum
SONRADAN güncellenebilir (upsert, tek satır — begeni/takip toggle'ıyla aynı
mantık). "Değerlendir" butonu bilinçli olarak `/rezervasyonum`'da (ürün
kartında değil) — satın-alma kontrolü o sayfada zaten bedava, karta koymak
her render'da gizli bir yetki sorgusu gerektirirdi.

→ Detay: [`docs/mimari/degerlendirme-sistemi.md`](./mimari/degerlendirme-sistemi.md)

---

## "Rezervasyonun yükseldi" bildirimi

Favori/Bildirim sisteminin bilinçli olarak en sona bırakılan tek eklentisi:
bir kullanıcının YEDEK sıradaki rezervasyonu aktife yükselince ona özel
"sıra sana geldi" bildirimi. Motor (`rezervasyon.ts`) zaten `yukselenKodu`
döndürüyordu, tek satır değişmedi — route katmanı bu veriyi tüketti. Yükselen
kişi ürünü takip ediyorsa çift/yanıltıcı bildirim almaması için
`bildirimGonderTakipcilere` tek kullanıcı yerine bir dizi kullanıcı hariç
tutacak şekilde genişletildi.

→ Detay: [`docs/mimari/rezervasyon-yukseldi-bildirimi.md`](./mimari/rezervasyon-yukseldi-bildirimi.md)

---

## Bildirim sistemi

İki tür: **işlem bildirimi** (otomatik, kısa, varlığa bağlı; `Bildirim` tablosu) ve **duyuru** (admin'in yazdığı uzun editoryal içerik; ayrı `Duyuru` tablosu, `Bildirim` sadece pointer). İkisi de `/bildirimlerim` + zil rozetinde görünür (tüm rollerde). Tıklama hedefi: `urunId → ürün`, `duyuruId → /duyuru/[id]`, yoksa `hedefYolu`, hiçbiri yoksa tıklanamaz (üçü karşılıklı dışlayıcı). Motor bildirim GÖNDERMEZ — hep route katmanında. Alıcı bildirimini soft-delete'le temizleyebilir. Duyuru modülü: admin CRUD + yayınla (idempotent fan-out) + `/duyuru/[id]` detay + görsel (pazar-gorsel deseni, `IZINLI_ALT_DIZINLER`'e "duyuru" eklendi). 2026-07-10 denetiminde 7 sessiz-durum boşluğu kapatıldı (ürün tükenince iptal, aktiften düşme, admin/pazar simetri); bazı "eksikler" ise bilinçli karar çıktı (tek gelmedi/satıldı bildirilmez, şikayet pull-yüzeyli). E-posta/SMS Faz 2.

→ Detay: [`docs/mimari/bildirim-sistemi.md`](./mimari/bildirim-sistemi.md)

---

## Çoklu pazar ve çoklu gün (PLANLANMIŞ — henüz uygulanmadı)

Pilot sonrası büyüme için kararları sağlama alan planlanan revizyon. İki gerçek ihtiyaç: **A** satıcı birden çok pazarda tezgah açar (Seferihisar+Sığacık), **B** aynı pazar haftada çok gün kurulur (2 günlük belediye / Eskişehir 7 gün). Kilitlenen kararlar: ceza GLOBAL + üst üste-3 (mevcut model zaten karşılıyor); Magaza↔Pazar çoka-çok (tek marka, çok pazar, self-servis Tezgah Ekle); Ürün↔Pazar etiketi (tek katalog); **stok tek ortak havuz**; `Pazar.acikGunler` (gün seti); rezervasyona `pazarId`+occurrence eklenir. Asıl karar — ortak stokta kuyruk sırası: **erken kurulan pazar (occurrence) önceliklidir, geç pazar baştan yedek başlar, erken pazar kapanınca stok kaldıysa geç pazar yedekleri asile terfi eder (düşme yok, şeffaflık şartıyla adil)**. Bugünkü haftalık-tek-gün motoru pilot için korunur; uygulama zamanı dosya üzerinde tekrar tasarım turu yapılacak.

→ Detay: [`docs/mimari/coklu-pazar-ve-coklu-gun.md`](./mimari/coklu-pazar-ve-coklu-gun.md)

---

## Mobil uygulama (PLANLANMIŞ — henüz uygulanmadı)

Amaç: **satıcıları mobilde organize etmek + sürekli push bildirimle yönlendirmek** (ör. "açık işlemlerinizi tamamlayın"); alıcıyı mobile taşımak öncelik değil. Web'den **farklı arayüz/işleyiş istenmiyor**. Karar: **Capacitor** — mevcut web'i saran tek koddan Android + iOS; kullanıcı aynı paneli cepten yapar, web değişiklikleri mobile **otomatik yansır** (React Native gibi ayrı UI kod tabanı yok). İş mantığı zaten sunucuda paylaşımlı. Asıl yeni iş **push**: mevcut bildirim tetiklerine (yeni rezervasyon, kapanış hatırlatması, satıcı ihmali — `bildirimKanali` kancası) eklenen bir teslim kanalı; cihaz-token tablosu + FCM (Android) / APNs (iOS) + gönderim servisi + mağaza hesapları. Push'a dokununca deep-link `/panel/rezervasyonlar`. Sıra: PWA → Capacitor Android+FCM → iOS+APNs.

→ Detay: [`docs/mimari/mobil-uygulama.md`](./mimari/mobil-uygulama.md)

---

## Kategori keşif ekseni / global kategori menüsü (ERTELENDİ — pilotta uygulanmayacak)

**2026-07-11 kararı.** "Kategorileri vitrinde büyük ikonlu bir ana menü yap, tıklayınca kategori sayfası / ileride resimli mega-menü açsın" fikri pilota alınmadı. Kritik ayrım: **ucuz görsel katman (ikonları yukarı taşımak) pahalı kısma bağımlı** — bugün kategoriye tıklayınca gidilecek global bir hedef YOK (kategori yalnız tek tezgah içinde filtreliyor); hiçbir yere gitmeyen büyük buton, hiç olmamasından kötü. Pilota özgü üç sorun: **boş-raf sinyali** (düz set + tek pazarlı küçük envanter → 0-1 ürünlü ikonlar, hem alıcıya hem belediye sunumlarına cılızlık ilan eder; tezgah-içi çip zaten "sadece dolu kategori" ile bunu çözüyor), **iki keşif ekseni çatışması** (pazar-merkezli tek eksene dik tür-menüsü, low-tech kitlede kafa karışıklığı + teslim-günü bağlam kaybı), **sadelik/marka** (WhatsApp-basitliği + "yeni aksan renk ekleme" kuralı). "Ana menü" çerçevesi de yanlış: site-navigasyonu (`SiteHeader`) ile ürün-taksonomisi gezinmesi ayrı şeyler; gerçek nav boşluğu varsa çözümü tek bir "Pazarlar" linki, kategori değil. Fikir çöpe atılmadı: çoklu-pazar + kategori başına ~15-20 ürün derinliği eşiğinde yeniden açılır; üç ileri-uyum sözleşmesi (rota `/?kategori=slug`, additive `ustKategoriId`, mobil tap-panel) + `pazar.aktifMi` süzme tuzağı bugünden karara bağlandı.

→ Detay: [`docs/mimari/kategori-kesif-ekseni.md`](./mimari/kategori-kesif-ekseni.md)

---

## WhatsApp iletişim + Tezgah bilgisi/kroki + Mağaza değerlendirmesi

Üç bağımsız özellik, aynı oturumda mağaza sayfası etrafında eklendi. **WhatsApp**:
`Magaza.whatsappNo` zaten vardı, sadece `wa.me/<numara>` linkiyle gösterime açıldı
(mesaj ön-doldurma yok). **Tezgah bilgisi/kroki**: admin-yönetimli ortak pazar haritası
YERİNE her satıcının kendi mağazası için tek bir fotoğraf yüklediği self-servis model
(`Magaza.tezgahBilgisi` + `krokiFotoUrl`, `urunEkle()`'nin tek-foto sadeleştirilmiş
hali). **Mağaza değerlendirmesi**: `Degerlendirme`ye `magazaId` eklemek yerine ayrı
`MagazaDegerlendirme` tablosu (`MagazaTakip` kararıyla tutarlı gerekçe) — kim
değerlendirebilir: bu mağazadan (hangi ürün olursa olsun) satın almış herkes,
`/rezervasyonum`'da mağaza-bazlı tekil buton.

→ Detay: [`docs/mimari/magaza-iletisim-ve-degerlendirme.md`](./mimari/magaza-iletisim-ve-degerlendirme.md)

---

## Alıcı kullanıcı paneli (sol menü + yeni sayfalar)

Projede İLK sidebar deseni (satıcı/admin panelinde de yoktu). `(alici-panel)`
route group ile `/rezervasyonum`, `/favorilerim`, `/bildirimlerim` URL'leri
DEĞİŞMEDEN ortak `layout.tsx` + `AliciPanelMenu.tsx`'e (tek bileşen: masaüstü
sol sabit menü, mobilde üstte yatay kaydırılabilir sekme çubuğu) taşındı. Auth
gate BİLEREK layout'a taşınmadı (layout'lar hangi alt-rota aktif olduğunu
next= için güvenilir bilemez), her sayfa kendi redirect kontrolünü korudu. 4
yeni sayfa eklendi: Ürün/Mağaza Değerlendirmelerim (mevcut form bileşenleri
aynen yeniden kullanıldı), Takip Ettiğim Mağazalar (`MagazaKarti` paylaşılan
bileşene taşındı + `altAksiyon` prop'u), Ayarlar (ad/telefon/şifre — "şifremi
unuttum"/"hesabımı sil" email altyapısı+migration gerektirdiği için Faz 2'ye
bilinçli ertelendi).

→ Detay: [`docs/mimari/alici-kullanici-paneli.md`](./mimari/alici-kullanici-paneli.md)

---

## Pazar yaşam döngüsü (il/ilçe serbest metin + `aktifMi` kapanma)

Eski tek `bolge` (serbest metin) alanı kaldırıldı; yerine `il`+`ilce` (zorunlu),
`semt` (opsiyonel), `googleHaritaLinki` (zorunlu, gömülü değil — yeni sekmede açılır)
geldi. Türkiye geneli il/ilçe referans verisi **bilinçli olarak eklenmedi**: pazarlar
zaten belediyelerle yapılan gerçek anlaşmalar sonucu admin tarafından tek tek elle
açılıyor. `Pazar.aktifMi=false` artık salt bilgi değil, **üç** çalışma-zamanı etkisi
var: vitrinde/anasayfada mağazalar gizlenir, bağlı satıcılar panele giremez (yeni
`src/app/panel/layout.tsx` — projede ilk panel-geneli ortak layout), yeni mağaza
açılışında seçilemez — kalıcı silme yok. Otomatik/gizli varsayılan pazar oluşturma
fallback'i kaldırıldı; `magazaAc()`'in `pazarId`'si artık zorunlu.

→ Detay: [`docs/mimari/pazar-yasam-dongusu.md`](./mimari/pazar-yasam-dongusu.md)

---

## Deploy mimarisi (Oracle VPS — Docker tabanlı prod)

CLAUDE.md'nin "Docker yalnızca dev'de" ilk varsayımı, gerçek deploy'a
geçilirken bilinçli olarak değiştirildi: hedef VPS paylaşımlı bir hosting
sunucusu (CyberPanel + OpenLiteSpeed, üzerinde ilgisiz bir başka iş —
`tirebirlik.com.tr` — gerçek mail servisiyle barınıyor), Node/Postgres'i
doğrudan sisteme kurmak o işi etkileyebilecek çakışma riski taşırdı. Prod'da
da hem uygulama hem Postgres Docker'da; OpenLiteSpeed sadece reverse-proxy
yapıyor. Yerel `docker build` testinde 3 gerçek hata (pnpm 10+'ın native
derleme script engeli, eksik OpenSSL, CMS sayfalarının build-time'da
patlaması) build'e girmeden bulunup düzeltildi.

→ Detay: [`docs/mimari/deploy-mimarisi.md`](./mimari/deploy-mimarisi.md)

---

## Bilinen kısıtlar (deploy öncesi gözden geçirilecek — tüm proje geneli)

- **Rate-limit yok:** Deploy öncesi en azından IP bazlı limit değerlendirilmeli. (KP-1 üyelik zorunluluğuyla sahte-numarayla kitle rezervasyonu riski büyük ölçüde azaldı — rezervasyon için hesap gerekir; yine de rate-limit tamamen ikame etmez.)
- **~~Telefonla mevcut rezerv kodu ifşası~~ (KP-1 ile kapandı):** Kod+telefon arama (`/api/rezervasyon/sorgula`) kaldırıldı; kullanıcı yalnız giriş yapıp kendi rezervasyonlarını görür.
- **Satıcı kendi ürününe rezervasyon yapabiliyor:** Şu an engellenmiyor, kural tanımsız.
- **Stok sonradan düşürülürse:** Mevcut aktif rezervasyon sayısı yeni stoktan büyük kalabilir. Ürün düzenleme akışı yazılırken ele alınacak.
- **Geri alma redlerinin doğası:** Geri alma redleri (`DurumGecmisi`'ndeki `geri_alma_reddedildi` kayıtları) kalıcı (gerçekten dolu/satıldı) ya da yarış kaynaklı geçici olabilir. Admin paneli bu kayıtları listelerken bu ayrımı yapmalı.
- **Kategori kaldırma ile eşzamanlı ürün ekleme (kapanmamış milisaniyelik pencere):** `urun-ekle`/`urun-duzenle` artık gönderilen kategoriyi kilitsiz okuyup `silindiMi` kontrol ediyor (AP-4 sonrası); admin bir kategoriyi *tam bu okumadan hemen sonra* kaldırırsa nadir bir yarış hâlâ mümkün — kabul edilebilir risk (kategori kaldırma nadir bir admin eylemi).
- **Telefon/hesap doğrulaması yok:** Kayıtta girilen telefon numarası (ya da email) hiç doğrulanmıyor — sahte numarayla hesap açılabilir. Bilinçli olarak ERTELENDİ, deploy'da bile hemen kurulmayacak: önce Seferihisar pazarında ücretsiz bir pilot dönemi yapılacak (sorunlar görülüp düzeltilecek), pilot sorunsuz gidip başka belediyelere sunulmadan ÖNCE SMS OTP ile telefon doğrulaması eklenecek (2026-07-07'de değerlendirildi: WhatsApp Business API 2026 fiyat değişikliğiyle "authentication" mesajları artık ilk mesajdan itibaren ücretli + template onayı + iş doğrulaması gerektiriyor, resmi olmayan otomasyon ToS/yasaklanma riski taşıyor — SMS OTP, örn. Netgsm/İletiMerkezi/VatanSMS, çok daha basit ve ucuz. WhatsApp numarası SADECE yardım merkezi/destek hattı olarak kullanılacak, doğrulama için değil).
