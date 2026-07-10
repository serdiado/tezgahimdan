# Güvenilirlik (Ceza-Ödül) Sistemi — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#güvenilirlik-ceza-ödül-sistemi)

Halk diline çevrilmiş, teknik olmayan anlatım için: [`../kilavuz/rezervasyon-ve-guvenilirlik.md`](../kilavuz/rezervasyon-ve-guvenilirlik.md).

> **2026-07-10: Sistem baştan tasarlandı.** Eski "eşik + iki-şartlı kapı" modeli
> kaldırıldı, yerine **"üst üste gelmedi serisi → süreli rezervasyon yasağı"**
> modeli geldi. Bu dosyanın önceki sürümü eski modeli anlatıyordu; karar
> geçmişi aşağıda "Eski modelden neden vazgeçildi" bölümünde korunuyor.

## Kural (tek cümle)

Bir alıcının sonuçlanmış rezervasyonlarında **üst üste `guvenilirlikEsigi`
(varsayılan 3) kez "gelmedi"** oluştuğu anda, alıcıya **`yasakSuresiGun`
(varsayılan 7 gün) yeni-rezervasyon yasağı** başlar; o an alıcının **bekleyen
tüm rezervasyonları iptal edilir** ve gelmedi sayacı **sıfırlanır** — yasak
bitince alıcı temiz sayfayla döner.

## Neden bu tasarım — reddedilen alternatifler (2026-07-10 tartışması)

Kullanıcının ilk önerisi **görünür bir -100/+100 puan skalasıydı** (her alıcı
0'la başlar, -100'de 1 hafta yasak, sonraki hafta -75'le başlar...). Şu
gerekçelerle **reddedildi** (kullanıcı ikna oldu):

1. **Kutsal kural:** "-100'de yasak, -75'le dönüş" pazardaki teyzeye tek
   cümlede anlatılamaz; "üst üste 3 kez gelmezsen 1 hafta ceza" anlatılır.
   Davranışı değiştiren şey yasağın kendisi, puanın matematiği değil.
2. **Negatif sayı damgalar:** "Puanınız: -25" gören kullanıcı itiraz üretir;
   gelmedi işaretini satıcı koyduğu için yanlış işaretleme ihtimali her zaman
   var — ince taneli skor her yanlışı büyütür.
3. **Pilot ölçeği:** Haftada bir pazar, alıcı başına 1-2 rezervasyonla puan
   aylarca ~0'da yığılır, anlam üretmez.
4. **Ödül tarafı (50+ puana indirim) Faz 1'de karşılıksız:** Ödeme yok,
   platform indirim uygulayamaz. Satıcı zaten alıcının aldı/gelmedi oranını
   panelde görüyor. İndirim/rozet fikri Faz 2+ notu olarak duruyor.

İkinci karar noktası: **"toplam 3" mü "üst üste 3" mü?** Kullanıcı danıştı,
öneri **üst üste** oldu ve onaylandı:

- Hedef persona "rezerve edip *hiç* gelmeyen" kişi — ardışıklık tam onu
  yakalar. "Toplam 3", aylara yayılmış üç dürüst aksiliği de cezalandırırdı
  (martta hasta, haziranda unuttu, eylülde acil iş → arada 30 düzgün teslim
  almış kişi eylülde ceza yerdi) — küçük ilçede platform aleyhine anlatılacak
  hikâye budur.
- Bilinen ve **kabul edilen** zayıflık: "2 kaçır 1 al" düzenindeki istismarcıyı
  ardışıklık hiç yakalamaz. Nadir görülür; satıcı oranı zaten görüyor; gerekirse
  admin eşiği ayarlardan 2'ye çeker. Pilotta izlenecek.

Üçüncü karar: **ceza anında el boşaltma.** "Elindeki rezervasyonu önce alsın,
sonra ceza başlasın" İSTENMEDİ — 3. gelmedi işaretlendiği an alıcının bekleyen
her şeyi iptal olur, alt sıradaki/yedekteki yükselir (kullanıcının açık isteği).

## Serinin tanımı

- Sadece **sonuçlanmış** kayıtlar sayılır: `satildi` ve `gelmedi`.
- **"Satıldı" seriyi bozar.** Üst üstelik ancak kesintisiz gelmedilerle oluşur.
- **Alıcının kendi vazgeçmesi (`iptal`) nötrdür** — sorguya hiç girmez, seriyi
  ne bozar ne uzatır. Vazgeçmek sorumlu davranıştır (slot açar) ama "2 gelmedi
  biriktir → ucuz bir şey rezerve et → vazgeç → seri temizlendi" kaçışına da
  izin verilmez.
- **Davranış sırası = `(pazarHaftasi DESC, createdAt DESC)`**, işaretlenme anı
  DEĞİL. Satıcı geç işaretlese bile seri, pazarların gerçekte yaşandığı sıraya
  göre hesaplanır. Sonuç: gecikmiş bir "gelmedi" işareti geldiğinde alıcı
  arada bir şey satın almışsa (satildi), o satın alma seriyi çoktan bozmuş
  sayılır ve yasak tetiklenmez — "az önce alışveriş yaptım, ceza yedim"
  saçmalığı yaşanmaz.
- Uygulama: `gelmediYasagiKontrolEt` (`src/lib/rezervasyon.ts`) en yeni `esik`
  kadar sonuçlanmış kaydı çeker (`take: esik`), **hepsi** `gelmedi` ise seri
  dolmuştur. Sayaç başlangıcı `Kullanici.guvenilirlikSifirlamaTarihi`
  (`createdAt > tarih` filtresi — kayıt silinmez, filtrelenir).

## Yasak mekanizması

- **Alan:** `Kullanici.rezervasyonYasagiBitisi DateTime?`. Geçmiş tarih = yasak
  yok; süresi biten yasak **kendiliğinden düşer**, satır temizliği/cron
  gerekmez.
- **Tetik:** `rezervasyon-sonuclandir` route'u, motor `gelmedi` sonucu
  döndükten SONRA (kilit dışı) `gelmediYasagiKontrolEt(aliciId)` çağırır.
  Gelmedi'nin TEK kaynağı satıcının elle işaretlemesi olduğu için (2026-07-09
  kararı: otomatik gelmedi yok) tetik noktası tektir.
- **Çift-tetik koruması:** yasak koşullu `updateMany` ile yazılır (`WHERE
  yasak IS NULL OR yasak <= now`) — aynı ana denk gelen iki işaretlemeden
  yalnız biri kazanır, çift süpürme/bildirim olmaz.
- **Sayaç sıfırlama yasakla atomik aynı update'te:**
  `guvenilirlikSifirlamaTarihi = now`. Yasak bitince temiz sayfa; yeniden seri
  dolarsa yeniden yasak. Yasak sırasında geç gelen (eski haftalara ait)
  "gelmedi" işaretleri sayaç başlangıcından önce oluşturulmuş kayıtlara ait
  olduğu için yeni seri başlatmaz — yasak üst üste binmez.
- **Kapı:** `rezervasyonOlustur` kilide girmeden `rezervasyonYasagiBitisi`
  okur; gelecekteyse `{ tur: "gelmedi-yasagi", bitis }` döner (API 403 +
  tarihli Türkçe mesaj). Eski iki-şartlı kilit-içi kontrol **kaldırıldı** —
  kapı artık tek şart, tek okuma.
- **Kabul edilen mikro-yarış:** kapı kontrolü kilit dışı olduğu için yasak tam
  yazılırken denk gelen bir oluşturma sızabilir; süpürmenin ikinci turu onu
  yakalar (aşağıda). O pencereyi de atlatan tekil bir kayıt yasağı delmez —
  kuyrukta sıradan bir bekleyen olarak satıcı/sıfırlama akışlarınca işlenir.
- **Audit:** `gelmedi_yasagi_baslatildi:seri=3:gun=7` (`DurumGecmisi`,
  `varlikTuru: Kullanici`).

## Yasak süpürmesi (`yasakSupurmesi`)

Yasak başladığı anda alıcının `bekliyor` rezervasyonları iptal edilir:

- Her iptal, **kendi ürününün `FOR UPDATE` kilidi altında**, vazgeç akışıyla
  birebir aynı kuyruk kurallarıyla yapılır: aktif iptalse yedek#1 yükselir ve
  sıra numarasını devralır, yedek iptalse arkası kayar, `doldu → sergide`
  dönüşü unutulmaz. Audit: `rezervasyon_yasak_iptali:{tip}:{siraNo}`.
- **İstisna — BAŞLAMIŞ pazara ait kayıtlar (2026-07-10 motor incelemesi
  sonrası kullanıcı onayıyla daraltıldı):** süpürme yalnızca `now <
  pazarBaslangicAni` olan (pazarı henüz başlamamış, yani gelecek haftanın)
  rezervasyonlarını iptal eder. Başlamış pazara ait iki kategori DOKUNULMAZ:
  - **O gün devam eden pazarın rezervasyonu:** alıcı ürünü fiilen almış ama
    satıcı henüz "Sattım" dememiş olabilir — iptal edersek satış kaydı
    kaybolur (iptal kayıt sonradan işaretlenemez) ve yükselen yedek tükenmiş
    ürüne çağrılırdı. Akşam satıcı normal yoldan sonuçlandırır. Yasağın
    kendisi yine ANINDA başlar — ertelenen ceza değil, sadece o günkü
    kayıtların iptali yapılmaz.
  - **Geçmiş haftanın işaretlenmemiş kaydı:** satıcı-ihmali mekanizmasının
    konusu (2026-07-09: hükmü satıcı verir); iptal edersek "aslında
    satılmıştı" gerçeği kaybolur ve satıcının panel kilidi sahte açılırdı.
- **İki tur çalışır:** ilk tur sırasında yarış penceresinden sızan kayıt
  ikinci turda yakalanır; yasak commit'li olduğu için üçüncü tura gerek yok.
- Ayrı ürün kilitleri sonuçlandırma transaction'ının DIŞINDA tek tek alınır —
  sonuçlandırmanın tuttuğu kilitle iç içe geçmez, kilit sırası döngüsü
  (deadlock) yapısal olarak imkânsız.

## Bildirimler (route katmanı — motor bildirim göndermez)

- **Alıcıya tek toplu bildirim:** yasak bitiş tarihi + kaç bekleyeninin iptal
  edildiği + "temiz sayfa" bilgisi (`/rezervasyonum` hedefli).
- Süpürülen her üründe: yükselen varsa kişisel "sıra sana geldi", aktif-tier
  iptalse ürün takipçilerine haber, tezgah sahibine nötr "bir rezervasyon
  iptal edildi" (alıcının yasağı İFŞA EDİLMEZ).

## Yanlış işaretleme telafisi (Geri Al etkileşimi)

`rezervasyonGeriAl` bir **gelmedi**'yi geri alırken alıcının aktif yasağı
varsa **yasak kaldırılır** (`gelmedi_yasagi_kaldirildi:geri_alma` audit'i +
alıcıya bildirim). Gerekçe — **alıcı lehine önyargı**: yasağı başlatan işaretin
bu kayıt olup olmadığı kesin bilinemez (sayaç yasak anında sıfırlandı), şüphe
alıcıdan yana yorumlanır.

**Bilinçli asimetri (kullanıcı 2026-07-10'da açıkça kabul etti):** süpürmede
iptal edilen diğer rezervasyonlar **geri gelmez** (yerlerine başkaları
yükselmiş olabilir) — alıcı yasağı kalktığı için hemen yeniden rezerve
edebilir, sadece sıradaki yerini kaybeder. Kullanıcının sözleriyle: satıcı
yanlış işaretleyip mağdur ederse "alıcı da girip satıcı puanını düşürebilir,
şikayet yazabilir... Burada bir adaletsizlik var evet ama nadir görülecek bir
durumdur ve olmaması için daha karmaşık işlemlere gerek yok."

## Admin tarafı

- **Af** (`/api/admin/kullanici-guvenilirlik-sifirla`): tek işlemde
  `guvenilirlikSifirlamaTarihi = now` (seri sıfırlanır) + `rezervasyonYasagiBitisi
  = null` (varsa yasak kalkar). Kayıt silinmez. Kalıcı muafiyet değildir.
- **/admin/guvenilirlik:** artık "eşiği aşanlar"ı değil **şu an aktif yasağı
  olanları** listeler (yasak bitişi + tüm-zamanlar toplam gelmedi ile).
  Önceki listenin "yeni rezervasyon alamazlar" metni motor kapısıyla
  tutarsızdı — bu tutarsızlık yeni modelde kökten çözüldü: liste = kapı.
  Buton: "Yasağı Kaldır" (aynı af API'si).
- **/admin/kullanicilar/[id]:** sıfırlamadan-beri gelmedi sayısı + aktif
  yasak varsa kırmızı "yasak bitişi" satırı (⚠️ artık yasak-aktif demek).
- **Ayarlar** (`/admin/ayarlar`): `guvenilirlikEsigi` 1–20 (artık "üst üste"
  anlamıyla), **yeni** `yasakSuresiGun` 1–30 gün (varsayılan 7), `maxYedek`
  0–50. Motor her çağrıda taze okur, deploy gerekmez. Audit:
  `platform_ayarlari_guncellendi:esik=3:yedek=5:yasak=7g`.

## Satıcı paneli rozeti

`aliciGuvenilirlikHaritasi` artık `yasakliMi` de döner; "Kısıtlı" çipi
(`KuyrukKarti`) **şu an aktif yasak** demektir — motor kapısıyla birebir aynı
anlam (eski modeldeki rozet-kapı tutarsızlığı kalktı). Yasak başlarken sayaç
sıfırlandığı için rozet sayılardan bağımsız gösterilir (0/0'lık yasaklı alıcıda
oran gizlenir, çip çıkar).

## Eski modelden neden vazgeçildi (2026-07-10 öncesi davranış)

Eski kural: `gelmedi >= esik` VE "o an elinde bekliyor+aktif rezervasyon var"
→ yeni rezervasyon reddedilirdi. İki gerçek sorun:

1. **Kronik gelmeyeni hiç durdurmuyordu:** satıcı çarşamba akşamı "gelmedi"
   işaretleyince alıcının eli boşalıyor, ertesi hafta yine rezervasyon
   yapabiliyordu — süresiz tekrarlanabilir döngü.
2. **Rozet/liste kapıyla tutarsızdı:** "Kısıtlı" görünen kişi çoğu zaman
   fiilen rezervasyon yapabiliyordu.

Sayım tüm-zamanlardı (sıfırlanmazdı); yeni modelde sayaç yasakla birlikte
sıfırlanır. **Legacy notu:** deploy anında geçmişten eşik-üstü gelmedisi olan
kullanıcılar geriye dönük YASAKLANMAZ; seri kuralı ilk YENİ "gelmedi"
işaretlemesinde, mevcut geçmişleri de dahil ederek değerlendirilir (son `esik`
sonuçlanmışın hepsi gelmediyse o an yasak başlar).

## İleride ele alınacaklar

- **"2 kaçır 1 al" istismarcısı** ardışıklık kuralına yakalanmaz — pilotta
  izlenecek; gerekirse eşik düşürülür ya da pencere kuralı eklenir.
- **Ödül tarafı** (güvenilir alıcıya rozet/indirim) Faz 2+ — ödeme/indirim
  altyapısı yok, satıcı şimdilik oranı görüp kendi jestini yapabilir.
- **İtiraz akışı yok:** alıcının "haksız gelmedi" itirazı için tek yol
  satıcının Geri Al'ı ya da admin affı; yapılandırılmış bir itiraz kaydı
  ileride düşünülebilir.
- `guvenilirlikSifirlamaTarihi` sınırsız kez üzerine yazılabilir (admin affı
  için politika sınırı yok) — bilinçli esneklik, kötüye kullanım riski
  değerlendirilmedi.
