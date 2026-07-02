# Rezervasyon Motoru — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#rezervasyon-kilidi-ve-kuyruk-mantığı)

## Karar: Pesimistik satır kilidi (`SELECT ... FOR UPDATE`)

Rezervasyon oluşturma, `prisma.$transaction` içinde önce ürün satırını `SELECT ... FOR UPDATE` ile kilitler. Sayım (kaç aktif/yedek var), karar (aktif/yedek/dolu) ve insert hep bu kilit altında yapılır. Aynı ürüne gelen tüm istekler kilitte sıraya girer; kapasite aşımı ya da çift sıra numarası fiziksel olarak imkânsız. Farklı ürünler birbirini hiç engellemez, kilit satır bazlı.

## Neden optimistic (unique constraint + retry) değil

- Retry döngüsü karmaşıklığı gerektirmiyor.
- "Dolu mu" kararı için zaten güvenilir bir sayım şart — optimistic yaklaşımda bile bu sayım gerekir, yani karmaşıklığı azaltmıyor, sadece taşıyor.
- Ölçek argümanı: yerel pazar uygulamasında bir ürüne aynı saniyede düşen istek sayısı en fazla bir avuç. Milisaniyelik kritik bölge için kilit maliyeti önemsiz.
- READ COMMITTED izolasyon seviyesi yeterli, çünkü kilit zaten serileştirme görevini görüyor.

## Kullanıcı bul-veya-oluştur neden transaction dışında

Postgres'te transaction içindeki herhangi bir hata (unique constraint ihlali dahil) tüm transaction'ı iptal eder — "yakala, tekrar dene" deseni transaction içinde çalışmaz. Bu ayrıca kilit alma sırasını sabitler (önce kullanıcı satırı, sonra ürün satırı), döngüsel bekleme (deadlock) riskini yapısal olarak ortadan kaldırır.

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

## Kritik bağımlılık uyarısı

Ürünü `doldu` durumuna çeviren tek yer bu akış. **Slot boşaltan her gelecek özellik** (Vazgeç, haftalık otomatik sıfırlama, admin müdahalesi) `doldu → sergide` geri dönüşünü yapmayı unutmamalı — unutulursa ürün fiilen boşalmış olsa bile "Rezerve Et" butonu kapalı kalır.

> **Durum:** Vazgeç akışı bu yükümlülüğü yerine getiriyor (aşağıdaki bölüm). Haftalık sıfırlama ve admin müdahalesi yazılırken aynı kural geçerli.

## Vazgeç akışı (`rezervasyonVazgec`)

Aynı kilit stratejisini kullanır: ürün satırında `FOR UPDATE` → oluşturma ve vazgeçme aynı ürünün kuyruğunu asla eşzamanlı değiştiremez. Kilit alındıktan sonra rezervasyon **taze** okunur (eşzamanlı bir vazgeç onu çoktan iptal etmiş ya da bir yükselme tip/sıra bilgisini değiştirmiş olabilir).

**Kimlik doğrulama (üyelik öncesi):** rezerv kodu + telefon ikisi birden eşleşmeli; hangisinin yanlış olduğu söylenmez (tarama/enumerasyon zorlaştırma).

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

## Diğer tasarım kararları

- **Ad güncellenmiyor:** Bilinen bir telefonla farklı adla rezervasyon yapılırsa mevcut kaydın adı korunur — doğrulama olmadan başkasının kaydını yeniden adlandırmaya izin vermemek için.
- **Telefon normalizasyonu TR'ye özel:** `0555...`, `+90 555...`, `5551112233` hepsi `+90...`'a normalize edilir (aynı kişi iki kez kullanıcı olmasın diye). Yabancı numara ancak `+` ile girilirse kabul edilir. Başında 0 olmayan sabit hatlar reddedilir.
- **Vitrin davranışı:** `doldu` ürünler artık listeden gizlenmiyor, sayfada "Sıra kapandı" ile disabled buton olarak görünüyor (önceden filtre onları gizliyordu).

## İleride ele alınacaklar

- `Rezervasyon(urunId, durum)` için indeks yok — küçük ölçekte önemsiz, büyüdükçe eklenmeli.
- Satıcının kendi ürününe rezervasyon yapması engellenmiyor, kural tanımsız.
- Stok sonradan düşürülürse mevcut aktif rezervasyon sayısı yeni stoktan büyük kalabilir — ürün düzenleme akışı yazılırken ele alınacak.
- **Satıldı/Gelmedi geri alınamaz** — yanlış işaretleme onaydan sonra düzeltilemez (admin müdahalesi gerekir). Şimdilik tek koruma inline onay.
- **Otomatik haftalık sıfırlama henüz yok** — PLAN §3'teki "satıcının işaretlemediği aktifler otomatik Gelmedi olur" kuralı, bu manuel Gelmedi'nin scheduler versiyonu olacak. Aynı motor/kilit kullanılmalı.
- Rate-limit yok (SMS fazına kadar bilinçli risk — bkz. genel `MIMARI.md`).
