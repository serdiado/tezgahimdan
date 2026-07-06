# Haftalık Sıfırlama — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#haftalık-sıfırlama-otomatik). Rezervasyon kuyruk mantığı ve kilit stratejisi için: [`rezervasyon-motoru.md`](./rezervasyon-motoru.md) (bu akış onunla **aynı** `FOR UPDATE` kilidini kullanır).

`pazarlariSifirla` (`src/lib/rezervasyon.ts`) — otomatik, harici cron tetikler. Pazarın kapanış anı geçince o pazara ait ürünlerin bekleyen kuyruğu **tamamen temizlenir** (sıra taşıma yok; ürün sonraki hafta sıfırdan). Bu, manuel Gelmedi'nin toplu hali **değildir** — o yükseltir, bu temizler.

## İki farklı zaman (kritik)
- **Başlangıç anı** (`Pazar.baslangicGunu`+`baslangicSaati`): ceza eşiği — "kim cezalı" belirler.
- **Kapanış/sıfırlama anı** (`Pazar.sifirlamaGunu`+`sifirlamaSaati`): kuyruğu temizler + cezaları yazar + bildirim izi bırakır.
- İkisi `pazar-haftasi.ts`'te `pazarBaslangicAni` / `pazarKapanisAni` ile hesaplanır (Europe/Istanbul; `timeZoneName:"shortOffset"` ile genel TZ, Türkiye sabit +3).

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
- **Harici cron** (Docker/VPS, ~5 dk) → `POST /api/cron/pazar-sifirlama`, `Authorization: Bearer $CRON_SECRET`. Deploy'da cron servisi eklenecek (dev'de manuel curl ile test edildi).
- **Zamana değil duruma bakar:** kapanış vakti geçmiş VE hâlâ bekleyen kuyruğu olan ürünleri işler → **restart'ta kaçmaz** (catch-up).
- **İki katman idempotency:** (1) her ürün ayrı transaction + `FOR UPDATE` + "hâlâ bekliyor mu" — çift tetikleme no-op; (2) `PazarSifirlama` tablosu `(pazarId, pazarHaftasi)` unique, atomik `ON CONFLICT` upsert — açık "bu hafta yapıldı mı" takibi + audit (`etkilenenSayi`).

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

## Veri modeli (migration `20260703035648_haftalik_sifirlama`)
- **Pazar**: `baslangicGunu` + `baslangicSaati` (ceza eşiği; mevcut `sifirlama*` = kapanış).
- **Rezervasyon**: `aktifOlmaZamani`, `bildirimGonderildi`, `bildirimKanali`.
- **PazarSifirlama**: `(pazarId, pazarHaftasi)` unique, `calismaZamani`, `etkilenenSayi`.

## İleride
- Deploy'da harici cron servisi (`docker-compose` ya da VPS crontab / systemd timer) eklenecek.
- Bildirim gönderimi (whatsapp) Faz 2 — şu an yalnızca iz.
- Admin itiraz/geri alma akışı admin paneli adımında.
