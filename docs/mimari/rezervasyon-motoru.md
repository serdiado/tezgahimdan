# Rezervasyon Motoru — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#rezervasyon-kilidi-ve-kuyruk-mantığı)

## Karar: Pesimistik satır kilidi (`SELECT ... FOR UPDATE`)

Rezervasyon oluşturma, `prisma.$transaction` içinde önce ürün satırını `SELECT ... FOR UPDATE` ile kilitler. Sayım (kaç aktif/yedek var), karar (aktif/yedek/dolu) ve insert hep bu kilit altında yapılır. Aynı ürüne gelen tüm istekler kilitte sıraya girer; kapasite aşımı ya da çift sıra numarası fiziksel olarak imkânsız. Farklı ürünler birbirini hiç engellemez, kilit satır bazlı.

## Neden optimistic (unique constraint + retry) değil

- Retry döngüsü karmaşıklığı gerektirmiyor.
- "Dolu mu" kararı için zaten güvenilir bir sayım şart — optimistic yaklaşımda bile bu sayım gerekir, yani karmaşıklığı azaltmıyor, sadece taşıyor.
- Ölçek argümanı: yerel pazar uygulamasında bir ürüne aynı saniyede düşen istek sayısı en fazla bir avuç. Milisaniyelik kritik bölge için kilit maliyeti önemsiz.
- READ COMMITTED izolasyon seviyesi yeterli, çünkü kilit zaten serileştirme görevini görüyor.

## Kimlik çözümleme neden ürün kilidinin dışında

KP-1 öncesi burada telefon bazlı "kullanıcıyı bul-veya-oluştur" yapılıyordu. KP-1 ile kimlik artık oturumdan gelir (`aliciId = session.user.id`) ve varsa telefon kaydı **API katmanında, ürün kilidinden önce** yapılır. Bu noktaların kilit dışında olması kilit alma sırasını sabitler (önce kullanıcı/telefon yazımı, sonra ürün satırı `FOR UPDATE`), döngüsel bekleme (deadlock) riskini yapısal olarak ortadan kaldırır. Postgres'te transaction içindeki herhangi bir hata (unique ihlali dahil) tüm transaction'ı iptal ettiği için, telefon benzersizlik çakışması gibi durumlar da bilinçli olarak kilit dışında, kendi başına ele alınır.

## Bilinen bir hata ve dersi (dev ortamına özgü)

İlk test turunda, aynı telefonla iki paralel "ilk temas" isteği 500 döndürdü. Kök neden: `err instanceof Prisma.PrismaClientKnownRequestError` kontrolü, dev sunucusunda hot-reload sonrası bayat modül referansı yüzünden eşleşmiyordu (`globalThis`'teki Prisma singleton'ı eski modül örneğinin hata sınıflarını fırlatıyor, yeni import edilen sınıfla `instanceof` tutmuyor).

Önemli: **veri hiç bozulmadı** — `psql` ile doğrulandı, yarışan telefonda tam 1 kullanıcı + 1 rezervasyon oluşmuştu. 500, sadece yüzeydeki yanlış hata koduydu; kilit görevini doğru yapmıştı.

Düzeltme: `instanceof` yerine yapısal kontrol (`p2002Mi()`, `p2002Hedefi()` — `src/lib/prisma.ts`). Aynı mayın `MagazaOlusturForm`'da da vardı (hiç tetiklenmediği için görünmüyordu), o da düzeltildi. Düzeltme, sunucu yeniden başlatılmadan (bayat singleton koşulu ayaktayken) tekrar test edilerek kanıtlandı.

## Test kanıtı — 8 paralel istek

Stok=1 ürüne, aynı senkron blokta oluşturulup `Promise.all` ile ateşlenen 8 gerçek paralel istek, 8 farklı telefon:

```
+905557770001 -> 201 (106ms) {"tip":"aktif","siraNo":1}
+905557770002 -> 201 (127ms) {"tip":"yedek","siraNo":1}
+905557770003 -> 201 (147ms) {"tip":"yedek","siraNo":2}
+905557770004 -> 201 (160ms) {"tip":"yedek","siraNo":3}
+905557770005 -> 201 (182ms) {"tip":"yedek","siraNo":4}
+905557770006 -> 409 (226ms) {"hata":"kapasite dolu"}
+905557770007 -> 201 (205ms) {"tip":"yedek","siraNo":5}
+905557770008 -> 409 (217ms) {"hata":"kapasite dolu"}
```

Sayım: aktif=1, yedek=5, dolu=2. Yedek sıra numaraları: [1,2,3,4,5], hepsi benzersiz.

Not: 0006 reddedilip daha geç biten 0007'nin yedek#5 alması beklenen davranış — kilit alma sırası, isteğin gönderilme sırası değildir. Değişmez olan şey kapasitenin tam 6 olmasıdır (stok 1 + yedek 5).

Diğer doğrulanan senaryolar:
- **A — Tek istek:** aktif #1 ✓
- **B — Aynı telefon, 2 paralel ilk-temas:** 1×201 + 1×409 "zaten var" (aynı rezerv kodu geri döndü) ✓
- **D — Kapasite doluyken 9. istek:** 409 ✓
- **E — Mevcut rezervasyonlu numara tekrar dener:** 409 + mevcut kodu geri döndü ✓ (partial unique index ile çakışma yok — kilit altındaki ön-kontrol dostça cevap veriyor, index hiç tetiklenmeden son savunma hattı olarak duruyor)

## Bağımsız doğrulama (`psql`, API cevabına güvenilmedi)

```
tip   | adet | sira_nolar     toplam=6, benzersiz_kod=6, benzersiz_alici=6
aktif |  1   | {1}            urun durum = doldu
yedek |  5   | {1,2,3,4,5}
```

`pazarHaftasi` alanı İstanbul saat dilimine göre doğru sonraki Çarşamba'yı hesaplıyor. `DurumGecmisi` tablosuna 8 Rezervasyon + 1 Urun(doldu) audit kaydı düştü.

## Güvenilirlik kısıtlaması (PLAN §3)

`GUVENILIRLIK_ESIGI` (=3) veya daha fazla `gelmedi` biriktiren bir alıcı, **halihazırda (herhangi bir üründe) bir aktif rezervasyonu varsa** yeni rezervasyon alamaz (`guvenilirlik-kisitli`). Kontrol ürün kilidi altında, kapasite hesabından **önce** yapılır — kısıtlı alıcı kapasiteyi hiç işgal etmez, kuyruğa dokunmaz.

**Kapsam bilinçli olarak pazar/mağaza sınırı taşımıyor:** `gelmediSayisi` ve `aktifRezervasyonVarMi` sorguları yalnızca `aliciId`'ye göre filtrelenir, `urunId`/pazar hiç girmez. Yani A pazarındaki bir mağazada biriken `gelmedi` geçmişi, B pazarındaki alakasız bir mağazada da alıcıyı kısıtlar — güvenilirlik, tüm platform genelinde tek bir kişiye bağlı bir özellik, pazara özel değil.

**Rozet ile motor kapısı arasındaki fark (bilinçli, kod değişikliği gerektirmeyen ayrım):** Satıcı panelindeki "Kısıtlı" rozeti yalnızca `gelmedi>=3`'e bakar (`aliciGuvenilirlikHaritasi`). Motorun asıl kapısı bunun ÜSTÜNE "şu an aktif bir rezervasyonu var mı" şartını da arar. Sonuç: rozette "Kısıtlı" görünen bir alıcının elinde aktif/yedek hiçbir şey yoksa yeni rezervasyon yapması **engellenmez** — rozet geçmişe dönük bir güvenilirlik uyarısı, motor kapısı ise "aynı anda kaç taahhüt tutabilir" kuralı; farklı amaçlar, aynı eşiği (3) paylaşmaları tesadüfi.

**Test kanıtı — 8-paralel testin güvenilirlik varyasyonu:** Stok=1 ürüne, 8 gerçek giriş yapmış farklı alıcıdan biri (alici_3) önceden 3×`gelmedi` + 1×`bekliyor/aktif` (başka bir ürün) geçmişiyle kurulup, aynı anda `Promise.all` ile 8 paralel istek ateşlendi:

```
alici_1 -> 201 {"tip":"aktif","siraNo":1}
alici_2 -> 201 {"tip":"yedek","siraNo":4}
alici_3 -> 409 {"hata":"Şu an aktif bir rezervasyonunuz var..."}   <- kısıtlı alıcı
alici_4 -> 201 {"tip":"yedek","siraNo":1}
alici_5 -> 201 {"tip":"yedek","siraNo":3}
alici_6 -> 409 {"hata":"kapasite dolu"}
alici_7 -> 201 {"tip":"yedek","siraNo":2}
alici_8 -> 201 {"tip":"yedek","siraNo":5}
```

Beklenen dağılım tam çıktı: kısıtlı alıcı çıkınca geriye kalan 7 kişi kapasite 6'yı (1 aktif + 5 yedek) paylaştı, 1'i "dolu" aldı.

**Bağımsız doğrulama (`psql`):** test ürününde toplam 6 kayıt (1 aktif + 5 yedek, `siraNo` boşluksuz `{1}`/`{1,2,3,4,5}`), 6 benzersiz kod + 6 benzersiz alıcı; kısıtlı alıcının bu üründe **0** kaydı var; ürün `doldu`; kısıtlı alıcının geçmişi (3 gelmedi + 1 bekliyor) test sırasında değişmedi (yan etki yok).

**Test kanıtı — pazarlar-arası kapsam (SP-4 çok-pazarlı mağaza açılışı sonrası):** Bir alıcı, **Seferihisar** pazarındaki bir mağazada 3×`gelmedi` + 1×aktif `bekliyor` geçmişi biriktirdi. Aynı alıcı, tamamen alakasız **Yeşilyurt** pazarındaki farklı bir mağazanın ürününde yeni rezervasyon denedi → `409 guvenilirlik-kisitli` (gerçek giriş + HTTP isteğiyle doğrulandı). `psql`: o üründe bu alıcı adına **0** kayıt açıldı. Kısıtlamanın pazar/mağaza sınırı taşımadığı iddiası canlı olarak kanıtlandı.

**Test kanıtı — rozet/motor kapı farkı:** Aynı alıcı, tek engel olan aktif rezervasyonunu vazgeçti (gelmedi sayısı hâlâ 3, değişmedi). Hemen ardından aynı alıcı yeni bir rezervasyon denedi → **201 başarılı** (motor izin verdi), oysa satıcı panelindeki rozet (`kisitliMi = gelmedi >= 3`, bkz. `panel/rezervasyonlar/page.tsx`) bu alıcıyı hâlâ "Kısıtlı" gösterecektir. Rozet geçmişe dönük uyarı, motor kapısı ayrı bir "şu an kaç taahhüt tutuyor" kuralı — ayrım koddan değil canlı davranıştan doğrulandı.

**Test kanıtı — admin gizli mağazaya ürün ekleme (bilinçli tutarsızlık, bug değil):** Admin bir mağazayı gizledi (`gizliMi=true`), sonra AYNI mağazaya ürün ekledi → **201 başarılı** (`urunEkle()` `gizliMi`'ye hiç bakmıyor). Farklı bir alıcı bu yeni ürünü rezerve etmeyi denedi → **409 magaza-gizli** (motorun kendi ön-kontrolü devrede, `rezervasyonOlustur`'daki `magaza.gizliMi` kontrolü). `psql`: ürün gerçekten oluşmuş (0 rezervasyon). Sonuç: tutarsız ama zararsız — ürün DB'de var olur ama hiçbir zaman rezerve edilemez; admin arayüzünde bunu engelleyen/uyaran bir kontrol yok, ileride eklenebilir.

**Test kanıtı — satıcı kendi ürününü rezerve edebiliyor (mevcut bilinen sınır, aşağıdaki "İleride ele alınacaklar" ile aynı):** Canlı olarak doğrulandı — satıcı kendi mağazasındaki bir ürünü kendi hesabıyla `201` ile rezerve edebildi. Davranış değiştirilmedi, sadece teyit edildi.

## Kritik bağımlılık uyarısı

Ürünü `doldu` durumuna çeviren tek yer bu akış. **Slot boşaltan her gelecek özellik** (Vazgeç, haftalık otomatik sıfırlama, admin müdahalesi) `doldu → sergide` geri dönüşünü yapmayı unutmamalı — unutulursa ürün fiilen boşalmış olsa bile "Rezerve Et" butonu kapalı kalır.

> **Durum:** Vazgeç akışı bu yükümlülüğü yerine getiriyor (aşağıdaki bölüm). Haftalık sıfırlama ve admin müdahalesi yazılırken aynı kural geçerli.

## Vazgeç akışı (`rezervasyonVazgec`)

Aynı kilit stratejisini kullanır: ürün satırında `FOR UPDATE` → oluşturma ve vazgeçme aynı ürünün kuyruğunu asla eşzamanlı değiştiremez. Kilit alındıktan sonra rezervasyon **taze** okunur (eşzamanlı bir vazgeç onu çoktan iptal etmiş ya da bir yükselme tip/sıra bilgisini değiştirmiş olabilir).

**Kimlik doğrulama (KP-1):** giriş yapmış kullanıcının **kendi** rezervasyonu olmalı — `rezervId` istemciden gelir ama `aliciId === session.user.id` kontrol edilir; eşleşmezse "bulunamadı" (başkasının rezervasyonunun varlığı sızdırılmaz). (KP-1 öncesi: rezerv kodu + telefon eşleşmesi.)

**Numaralandırma kuralları** (oluşturma tarafındaki "sayım+1" atamasıyla uyum için boşluk bırakılmaz):
- Aktif iptal + yedek varsa → yedek#1 aktif olur ve **iptal edilenin sıra numarasını devralır**; kalan yedekler 1 azalır.
- Aktif iptal + yedek yoksa → iptal edilenin üstündeki aktifler 1 azalır.
- Yedek iptal → üstündeki yedekler 1 azalır.

İptal her zaman tam bir slot boşaltır → ürün `doldu` idiyse `sergide`'ye döner. Olaylar: `rezervasyon_iptal`, `rezervasyon_yedekten_aktife`, `urun_tekrar_sergide` (hepsi aynı transaction'da `DurumGecmisi`'ne).

**Test kanıtı:** Dolu üründe (1 aktif + 5 yedek) paralel [aktif vazgeçer + yeni telefon rezerve dener] yarışı 3 iterasyonda koşuldu; her iki geçerli sıralama da gözlendi (yeni istek ya reddedildi ya boşalan yedek#5'i aldı), hiçbir iterasyonda kapasite aşımı, çift aktif ya da çift (tip, sıraNo) oluşmadı — psql ile bağımsız doğrulandı. Yükselen her seferinde doğru kişiydi (eski yedek#1).

## Satıcı tarafı: Satıldı / Gelmedi (`rezervasyonSonuclandir`)

Satıcı, **kendi** mağazasının bir ürününün **aktif** hak sahibini sonuçlandırır. Aynı kilit (ürün satırında `FOR UPDATE`) → Vazgeç / yeni rezervasyon ile eşzamanlı çalışsa bile kuyruk tutarlı. Yetki: `rezervId` istemciden gelir ama fonksiyon `magaza.sahipId === saticiUserId` kontrolü yapar — başka satıcının `rezervId`'sini ele geçirse bile 403. Sadece `bekliyor` + `aktif` işaretlenebilir (yedek sırada bekliyor, sonuçlandırılamaz).

**"Gelmedi"** — alıcı gelmedi, hak düşer. Birim **hâlâ satılık** → Vazgeç'in aktif dalıyla birebir aynı: `aktifSlotBosalt` yedek#1'i yükseltir, ürün `doldu` idiyse `sergide`'ye döner. Güvenilirlik için (PLAN §3) `rezervasyon_gelmedi` olayı **aliciId ile** loglanır → ileride "kim kaç kez gelmedi" sayılabilir.

**"Satıldı"** — alıcı ürünü aldı, **birim tüketilir** (stok-tutarlı model, kullanıcı kararı). Vazgeç/Gelmedi'den farkı: yedek **yükselmez** (satılan birim gitti), sadece üstteki aktifler kayar. Bunun sonucu, `rezervasyonOlustur`'un kapasite hesabı da artık **`stokAdedi` değil `kalanBirim = stokAdedi − satildiSayisi`** üzerinden (satildi=0 iken ikisi eşit → geriye uyumlu). Toplam satıldı `stokAdedi`'ye ulaşınca ürün `satildi` olur ve kalan tüm bekleyenler `iptal` edilir (`rezervasyon_urun_tukendi`).

> **Neden stok-tutarlı:** PLAN §3 stok>1'i (reçel: çok kavanoz) birinci sınıf senaryo sayıyor. "İlk satış ürünü kapatır" modeli, stok=3'te ilk satışta diğer 2 aktif hak sahibinin hakkını yakardı. Bu modelde her satış tam 1 birim tüketir, diğer aktifler bekler.

**Değişmez (INVARIANT):** her üründe `aktif_sayisi ≤ stokAdedi − satildiSayisi`. Bu, fazla-satışın matematiksel imkânsızlığıdır ve psql ile her test ürününde doğrulandı.

**Test kanıtı (7 ürün + 2 satıcı):**
- Satıldı-tüketir (stok=1): aktif satıldı → ürün `satildi`, 5 yedek `iptal` (tükendi). ✓
- Gelmedi-yükseltir (stok=1): yedek#1 aktife yükseldi, ürün `doldu→sergide`. ✓
- Stok-tutarlı (stok=3): aktif#1 satıldı → 2 aktif + 5 yedek (yedek YÜKSELMEDİ), ürün `doldu` kaldı, yeni istek "dolu". ✓
- Yetki: satıcı B, A'nın rezervasyonunu → **403**. ✓
- **Yarış [aktif Gelmedi ‖ yeni rezervasyon] ×3:** üçünde de tutarlı — yeni istek ya reddedildi (kilidi önce aldı, kuyruk doluydu) ya da (ardışık kontrolde) gelmedi'nin boşalttığı yedek#5'i aldı. Hiçbir iterasyonda kapasite aşımı / çift aktif / çift (tip, sıraNo) yok.
- **Yarış [aktif Gelmedi ‖ yedek#3 vazgeç]:** iki işlem commutative çıktı (aynı sonuç), kuyruk boşluksuz kaldı.

## Geri Alma (`rezervasyonGeriAl`) — satıcı yanlış işaretlemeyi geri alır

Bir `satildi`/`gelmedi` kaydını tekrar `bekliyor` yapıp kişiyi **eski sıra numarasına** geri koyar. Aynı kilit (ürün satırında `FOR UPDATE`) — geri alma da kuyruğu değiştirdiği için oluştur/vazgeç/sonuçlandır ile serileşir. Yetki: yalnızca `magaza.sahipId === saticiUserId`.

**Önemli sadeleştirme:** Satıldı/Gelmedi yalnızca **aktif** hak sahibine uygulanır ve sonuçlandırma kaydın `tip`/`siraNo`'suna dokunmaz (yalnızca `durum`'u değiştirir). Bu yüzden geri alınan kaydın eski tipi her zaman `aktif`, eski `siraNo`'su kendi alanında — `DurumGecmisi` okumaya gerek yok.

**Uygulama:** (1) aktif kuyrukta `eskiSira` ve sonrası için yer aç (`siraNo +1`), (2) kaydı `bekliyor` + `aktif` + `eskiSira` yap, (3) aktif taşarsa (yalnızca gelmedi geri almada olur; satıldıda `kalanBirim` de +1 arttığı için taşmaz) en yüksek aktif yedek kuyruğunun **başına** iner (eski önceliğini korur), (4) ürün durumu kapasiteye göre `doldu`/`sergide` güncellenir.

**İki red durumu** (kullanıcı kararı; süre sınırı yok — pazar-haftası kuralı haftalık sıfırlama adımına ertelendi):
- **`urun_satildi`** — ürün tükenmişse (`durum='satildi'`) hiçbir geri alma yapılmaz. Geri gelen kişiye verecek satılık birim yoktur.
- **`kapasite_dolu`** — geri alma bekleyeni +1 yapar; `yeniKalanBirim + 5`'i (satıldı geri almada `kalanBirim` da +1 artar) aşıyorsa reddedilir.

Her red `DurumGecmisi`'ne **`geri_alma_reddedildi:{rezervId}:{sebep}`** olarak yazılır (admin paneli henüz yok; kayıt "güvenle geri alınamadı, admin'e iletildi" izini bırakır). Başarı: `rezervasyon_geri_alindi:{eskiDurum}:{eskiSira}`, düşen yedek varsa `rezervasyon_aktiften_yedege`.

**Asimetri:** Satıldı geri alma neredeyse hep güvenli (birim geri döner, `kalanBirim +1`, kişi kendi açtığı slota oturur, aktif taşmaz). Gelmedi geri alma riskli (birim başkasına gitmiş olabilir; `kalanBirim` sabit, bekleyen +1 → kapasite baskısı, taşma/red mümkün).

**Test kanıtı (9 ürün, eşzamanlılık dahil):**
- Gelmedi geri al (stok=1): geri alınan aktif#1'e döndü, yükselmiş yedek yedek#1'e indi, kuyruk boşluksuz, ürün `doldu`. ✓
- Satıldı geri al (stok=3): aktif#1'e döndü, `satildi 1→0`, 3 aktif + 5 yedek, taşma yok. ✓
- Red `urun_satildi`: tükenmiş üründe → 409 + audit. ✓
- Red `kapasite_dolu`: dolu kuyrukta → 409 + audit; **kuyruk hiç değişmedi**. ✓
- İptal kaydı geri alınamaz → 409 (yalnızca satıldı/gelmedi). ✓
- **Yarış [geri al ‖ yeni rezervasyon] ×3:** her iterasyonda tam biri kabul biri red — bekleyen **her zaman 6** (kapasite), asla aşılmadı; iki sıralama da gözlendi. psql ile bağımsız doğrulandı (çift pozisyon yok, INVARIANT 9/9 OK). ✓
- **Yarış [geri al ‖ yedek vazgeç]:** commutative, kuyruk boşluksuz. ✓

## Haftalık Sıfırlama → ayrı dosya

Otomatik haftalık sıfırlama (kapanışta kuyruk temizleme, no-show cezası, cron, idempotency, bildirim izi) kendi dosyasında: [`haftalik-sifirlama.md`](./haftalik-sifirlama.md). Aynı `FOR UPDATE` kilidini kullanır ama davranışı ayrıdır — Gelmedi/Vazgeç **yükseltir**, sıfırlama **temizler**.

**Bu dosyayla köprü:** Sıfırlamanın no-show cezası `Rezervasyon.aktifOlmaZamani` alanına dayanır; bu alan **buradaki** akışlarda set edilir — oluşturmada aktif atanınca, `aktifSlotBosalt` yükseltince, `rezervasyonGeriAl` geri koyunca. Bu üç noktadan biri değişirse sıfırlama ceza eşiği bozulur.

## Üyelik zorunluluğu (KP-1)

**Karar:** Rezervasyon (ve Vazgeç) için **giriş zorunlu**. Vitrin/ürün keşfi girişsiz açık kalır (kutsal kural — keşif serbest); yalnızca "Rezerve Et" eylemi kimlik ister. Girişsiz kullanıcı `?next=<ürün>` ile login'e yönlenir, işlem sonrası aynı ürüne döner (redirect-back; ürün kartı `?rezerveEt=<id>` ile modalı otomatik açar).

**Gerekçe:** KP-1 öncesi rezervasyon yalnız telefon+ad ile yapılıyordu; kimse doğrulanmadığı için **rastgele numaralarla sahte rezervasyon** üretilip kuyruk şişirilebilirdi (MIMARI.md'deki bilinen kısıt). Üyelik her rezervasyonu bir hesaba bağlar ve telefonla kod-arama (enumerasyon/ifşa) yüzeyini kapatır.

**Kimlik:** `aliciId = session.user.id`. Rezervasyon formunda **ad/telefon alanı yok**. Telefon `Kullanici.telefon`'da tutulur; boşsa ilk rezervasyonda bir kerelik istenir (`telefonNormallestir` ile normalize), doluysa hiç sorulmaz. `Kullanici.telefon` **@unique** (init'ten beri; nullable → çok NULL serbest ama aynı numara iki hesaba bağlanamaz) — çakışmada API 409 döner. **Ek migration gerekmedi** (kısıt zaten mevcuttu).

**Motor etkilenmedi:** `rezervasyonOlustur` artık `{ urunId, aliciId }` alır (eskiden `{ urunId, ad, telefon }`); kimlik çözümleme motordan API katmanına taşındı. Kilit + sayım + tip/sıra ataması + `doldu` geçişi + P2002-retry **birebir aynı**. 8-paralel eşzamanlılık testi KP-1 sonrası yeniden koşuldu (8 farklı giriş yapmış kullanıcı, stok=1 → 1 aktif + 5 yedek + 2 dolu; INVARIANT korundu).

**Kaldırılanlar:** `/api/rezervasyon/sorgula` (kod+telefon arama) ve `rezervasyonSorgula`. `/rezervasyonum` artık girişli kullanıcının kendi rezervasyon listesidir (Kullanıcı Paneli ilk ekranı); rezerv kodu hâlâ görünür (satıcıyla WhatsApp referansı) ama arama girdisi değil.

## Diğer tasarım kararları

- **Ad güncellenmiyor (KP-1 ile konusuz):** KP-1 öncesi rezervasyon adı formdan gelirdi; artık ad hesaptan (kayıt) gelir, rezervasyon formunda ad alanı yoktur. Eski kural (bilinen telefonla farklı ad → mevcut ad korunur) artık uygulanmaz.
- **Telefon normalizasyonu TR'ye özel:** `0555...`, `+90 555...`, `5551112233` hepsi `+90...`'a normalize edilir (aynı kişi iki kez kullanıcı olmasın diye). Yabancı numara ancak `+` ile girilirse kabul edilir. Başında 0 olmayan sabit hatlar reddedilir.
- **Vitrin davranışı:** `doldu` ürünler artık listeden gizlenmiyor, sayfada "Sıra kapandı" ile disabled buton olarak görünüyor (önceden filtre onları gizliyordu).

## İleride ele alınacaklar

- `Rezervasyon(urunId, durum)` için indeks yok — küçük ölçekte önemsiz, büyüdükçe eklenmeli.
- Satıcının kendi ürününe rezervasyon yapması engellenmiyor, kural tanımsız.
- Stok sonradan düşürülürse mevcut aktif rezervasyon sayısı yeni stoktan büyük kalabilir — ürün düzenleme akışı yazılırken ele alınacak.
- **Satıldı/Gelmedi geri alınamaz** — yanlış işaretleme onaydan sonra düzeltilemez (admin müdahalesi gerekir). Şimdilik tek koruma inline onay.
- Rate-limit yok (SMS fazına kadar bilinçli risk — bkz. genel `MIMARI.md`). KP-1 (üyelik zorunluluğu) sahte-numarayla kitle rezervasyonu riskini büyük ölçüde azalttı (rezervasyon için hesap gerekir); yine de hesap başına / IP bazlı rate-limit ileride değerlendirilmeli.
