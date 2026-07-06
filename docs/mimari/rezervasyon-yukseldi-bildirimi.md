# "Rezervasyonun Yükseldi" Bildirimi

## Bağlam

Favori/Bildirim sisteminin sonunda önerilen 5 ek özellikten kullanıcının
bilinçli olarak en sona bıraktığı tek maddeydi — motorun kırılgan
eşzamanlılık akışına diğerlerinden daha yakın dokunduğu için ayrı ele
alınması istendi. Bir kullanıcının YEDEK sıradaki rezervasyonu aktife
yükselince ona özel, kişisel bir bildirim ("sıra sana geldi") gönderir —
ürünü takip ediyor olması şart değil, kendi bekleyen kaydı yükseldiği için
zaten ilgilenmesi gereken bir olay.

## Motora dokunuş — hiç

Yükselme (yedek→aktif) sadece `rezervasyonVazgec` (aktif iptali) ve
`rezervasyonSonuclandir`'in `gelmedi` dalında oluşur. Motor bu iki
fonksiyonu zaten `yukselenKodu: string | null` döndürüyordu (Favori/Bildirim
aşamasında eklenmişti) ama hiçbir route bunu kullanmıyordu. `src/lib/
rezervasyon.ts` bu özellik için **tek satır bile değişmedi** — sadece route
katmanında zaten dönen bu veri tüketilip yeni bir bildirim tetiklendi.
`yukselenKodu` bir `rezervKodu` (schema'da `@unique`) — `bildirimGonderYukselenKullaniciya`
(`src/lib/bildirim.ts`) bunu `Rezervasyon.findUnique` ile `aliciId`'ye çözer.

## Çift bildirim önleme — `bildirimGonderTakipcilere` imza genişlemesi

Yükselen kişi ürünü zaten takip ediyorsa hem genel takipçi bildirimini
("aktif rezervasyon iptal edildi" / "hak sahibi gelmedi") hem de yeni
kişisel bildirimi ("sıra sana geldi") alırdı — birincisi onun açısından
yanıltıcı olurdu (aslında yükseldiğini, sadece "iptal oldu"ğunu düşünürdü).
Çözüm: `bildirimGonderTakipcilere`'in `haricKullaniciId: string` parametresi
`haricKullaniciIdler: string[]`'e genişledi. `vazgec`/`rezervasyon-sonuclandir`
route'ları önce yükselene kişisel bildirimi gönderip `aliciId`'sini öğrenir,
sonra genel takipçi bildirimini o kişiyi de hariç tutarak gönderir — tek
DB sorgusuyla (rezervKodu→aliciId) her iki iş çözülür. Fonksiyonun kalan 4
çağıranı (`rezervasyon`, `rezervasyon-geri-al`, `urun-duzenle`, `cron/pazar-sifirlama`)
sadece mekanik olarak `[haricId]` şekline güncellendi, davranışları değişmedi.

`rezervasyon-geri-al` route'una YENİ bir bildirim eklenmedi — `dusenYedekKodu`
bir DÜŞME (aktiften yedeğe), bu özelliğin kapsamı dışında (kullanıcı
özellikle "yükseldi" bildirimi istedi, düşme bildirimi istemedi).

## Canlı doğrulanan senaryolar (API + psql)

Test kullanıcıları A/B/C ile: vazgeç→yükselme (B'ye tek doğru bildirim),
gelmedi→yükselme + C ürünü önceden takip ediyorken (çift-bildirim
düzeltmesi doğrulandı: C'ye SADECE tek "sıra sana geldi" satırı oluştu, genel
takipçi bildirimi C'yi atladı), satıldı'da yükselme YOK (yedek kaydı
değişmedi), geri-al'da yeni yükselme bildirimi YOK (sadece mevcut genel
"işlem geri alındı" bildirimi vardı), yedek kendi vazgeçince bildirim YOK,
iptal eden kişinin kendi kendine bildirim almadığı.
