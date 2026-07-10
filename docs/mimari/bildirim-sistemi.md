# Bildirim Sistemi — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#bildirim-sistemi)

> 2026-07-10'da bir denetim + genişleme turuyla derlendi. Öncesinde bildirimler
> parça parça (her özellikle birlikte) eklenmişti; bu dosya sistemin bütününü,
> iki bildirim türünün ayrımını ve o turda kapatılan boşlukları kayda geçirir.

## İki bildirim türü (temel ayrım)

Sistemde adı "bildirim" olan ama tabiatı farklı **iki** şey var:

| | **İşlem bildirimi** | **Duyuru (editoryal)** |
|---|---|---|
| Kaynak | otomatik, sistem üretir | admin elle yazar |
| İçerik | kısa, tek cümle, bir varlığa bağlı | uzun olabilir, başlık+gövde+görsel |
| Tablo | `Bildirim` (govde alanı yok) | `Duyuru` (govde `@db.Text`) |
| Tıklayınca | ilgili varlığa (ürün/rezervasyon) | `/duyuru/[id]` detay sayfası |

İkisi de son kullanıcıya aynı yerde (`/bildirimlerim` + zil rozeti) görünür,
ama duyuruda `Bildirim` satırı sadece bir **pointer**'dır (başlık + `duyuruId`);
gövde `Duyuru`'da yaşar. Bu ayrım, "yeni işleyiş / eğitim" gibi uzun içeriği
küçük `Bildirim.mesaj` alanına sıkıştırma hatasını çözer.

## `Bildirim` modeli + gösterim

- Alanlar: `kullaniciId`, opsiyonel `urunId` / `duyuruId` / `hedefYolu`, `mesaj`,
  `okunduMu`, `silindiMi`, `createdAt`.
- Gönderim yardımcıları `src/lib/bildirim.ts`: `bildirimGonderKullaniciya`
  (tekil, urun-bağsız), `bildirimGonderTakipcilere` / `bildirimGonderMagazaTakipcilerine`
  (favori/takip kitlesi), `bildirimGonderYukselenKullaniciya` /
  `bildirimGonderDusenKullaniciya` (kişisel sıra değişimi), `bildirimGonderPazarSaticilarina`
  (pazar aktiflik değişimi).
- **Motor bildirim GÖNDERMEZ** — `rezervasyon.ts` kilit/transaction içinde
  hiçbir `bildirim.*` çağırmaz; gönderim her zaman route katmanında, motor
  başarıyla döndükten SONRA yapılır (kritik-bölge süresi uzamasın).
- **Rol bağımsız gösterim:** zil ikonu + okunmamış rozeti (`SiteHeader.tsx`)
  TÜM giriş yapmış rollerde çalışır; satıcı/admin de kendine gelen bildirimi
  görür. `/bildirimlerim` route group adı `(alici-panel)` olsa da URL'e
  yansımaz. **Bilinen UX pürüzü:** satıcı/admin zile tıklayınca alıcı-odaklı
  yan menüyü görür (rol-nötr yerleşim ileride).

### Tıklama hedefi çözümü (`BildirimlerimIcerik.tsx`)

```
urunId varsa   → /magaza/{slug}?urun={urunId}
yoksa duyuruId → /duyuru/{duyuruId}
yoksa hedefYolu → hedefYolu
hiçbiri yoksa  → kart tıklanamaz
```

Gönderen kodda `urunId` / `duyuruId` / `hedefYolu` **karşılıklı dışlayıcıdır**
(biri doluysa öteki boş) — bu yüzden öncelik sırası bir çakışma üretmez. Bu
sözleşme korunmalı: aynı satıra hem urunId hem hedefYolu yazan yeni bir
bildirim, hedefYolu'nu sessizce yutulmuş bulur.

### Silme/temizleme (soft-delete)

Alıcı kendi bildirimini listeden kaldırabilir (`silindiMi=true`) — tek tek (X)
veya "Tümünü Temizle" (`bildirimlerim/actions.ts` server action'ları, sahiplik
`WHERE kullaniciId` ile zorlanır). Kalıcı silme YOK (proje ilkesi); liste +
rozet sorguları `silindiMi=false` filtreler.

## `Duyuru` modülü

- Model: `baslik`, `govde` (uzun), `gorselUrl?`, `tur` (`DuyuruTuru`:
  bilgi/eğitim/uyarı), `hedefKitle` ("hepsi"/"satici"/"alici"), yayın durumu
  (`yayinlandiMi`, `yayinTarihi`, `gonderilenSayisi`), `olusturanId`, `silindiMi`.
- **Yayınlama fan-out** (`src/lib/duyuru.ts` `duyuruYayinla`): hedef kitleye
  `Bildirim` pointer'ları üretir (mesaj=başlık, `duyuruId`=pointer). **İdempotent**:
  koşullu `updateMany (yayinlandiMi=false)` bir kilit görevi görür — iki eş
  zamanlı "Yayınla" tıklamasından yalnız biri fan-out yapar. "hepsi" =
  satıcı+alıcı (admin hariç). İçerik yayından SONRA da düzenlenebilir (detay
  sayfası canlı okur) ama yeniden fan-out edilmez.
- **Admin CRUD** (`/admin/duyuru` liste + `/yeni` + `/[id]/duzenle`): durum
  (taslak/yayında) + gönderilen/okunan istatistiği. Okunan sayısı canlı
  (`Bildirim.duyuruId + okunduMu + !silindiMi`). "Yayından Kaldır" soft-delete;
  detay sayfası (`/duyuru/[id]`, giriş zorunlu, yayınlanmış+silinmemiş) 404 döner.
- **Görsel:** `pazar-gorsel` deseni (`duyuru-gorsel.ts` + `/api/admin/duyuru-gorsel`,
  magic-number doğrulama, yaz→DB→eskiyi-sil). **Kritik:** `/uploads/[...dosyaYolu]`
  `IZINLI_ALT_DIZINLER` listesine "duyuru" eklendi — aksi halde prod'da yeni
  yüklenen dosya 404'e düşerdi (aynı bug pazar görselinde iki kez ısırmıştı).
- **Kutsal kural admin'de geçerli değil** (CMS derinliği hedefi, bkz.
  `feedback_kutsal-kural-admin-muaf` hafıza notu) — bu modül o çerçevede.
- Eski "gönder-unut" `duyuru-gonder` route'u bu akışa devredildi (kaldırıldı).

## 2026-07-10 denetiminde kapatılan işlem-bildirimi boşlukları

Hepsi "bir aksiyonun sessizce etkilediği kişiye haber ver" deseni:

- **Ürün tükenince iptal:** ürün satılıp stok bitince motor bekleyen
  rezervasyonları iptal ediyordu ama alıcılar habersizdi (boşuna pazara
  gidebilirdi). Motor artık iptal edilen alıcı id'lerini döndürüyor
  (`tukenmeIptalAliciIdleri`), route her birine kişisel bildirim + takipçi
  bildiriminden hariç tutma yapıyor.
- **Geri-almada aktiften düşen alıcı:** satıcı "gelmedi" geri alınca kapasite
  taşıp bir alıcı yedeğe düşerse, yükselmenin simetriği `bildirimGonderDusenKullaniciya`
  ile kişisel haber gider.
- **Admin/pazar simetri (5 olay):** admin affı (aktif yasak kalkınca alıcıya),
  pazar pasif→aktif (satıcılara), admin ürün ekle/düzenle/kaldır (tezgah
  sahibine). Emsal: `magaza-gizle` zaten sahibi bildiriyordu; bu olaylar aynı
  desene çekildi.

## Bilinçli tasarım kararları (denetimde "eksik" sanılıp reddedilenler)

- **Tek "gelmedi" alıcıya bildirilmez** — ince ceza durumunu yüzeye çıkarmama +
  dispute-üretmeme kararı (bkz. `guvenilirlik-sistemi.md`); telafi Geri Al +
  admin affı.
- **Satıldı/geri-alma alıcıya bildirilmez** — gerçek-dünya olayı, alıcı zaten
  bilir; işaretleme ve geri-alma simetrik biçimde sessiz.
- **Şikayet açılınca / geri-alma reddedilince admin'e push yok** — pull yüzeyi
  var (`/admin/sikayetler` + dashboard sayacı; `/admin/anlasmazliklar`).
- **Toplu duyuru / pazar-pasif bildirimleri hedefsiz** — tıklanamaz kart doğru
  (yönlendirilecek çalışan sayfa yok).

## Bilinen sınırlar (ileride)

- **Kırık link:** `urunId`/`duyuruId` taşıyan bir bildirim gönderildikten SONRA
  ilgili mağaza gizlenir / pazar pasifleşir / duyuru kaldırılırsa, tıklayınca
  hedef 404 döner (`getMagazaBySlug` gizli/pasifi filtreler). Href üretiminde
  görünürlük doğrulanmıyor — nadir, moderasyon-bağımlı.
- **Sayfalama yok:** `/bildirimlerim` tüm bildirimleri tek seferde yükler
  (ağır kullanıcıda ileride perf).
- **Satıcı/admin bildirim sayfasında alıcı yan menüsü görür** (rol-nötr
  yerleşim ileride).
- **E-posta / SMS / push kanalı yok** — Faz 2 (kullanıcı kararı). `Bildirim`
  şu an yalnız site-içi; harici kanal eklenirse buradan dallanır.
