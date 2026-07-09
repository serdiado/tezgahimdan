# Haftalık Sıfırlama — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#haftalık-sıfırlama-otomatik). Rezervasyon kuyruk mantığı ve kilit stratejisi için: [`rezervasyon-motoru.md`](./rezervasyon-motoru.md) (bu akış onunla **aynı** `FOR UPDATE` kilidini kullanır).

`pazarlariSifirla` (`src/lib/rezervasyon.ts`) — otomatik, harici cron tetikler. Pazarın **gün sonu** (aşağıya bkz.) geçince o pazara ait ürünlerin bekleyen kuyruğu **tamamen temizlenir** (sıra taşıma yok; ürün sonraki hafta sıfırdan). Bu, manuel Gelmedi'nin toplu hali **değildir** — o yükseltir, bu temizler.

## 2026-07-09 güncellemesi: sweep artık kapanış anında DEĞİL, admin'in ayarladığı "işlem sonu" anında tetiklenir

İlk karar: satıcı, pazar kapanışında hemen cezalandırılmak yerine o günün sonuna (gece yarısı) kadar "Sattım/Gelmedi" işaretlemesi için süre almalı. **Aynı gün içinde ikinci bir düzeltme geldi:** sabit "gece yarısı" varsayımı **gece pazarları** (kapanışı 01:00-02:00 gibi geç saatlere uzanan pazarlar) için yanlış olabilir — kullanıcı kararı: işlem-sonu ve hatırlatma anlarının **her ikisi de admin tarafından pazar bazında manuel ayarlanabilmeli**, sabit bir varsayıma zorlanmamalı.

Sonuç: `Pazar` modeline **dört yeni opsiyonel alan** eklendi (migration `20260709144934_pazar_icerik_ve_zamanlama_alanlari`): `islemSonGunu`+`islemSonSaati`, `hatirlatmaGunu`+`hatirlatmaSaati`. Admin bunları pazar formunda boş bırakırsa (`PazarForm.tsx`), kod eski sabit varsayımlara düşer (işlem-sonu → kapanış gününün gece yarısı, hatırlatma → kapanıştan 1 saat sonra) — **regresyon yok**, mevcut pazarlar (ör. Seferihisar) davranış değiştirmez. Admin manuel ayarlarsa, `pazar-olustur`/`pazar-guncelle` route'ları (`opsiyonelGunSaatDogrula`, `hedefOnceMi` — `pazar-dogrulama.ts`) şunu zorunlu kılar: (1) hem gün hem saat birlikte girilmeli, (2) ikisi de kapanıştan SONRAYA denk gelmeli, (3) hatırlatma, işlem-sonundan ÖNCE olmalı (aksi halde hatırlatma anlamsızlaşır — bkz. aşağıdaki "bulunan iki gerçek hata").

No-show belirleme kuralının kendisi (aşağıdaki `aktifOlmaZamani < pazarBaslangicAni` karşılaştırması) **hiç değişmedi** — sadece sweep'in NE ZAMAN çalıştığı (artık `pazarIslemSonAni`) ve hatırlatmanın NE ZAMAN gittiği (artık `pazarHatirlatmaAni`) değişti/yapılandırılabilir hale geldi.

**Bilinçli olarak ERTELENEN karar:** "Gelmedi" cezasının tam mekanizması (satıcı hâlâ işaretlemezse ne olur, satılmış-ama-işlenmemiş ürünler nasıl değerlendirilir) henüz netleşmedi — şu an davranış eskisiyle aynı (işlem-sonu anında otomatik `gelmedi`), sadece zamanlama artık yapılandırılabilir. Bu konu ayrıca ele alınacak.

**Bulunan iki gerçek hata (canlı testle):** (1) İlk tasarımda hatırlatma kapanıştan ÖNCE (2 saat erken) gönderiliyordu — kullanıcı "satıcı pazar bitmeden karar veremez" diye düzeltti. (2) Düzeltme sırasında, mevcut (değiştirilmeyen) otomatik ceza kapanış ANINDA çalıştığı için, kapanıştan SONRA gelen bir hatırlatmanın her zaman cezadan SONRA varacağı fark edildi — hatırlatma işlevsiz kalıyordu. Çözüm: cezanın kendisi de (varsayılan olarak) gün sonuna ertelendi, ikisi de artık bağımsız yapılandırılabilir.

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

## Kimlere ne olur (kapanışta, hâlâ `bekliyor` olanlar)
- **Başlangıçta aktif + satılmamış** → `gelmedi` + no-show cezası. Audit: **`rezervasyon_gelmedi:otomatik:{pazarHaftasi}`** (aliciId ile).
- **Sonradan yükselen aktif + tüm yedekler** → `iptal` (cezasız). Audit: `rezervasyon_sifirlama_iptal:{hafta}` (ceza değil, sadece iz).
- **`satildi`/`gelmedi`/`iptal`** (zaten sonuçlanmış) → **dokunulmaz** (sorgu yalnızca `durum='bekliyor'`). Manuel gelmedi → **çift ceza olmaz**.
- Temizlenen **herkese** (satın almış hariç) bildirim izi: `bildirimKanali='whatsapp'`, `bildirimGonderildi=false`. **Gönderim yok** (Faz 2: "ürün tekrar açıldı, öncelikli davet").
- Kuyruk boşalınca ürün `satildi` değilse → `sergide`.

## Tetikleme + idempotency
- **Harici cron** (Docker/VPS, ~5 dk) → `POST /api/cron/pazar-sifirlama`, `Authorization: Bearer $CRON_SECRET`.
- **Zamana değil duruma bakar:** gün sonu geçmiş VE hâlâ bekleyen kuyruğu olan ürünleri işler → **restart'ta kaçmaz** (catch-up).
- **İki katman idempotency:** (1) her ürün ayrı transaction + `FOR UPDATE` + "hâlâ bekliyor mu" — çift tetikleme no-op; (2) `PazarSifirlama` tablosu `(pazarId, pazarHaftasi)` unique, atomik `ON CONFLICT` upsert — açık "bu hafta yapıldı mı" takibi + audit (`etkilenenSayi`).

## Kapanış hatırlatması (`pazarHatirlatmalariGonder`)

Aynı cron route'u içinde, sweep'ten ÖNCE çağrılır (ama zaman pencereleri zaten ayrışık: hatırlatma `[kapanış+1saat, ...)`, sweep `[gün sonu, ...)` — aynı anda ikisi birden bir pazar için tetiklenmez). Amaç: satıcıya "işaretlemeyi unutma" uyarısı, hiçbir rezervasyon durumunu DEĞİŞTİRMEZ.

**Dikkat edilmesi gereken bir tuzak (canlı test sırasında bulundu):** `pazarHaftasi`, `sonrakiSifirlamaTarihi(pazar, now)` ile hesaplanamaz — bu fonksiyon "bundan sonraki İLK kapanış" verir, ama hatırlatma TAM OLARAK kapanıştan sonra çalıştığı için `now` zaten o haftanın kapanışını geçmiş olur ve fonksiyon otomatik bir SONRAKİ haftaya yuvarlar. Doğru hafta, bu yuvarlanmış tarihten **7 gün geri** gidilerek bulunur (`sonrakiSifirlamaTarihi(...) - 7 gün`) — döngüler her zaman tam 7 gün ara olduğu için bu her koşulda (kapanıştan önce ya da sonra çağrılsa da) doğru sonucu verir.

İdempotency: `PazarHatirlatma` tablosu, `PazarSifirlama` ile AYNI desen (`(pazarId, pazarHaftasi)` unique) ama `ON CONFLICT DO NOTHING` — biriktirme yok, sadece tek seferlik "gönderildi mi" bayrağı.

## Puan / güvenilirlik sistemine bağlantı (henüz kurulmadı)
Sıfırlama yalnızca **no-show'u işaretler** — puan kurallarını (eşik, ağırlık) tanımlamaz; o, sonraki **puan-sistemi adımının** işi. İşaretleri o adımın kolayca sayabilmesi için format bilinçli seçildi:

- **Gelmedi (no-show) olayları** — `DurumGecmisi.olay` alanında, `kullaniciId = aliciId` ile:
  - `rezervasyon_gelmedi:otomatik:{pazarHaftasi}` → sıfırlamanın yazdığı otomatik no-show.
  - `rezervasyon_gelmedi:aktif:{siraNo}` → satıcının manuel işaretlediği Gelmedi (bkz. `rezervasyon-motoru.md`).
  - İkisi de `rezervasyon_gelmedi:%` prefix'iyle **tek havuzda** sayılabilir; istenirse `:otomatik:` / `:aktif:` ile ayrıştırılabilir.
- **Ceza SAYILMAYACAK olaylar** (güvenilirlik havuzuna girmemeli):
  - `rezervasyon_sifirlama_iptal:{hafta}` → sıfırlamada cezasız temizlenen (sonradan yükselen aktif + yedekler). Kişi "gelme sözü" vermemişti.
  - `rezervasyon_iptal:...` → alıcının kendi vazgeçmesi (dürüst çekilme). "Geç iptal hafif kusurdur" gibi bir kural istenirse, o **puan sisteminin** kararı — sıfırlama bunu ceza saymaz.
- **"Aldı" tarafı** (güvenilirlik oranının paydası) — `satildi` durumundaki rezervasyonlar / `rezervasyon_satildi:%` olayları.

Özetle: bu adım **veri bırakır**, puan **kuralı koymaz**. Kurallar puan-sistemi adımında `DurumGecmisi` üzerinden sayımla gelir (PLAN §3 & §6: "veri kayıtlı kaldığı sürece istatistik sonradan çıkar").

## İtiraz
Her otomatik ceza `DurumGecmisi`'nde admin-okunabilir (`rezervasyon_gelmedi:otomatik:%`). İtirazı çözme eylemi (admin geri alma) bu adımda kodlanmadı — admin paneli adımına bırakıldı.

## Test kanıtı (7 rezervasyon, izole test pazarı, psql doğrulandı)
- (a) başlangıçta aktif+satılmamış → `gelmedi`+ceza ✓
- (b) başlangıçtan sonra yükselen → cezasız `iptal` ✓
- (c) `satildi` → dokunulmadı ✓
- yedekler → cezasız `iptal` + bildirim izi ✓
- (d) idempotency: ikinci tetikleme `{islenenUrun:0}`, `etkilenenSayi` sabit, çift ceza yok ✓
- (e) farklı hafta (gelecek `pazarHaftasi`) + farklı pazar (kapanışı gelmemiş) → dokunulmadı ✓
- TZ: başlangıç eşiği 06:00Z (=Istanbul 09:00) doğru; 05:00Z cezalı / 12:00Z cezasız net ayrıştı ✓

## Test kanıtı — çok-pazarlı izolasyon

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
- **Rezervasyon**: `aktifOlmaZamani`, `bildirimGonderildi`, `bildirimKanali`.
- **PazarSifirlama**: `(pazarId, pazarHaftasi)` unique, `calismaZamani`, `etkilenenSayi` — sweep idempotency.
- **PazarHatirlatma**: `(pazarId, pazarHaftasi)` unique, `gonderilmeZamani` — hatırlatma idempotency (ayrı tablo, sweep ile karışmasın).

## İleride
- **Ertelenen karar (bkz. yukarıdaki 2026-07-09 notu):** Satıcı işlem-sonuna kadar hâlâ işaretlemezse tam olarak ne olacağı (mevcut davranış: otomatik `gelmedi`) ve satılmış-ama-satıcının-işlem-yapmadığı ürünlerin nasıl ele alınacağı henüz netleşmedi.
- Bildirim gönderimi (whatsapp) Faz 2 — şu an yalnızca in-app bildirim (`Bildirim` tablosu) var.
- Admin itiraz/geri alma akışı admin paneli adımında.
