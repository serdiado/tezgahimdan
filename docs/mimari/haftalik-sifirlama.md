# Haftalık Sıfırlama — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#haftalık-sıfırlama-otomatik). Rezervasyon kuyruk mantığı ve kilit stratejisi için: [`rezervasyon-motoru.md`](./rezervasyon-motoru.md) (bu akış onunla **aynı** `FOR UPDATE` kilidini kullanır).

`pazarlariSifirla` (`src/lib/rezervasyon.ts`) — otomatik, harici cron tetikler. Pazarın **gün sonu** (aşağıya bkz.) geçince o pazara ait ürünlerin bekleyen kuyruğu **tamamen temizlenir** (sıra taşıma yok; ürün sonraki hafta sıfırdan). Bu, manuel Gelmedi'nin toplu hali **değildir** — o yükseltir, bu temizler.

## 2026-07-09 güncellemesi: sweep artık kapanış anında DEĞİL, gün sonunda tetiklenir

Kullanıcı kararı: satıcı, pazar kapanışında hemen cezalandırılmak yerine o günün sonuna (gece yarısı) kadar "Sattım/Gelmedi" işaretlemesi için süre almalı. Bu yüzden **üç** farklı an var artık (aşağıdaki bölüm güncellendi), ve `urunSifirla`/`pazarlariSifirla`'nın tetikleyici koşulu `pazarKapanisAni` yerine **`pazarGunSonuAni`** kullanacak şekilde değiştirildi — no-show belirleme kuralının kendisi (aşağıdaki `aktifOlmaZamani < pazarBaslangicAni` karşılaştırması) **değişmedi**, sadece sweep'in NE ZAMAN çalıştığı değişti. Ayrıca kapanıştan 1 saat sonra satıcılara "işaretlemeyi unutma" hatırlatması eklendi (`pazarHatirlatmalariGonder`, aynı cron içinde, yeni `PazarHatirlatma` tablosu ile idempotent).

**Bilinçli olarak ERTELENEN karar:** "Gelmedi" cezasının tam mekanizması (satıcı hâlâ işaretlemezse ne olur, satılmış-ama-işlenmemiş ürünler nasıl değerlendirilir) henüz netleşmedi — şu an davranış eskisiyle aynı (gün sonunda otomatik `gelmedi`), sadece zamanlama kaydı. Bu konu ayrıca ele alınacak.

## Üç farklı zaman (kritik)
- **Başlangıç anı** (`Pazar.baslangicGunu`+`baslangicSaati`): ceza eşiği — "kim cezalı" belirler. Değişmedi.
- **Kapanış anı** (`Pazar.sifirlamaGunu`+`sifirlamaSaati`): pazarın gerçek/ilan edilen kapanış saati. Artık SADECE (1) `pazarRitimBilgisi`'nin "pazar açık mı" göstergesi ve (2) hatırlatma zamanlaması (`kapanış anı + 1 saat`) için kullanılıyor — sweep'i TETİKLEMİYOR.
- **Gün sonu anı** (`pazarGunSonuAni` — kapanış gününün yerel gece yarısı, yani ertesi günün 00:00'ı): sweep'in gerçekten ÇALIŞTIĞI an, kuyruğu temizler + cezaları yazar + bildirim izi bırakır.
- Üçü de `pazar-haftasi.ts`'te `pazarBaslangicAni` / `pazarKapanisAni` / `pazarGunSonuAni` ile hesaplanır (Europe/Istanbul; `timeZoneName:"shortOffset"` ile genel TZ, Türkiye sabit +3).

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

## Veri modeli (migration `20260703035648_haftalik_sifirlama`, `PazarHatirlatma` → `20260709140233_pazar_hatirlatma`)
- **Pazar**: `baslangicGunu` + `baslangicSaati` (ceza eşiği; mevcut `sifirlama*` = kapanış saati, gün sonu SAKLANMAZ - `pazarGunSonuAni` ile türetilir).
- **Rezervasyon**: `aktifOlmaZamani`, `bildirimGonderildi`, `bildirimKanali`.
- **PazarSifirlama**: `(pazarId, pazarHaftasi)` unique, `calismaZamani`, `etkilenenSayi` — sweep idempotency.
- **PazarHatirlatma**: `(pazarId, pazarHaftasi)` unique, `gonderilmeZamani` — hatırlatma idempotency (ayrı tablo, sweep ile karışmasın).

## İleride
- **Ertelenen karar (bkz. yukarıdaki 2026-07-09 notu):** Satıcı gün sonuna kadar hâlâ işaretlemezse tam olarak ne olacağı (mevcut davranış: otomatik `gelmedi`) ve satılmış-ama-satıcının-işlem-yapmadığı ürünlerin nasıl ele alınacağı henüz netleşmedi.
- Bildirim gönderimi (whatsapp) Faz 2 — şu an yalnızca in-app bildirim (`Bildirim` tablosu) var.
- Admin itiraz/geri alma akışı admin paneli adımında.
