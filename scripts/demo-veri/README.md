# Demo verisi (pilot öncesi)

Yerel dev veritabanını **14 tezgah / 37 ürün / 10 alıcı** ve bunlara bağlı gerçekçi
bir geçmişle (satışlar, yıldızlar, yorumlar, beğeni/takip, açık rezervasyon kuyruğu)
doldurur. Amaç: sistemi baştan sona dolu haliyle görebilmek.

> ⚠️ **Sadece yerel dev DB.** Bu sahte içerik prod'a girmemeli — canlıda sahte tezgah
> ve sahte yorum, gerçek alıcıyı yanıltır ve pazar günü olmayan bir tezgaha gönderir.
> Bu yüzden `package.json`'daki `prisma.seed` kancasına **bağlanmadı**; elle çalıştırılır.
> (`prisma/seed.js` ise her ortamda çalışan gerçek kuruluş tohumudur — kategoriler.)

## Kullanım

```bash
# Ön koşul: aktif bir Pazar + kategoriler (pnpm exec prisma db seed) olmalı.
node scripts/demo-veri/seed.js             # kurar (demo verisi varsa reddeder)
node scripts/demo-veri/seed.js --sifirla   # önce mevcut demo verisini siler, sonra kurar
```

Giriş: tüm demo hesapların şifresi `demo1234`.
Satıcı örneği `ayse.yildirim@demo.tezgahimdan.com`, alıcı örneği `merve.sen@demo.tezgahimdan.com`.

`--sifirla` **yalnızca** `@demo.tezgahimdan.com` uzantılı hesaplara bağlı kayıtları ve
onların yüklediği fotoğraf dosyalarını siler; gerçek kayıtlara dokunmaz.

## Fotoğraflar

Seed her görseli şu sırayla arar:

1. `fotograflar/<kod>.<uzantı>` — **senin koyduğun** fotoğraf (öncelikli)
2. `fotograflar/varsayilan/<kod>.<uzantı>` — gözle doğrulanmış açık lisanslı yedek
3. yoksa → ürün **fotoğrafsız** oluşturulur (arayüz bozulmaz, yer tutucu gösterir)

Hangi kodun ne göstermesi gerektiği: **`fotograflar/LISTE.md`**.

`varsayilan/` klasörü git'e **girmez** (binary). Kaybolursa yeniden üretmek için:

```bash
node scripts/demo-veri/indir-commons.js /tmp/gorseller   # Commons'tan aday indir
node scripts/demo-veri/secimleri-kopyala.js /tmp/gorseller  # secim.js'teki seçimleri kopyala
```

## Dosyalar

| dosya | işi |
|---|---|
| `katalog.js` | 14 tezgah + 37 ürün + 10 alıcı verisi (tek doğruluk kaynağı) |
| `yorumlar.js` | kategori bazlı değerlendirme yorumu havuzu |
| `seed.js` | DB'yi kurar; rezervasyon motorunun kurallarını birebir uygular |
| `indir-commons.js` | Wikimedia Commons'tan aday görsel indirir (öge başına 6) |
| `kontak-sayfasi.js` | adayları tek sayfada dizer — **gözle** seçim için |
| `secim.js` | gözle doğrulanmış seçimler + kullanıcıdan beklenenler |
| `secimleri-kopyala.js` | seçilenleri `fotograflar/varsayilan/`'a kopyalar + ATIF.json |
| `manifest-uret.js` | `fotograflar/LISTE.md`'yi katalogdan üretir |

## Neden görsel seçimi elle?

Açık lisanslı havuzlarda arama sonuçları güvenilmez: "green olives" zeytin **ağacı**,
"wooden earrings" **iş kadını stok fotoğrafı**, "clay mask" yüzüne maske sürmüş
**insan** getiriyor. Bu yüzden her aday `kontak-sayfasi.js` ile gözden geçirilip
`secim.js`'e elle işlendi. Havuzu genişletirsen (yeni sorgu) seçimi de gözle doğrula —
otomatik "ilk sonucu al" mantığı ürünle alakasız görsel koyar.

## Seed'in uyduğu motor kuralları

`src/lib/rezervasyon.ts` ile tutarlı kalmalı — motor değişirse burası da değişmeli:

- **`kalanBirim = stokAdedi − satildiSayisi`**, ve bu sayım **hafta filtresizdir**.
  Geçmiş satış eklemek stoğu kalıcı düşürür; bu yüzden `stokAdedi`, katalogdaki
  "vitrinde kalsın istediğim miktar" **+ satış sayısı** olarak yazılır. Aksi halde
  `satildiSayisi >= stokAdedi` olur ve ürün `satildi`'ya geçip vitrinden kalkar.
- Aktif `siraNo` = `1..kalanBirim`, yedek `siraNo` = `1..maxYedek`.
- `doldu` eşiği = `kalanBirim + maxYedek` (PlatformAyarlari'ndan okunur).
- Değerlendirme **yalnızca** `Rezervasyon.durum='satildi'` olan alıcıdan gelebilir
  (`degerlendirme.ts` / `magaza-degerlendirme.ts`) — bu kural DB'de zorlanmadığı
  için seed'in kendisi buna uymak zorunda.
- Üst üste 3 "gelmedi" yasak tetikler — demo verisi bilerek bu eşiğin altında kalır.

Doğrulama (CLAUDE.md: API cevabına güvenme, psql ile bak):

```sql
-- satın almadan yorum bırakılmış mı? (0 olmalı)
SELECT count(*) FROM "Degerlendirme" d WHERE NOT EXISTS (
  SELECT 1 FROM "Rezervasyon" r
  WHERE r."urunId"=d."urunId" AND r."aliciId"=d."kullaniciId" AND r.durum='satildi');
```
