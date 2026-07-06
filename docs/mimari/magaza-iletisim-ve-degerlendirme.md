# WhatsApp İletişim + Tezgah Bilgisi/Kroki + Mağaza Değerlendirmesi

## Bağlam

Kullanıcı sisteme dört soru sorduktan sonra ("ne var ne yok") 3 yeni özellik istedi
(ürün-seviyesi değerlendirme zaten mevcut olduğu için 4. madde iş çıkarmadı). Üçü de
mağaza sayfası (`src/app/magaza/[slug]/`) etrafında toplanıyor ama birbirinden bağımsız;
tek oturumda, ayrı ayrı kodlanıp doğrulandıktan sonra tek commit'te birleştirildi.

## WhatsApp iletişim — veri zaten vardı, sadece gösterim eksikti

`Magaza.whatsappNo` satıcı mağaza ayarlarından uzun süredir toplanıyordu ama hiçbir
yerde alıcıya gösterilmiyordu. Eklenen tek şey: `MagazaHero.tsx`'te doluysa
`https://wa.me/<numara>` linki (mesaj ön-doldurma YOK, kullanıcı kararı — sade
tıklanabilir buton). Kritik detay: `telefonNormallestir()` numarayı `+90XXXXXXXXXX`
formatında döndürüp DB'de öyle saklıyor, ama wa.me resmi linki `+` işareti OLMADAN
ülke kodu ister — gösterim tarafında `replace(/^\+/, "")` ile strip ediliyor. Ne
migration ne API değişikliği gerekti.

## Tezgah bilgisi + kroki fotoğrafı — self-servis, admin-yönetimli ortak harita DEĞİL

İlk önerilen tasarım (admin bir pazar için ortak kroki görseli yükler, her mağazaya
görsel üzerinde x/y pin ataması yapar) kullanıcı tarafından reddedildi — çok daha
basit bir alternatif tercih edildi: **her satıcı kendi mağazası için TEK bir fotoğraf
yükler** (kendi tezgahının fotoğrafı ya da elle çizdiği kroki), telefon kamerasından
doğrudan çekilebilir. Admin hiç karışmaz, paylaşılan bir harita/pin sistemi yok.

Veri modeli: `Magaza.tezgahBilgisi` (serbest metin, max 100 karakter — sadece rakam
değil, "A Blok 5" gibi tarif de olabilir; sınır DB'de değil `magaza-ayarlari` server
action'ında kontrol edilir, projenin "puan 1-5 gibi validasyonlar API katmanında"
ilkesiyle tutarlı) + `Magaza.krokiFotoUrl` (tek fotoğraf yolu).

Upload akışı `src/lib/urun.ts:urunEkle()`'nin tek-fotoğraf sadeleştirilmiş hali
(`src/lib/magaza-kroki.ts:magazaKrokiGuncelle`) — aynı magic-number doğrulama, ayrı
klasör (`public/uploads/magaza-kroki/`, ürün fotoğraflarıyla karışmasın). Mağaza
ayarları sayfası bugün SERVER ACTION (whatsappNo/ad/açıklama) kullanıyor; dosya
içeren kısmı bu action'a karıştırmadan AYRI bir client bileşen
(`KrokiFotografSecici.tsx`) + AYRI API route (`/api/panel/magaza-kroki`, POST/DELETE)
ile eklendi — mevcut akışa dokunmadan izole risk.

## Mağaza-seviyesi değerlendirme — Degerlendirme'ye `magazaId` eklemek yerine AYRI tablo

`Degerlendirme` (ürün-seviyesi) modelinde `urunId` NOT NULL + `@@unique([kullaniciId,
urunId])`. Aynı tabloda mağaza değerlendirmesini de tutmak `urunId`'yi nullable yapıp
`Sikayet`'teki `hedefUrunId`/`hedefMagazaId` XOR desenine geçmeyi gerektirirdi — zayıf
DB garantisi + her mevcut ürün-değerlendirme sorgusunun "urunId null olabilir"
ihtimaline karşı gözden geçirilmesi. Bunun yerine `MagazaTakip`'in `UrunFavori`'den
ayrı tutulma gerekçesiyle (bkz. `docs/mimari/magaza-takip.md`) birebir tutarlı: yeni,
bağımsız `MagazaDegerlendirme` modeli (`@@unique([kullaniciId, magazaId])`, upsert,
hiç hard-delete yok — ürün-değerlendirmesiyle AYNI desen).

**Kim değerlendirebilir**: bu mağazadan (HANGİ ürün olursa olsun) en az bir
`Rezervasyon.durum="satildi"` kaydı olan herkes — `src/lib/magaza-degerlendirme.ts:
magazaDegerlendirmeUpsert` içinde `Urun.magazaId` üzerinden DOLAYLI join ile
doğrulanır (Rezervasyon'da doğrudan `magazaId` FK'i yok). Ürün-değerlendirmedeki
"sadece gerçekten satın alan" ilkesiyle aynı ruhta, hedef sadece ürün değil mağaza.

**"Mağazayı Değerlendir" butonu neden `/rezervasyonum`'da MAĞAZA bazlı**: kullanıcının
satın aldığı mağazalardan TEKİL bir liste çıkarılır (aynı mağazadan 3 ürün alınmışsa
3 değil 1 buton) — ürün-bazlı "Değerlendir" butonuyla AYNI sayfada, YAN YANA, birbirini
değiştirmeden var olur (biri ürünü biri mağazayı değerlendiriyor). Kritik düzeltme:
bu tekilleştirme için `/rezervasyonum/page.tsx`'teki `magaza` select'ine `id: true`
eklenmesi gerekti — daha önce sadece `ad`/`slug` seçiliyordu, `magazaId` hiç yoktu.

## Rezervasyon motoruna dokunuş: HİÇ

Üçü de ya salt-okunur `findFirst`/`aggregate` sorguları (satın alma doğrulaması,
puan özeti) ya da tamamen ayrı `Magaza` alanları/tablosu üzerinde çalışıyor.
`rezervasyon.ts`'e (motor) hiçbir çağrı yapılmadı.

## Canlı doğrulanan senaryolar (psql + Preview MCP, izole test fixture'larıyla)

Test için gerçek kullanıcı hesaplarına dokunmadan izole bir satıcı+alıcı+mağaza+ürün+
satıldı-rezervasyon seti oluşturulup doğrulama sonunda temizlendi:

- Satıcı `magaza-ayarlari`'nda whatsappNo + tezgahBilgisi kaydetti → psql'de
  `+90XXXXXXXXXX` formatında ve serbest metin doğru yazıldı.
- Kroki fotoğrafı yüklendi → dosya `public/uploads/magaza-kroki/` içinde oluştu,
  DB'de `krokiFotoUrl` güncellendi. Fotoğraf DEĞİŞTİRİLDİĞİNDE eski dosya silindi
  (yetim dosya birikmedi).
- Mağaza sayfasında (girişsiz) WhatsApp linki (`https://wa.me/905551234567` — artı
  işaretsiz), tezgah bilgisi metni, kroki thumbnail'i doğru göründü.
- Alıcı `/rezervasyonum`'da mağaza-bazlı TEK "Mağazayı Değerlendir" butonu gördü,
  5 yıldız + yorum gönderdi → psql'de satır oluştu. Farklı puan/yorumla tekrar
  gönderdi → satır SAYISI değişmedi (upsert doğrulandı, `count=1`), buton metni
  "Değerlendirmeni Düzenle"ye döndü, form önceki değerlerle önceden doldu.
- Mağaza sayfasında güncel ortalama ("3.0 (1)") + yorum listelendi.
- Satın almamış kullanıcı (aynı alıcı, farklı bir mağazaya) API'ye POST → 403.
- Girişsiz kullanıcı API'ye POST → 401.
- `whatsappNo`/`tezgahBilgisi`/`krokiFotoUrl` boş olan mağazada (Ayşe Teyzenin
  Tezgahı) üçü de HİÇ render edilmedi (gereksiz UI gürültüsü yok).
