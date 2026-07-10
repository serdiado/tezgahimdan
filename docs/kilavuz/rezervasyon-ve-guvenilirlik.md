# Tezgahımdan Rezervasyon ve Güvenilirlik Sistemi — Kullanım Kılavuzu

## Bu dosya ne için

Bu dosya, Tezgahımdan'daki rezervasyon sisteminin ve "güvenilirlik" (ceza-ödül) sisteminin **nasıl çalıştığını** sade bir dille anlatan bir kullanım kılavuzudur. Yazılım bilgisi gerektirmez; üreticiler, alıcılar ve belediye çalışanları için hazırlanmıştır.

Teknik detaya ihtiyaç duyan biri için (geliştirici, sistemin iç işleyişini merak eden biri) bu kuralların tam teknik karşılığı `docs/mimari/rezervasyon-motoru.md` dosyasında ayrıca belgelenmiştir. Bu kılavuzda o dosyadaki hiçbir kurala aykırı bilgi yoktur — sadece aynı kurallar herkesin anlayacağı dile çevrilmiştir.

---

## 1. Rezervasyon Nasıl Çalışır

### Bir ürünü rezerve etmek ne demek

Bir alıcı bir ürünü rezerve ettiğinde, o ürün pazar günü tezgahtan kendisi için ayrılmış olur. Ödeme pazar yerinde, elden nakit olarak yapılır — rezervasyon sadece "bu ürün benim, ben gelip alacağım" sözüdür.

Rezervasyon yapabilmek için alıcının siteye giriş yapmış olması ve telefon numarasının kayıtlı olması gerekir (ilk rezervasyonda bir kere sorulur). Alıcının kimliği telefon numarasıdır.

### Aynı anda iki kişi aynı ürüne tıklarsa ne olur?

Diyelim ki bir üründen elde sadece 1 tane kaldı. Ayşe ve Fatma, tam aynı saniyede o ürüne "Rezerve Et" butonuna basıyorlar.

Sistem bu iki isteği **asla aynı anda işlemez** — ne kadar aynı anda gelirse gelsinler, biri diğerinden önce sıraya girer, tıpkı tek bir tezgahtarın önündeki kuyruk gibi. Önce gelen istek tam olarak sonuçlanmadan (ürünü alıp almadığına karar verilmeden) ikinci istek beklemede kalır. Bu sayede iki kişiye aynı anda "tebrikler, ürün sizin" denip de ortada tek ürün kalması gibi bir karışıklık **hiçbir zaman** yaşanmaz. Bu davranış gerçek eşzamanlı testlerle de doğrulanmıştır: aynı ürüne aynı anda 8 farklı istek gönderildiğinde, sistem bunları tek tek, karışıklık çıkarmadan sıraya koymuştur.

Farklı ürünlere gelen istekler ise birbirini hiç etkilemez — Ayşe'nin reçel siparişi ile Fatma'nın örtü siparişi aynı anda, sorunsuz işlenir.

### "Tezgahtan alacaksın" mı, "sırada bekliyorsun" mı?

Bir ürüne rezervasyon yapıldığında iki durumdan biri olur:

- **Aktif (tezgahtan alacaksın):** Elde stok var ve senin için ayrıldı. Pazar günü tezgaha gidip ürünü teslim alabilirsin.
- **Yedek (sırada bekliyorsun):** Stok o an dolu ama bekleme listesine yazıldın. Bekleme listesi varsayılan olarak en fazla **5 kişilik**tir (bu sayı da belediye/admin tarafından değiştirilebilir, bkz. bölüm 2) — bekleme listesi de doluysa, yeni gelen kişiye kapasitenin dolu olduğu bildirilir ve rezervasyon yapılamaz.

**Örnek:** Zeynep abla'nın 3 kavanoz reçeli var, hepsi rezerve edilmiş durumda. Elif, ürüne tıkladığında "aktif" değil "yedek" olarak sıraya girer — 1. sıradaki yedek olur. Eğer aktiflerden biri vazgeçerse ya da gelmezse, Elif otomatik olarak aktife yükselir.

### Alıcı vazgeçerse ne olur — sıradaki otomatik yükselir mi?

Evet, **hiçbir ek işlem gerekmeden, anında** yükselir.

**Örnek:** Ayşe bir ürünü aktif olarak rezerve etmişti ama pazar günü gitmeden önce fikrini değiştirip "Vazgeç" dedi. O anda bekleme listesindeki ilk sıradaki kişi (varsa) otomatik olarak aktife geçer — kendisi tıklamasa bile, kimse elle onaylamasa bile. Eğer bekleme listesinde kimse yoksa, sadece bir boş yer açılır ve ürün, doluysa yeniden "sergide" görünmeye başlar.

Vazgeçmek, alıcı için **hiçbir olumsuz sonuç doğurmaz** — bu önemli bir noktadır ve aşağıda güvenilirlik bölümünde tekrar değinilecektir.

### Satıcı "Sattım" ya da "Gelmedi" dediğinde ne olur

Pazar günü satıcı, elindeki her aktif rezervasyon için iki seçenekten birini işaretler: **"Sattım"** ya da **"Gelmedi."** (Not: bu işaret sadece "aktif" durumdaki, yani sırası gelmiş rezervasyonlar için yapılabilir; bekleme listesindekiler için yapılamaz.)

- **"Gelmedi" işaretlenirse:** Ürün hâlâ satılabilir kabul edilir. Tıpkı vazgeçme durumunda olduğu gibi, bekleme listesindeki ilk kişi otomatik olarak aktife yükselir. Fark şu: bu, alıcının güvenilirlik geçmişine **olumsuz** bir kayıt olarak işlenir (bkz. bölüm 2).
- **"Sattım" işaretlenirse:** Ürün gerçekten elden çıkmış demektir. Bekleme listesindeki kimse yükselmez — çünkü ortada devredilecek ürün kalmamıştır. Eğer bu satışla birlikte üründeki tüm stok tükenmişse, bekleme listesinde kalan herkesin rezervasyonu (hem varsa diğer aktifler hem tüm yedekler) otomatik olarak iptal edilir ve ürün "satıldı" durumuna geçer. Stokta hâlâ ürün varsa (örneğin 3 kavanozdan 1'i satıldıysa), diğer aktif ve yedek rezervasyonlar olduğu gibi beklemeye devam eder.

### Satıcı yanlışlıkla işaretlerse

Satıcı "Sattım" ya da "Gelmedi" derken yanlış tuşa basmışsa, bu işaretlemeyi geri alabilir. Ama iki durumda geri alma **kabul edilmez**:

- Ürün zaten tamamen satılmış ve kapanmışsa,
- Geri alma, bekleme listesinin taşmasına (üründe yer olduğundan fazla kişi birikmesine) yol açacaksa.

Bu tür bir reddetme olursa, durum kayıt altına alınır ki gerekirse sonradan incelenebilsin.

---

## 2. Güvenilirlik (Ceza-Ödül) Sistemi Nasıl Çalışır

> Bu bölüm 2026-07-10'da yenilendi: eski "eşik + elinde rezervasyon varken
> alamaz" kuralının yerini **"üst üste 3 gelmedi → 1 hafta rezervasyon
> yasağı"** kuralı aldı.

### Kural tek cümleyle

**Üst üste 3 kez** rezervasyon yapıp da teslim almayan (satıcı tarafından
"Gelmedi" işaretlenen) alıcı, **1 hafta boyunca** yeni rezervasyon yapamaz.
Hafta dolunca sayaç sıfırlanır — temiz bir sayfayla devam eder. Yine üst üste
3 kez gelmezse yine 1 hafta ceza alır. (Hem "3" hem "1 hafta" belediye/admin
tarafından ayarlanabilir, aşağıya bakın.)

### "Üst üste" ne demek — neyi bozar, neyi bozmaz

- Sayılan tek şey **sonuçlanmış** rezervasyonlardır: "Sattım" ya da "Gelmedi"
  işaretlenmiş olanlar.
- **Bir şey satın almak seriyi sıfırlar.** İki kere gelmemiş biri üçüncüde
  gelip ürününü alırsa serisi bozulur, ceza almaz.
- **Vazgeçmek ne bozar ne sayılır.** "Ben almayacağım" demek ceza değildir
  (ürünü başkasına açar, dürüst davranıştır) — ama seriyi de temizlemez, yani
  "2 gelmedi biriktirdim, bir şey rezerve edip hemen vazgeçeyim de serim
  bozulsun" hilesi çalışmaz.
- Sıra, satıcının işaretlediği ana göre değil, **pazarın gerçekte yaşandığı
  haftaya** göre hesaplanır. Satıcı işaretlemeyi günler sonra yapsa bile sonuç
  adildir: mesela aradaki hafta bir şey satın aldıysanız, geç gelen "gelmedi"
  işareti seriyi tamamlayamaz.

**Örnek:** Mehmet 1. hafta gelmedi, 2. hafta gelmedi, 3. hafta gelip bir
kavanoz reçel aldı ("Sattım" işaretlendi). Serisi bozuldu — ceza yok, sayım
yeniden başlar. Ama Ayşe 3 hafta üst üste rezerve edip hiç gelmediyse, satıcı
3. "Gelmedi"yi işaretlediği **an** Ayşe'nin 1 haftalık yasağı başlar.

### Ceza başladığı anda ne olur

Üçüncü "Gelmedi" işaretlendiği an, üç şey birden olur:

1. Alıcı **1 hafta yeni rezervasyon yapamaz** (rezervasyon denediğinde hangi
   tarihe kadar bekleyeceği kendisine açıkça söylenir; ayrıca bildirim gider).
2. Alıcının **gelecek pazarlara ait bekleyen tüm rezervasyonları iptal
   edilir** — hangi tezgahta olursa olsun. "Elindekini önce alsın, ceza sonra
   başlasın" YOKTUR. İptal edilen her yerde sıradaki kişi (bekleme
   listesindeki ilk kişi) otomatik yükselir, kimse mağdur olmaz. İstisna:
   **başlamış bir pazara ait** kayıtlara dokunulmaz — ceza pazar günü içinde
   başlarsa alıcının o günkü rezervasyonları akşam satıcı tarafından normal
   yoldan sonuçlanır (belki gerçekten aldı, "Sattım" yazılacak), geçmiş
   haftadan kalmış işaretlenmemiş kayıtların hükmünü de satıcı verir (bkz.
   bölüm 3). Yasağın kendisi ertelenmez, o an başlar.
3. **Gelmedi sayacı sıfırlanır.** Yasak bitince kişi geçmişi silinmiş gibi
   temiz başlar; ödediği bedel yeniden başlamak için yeterlidir.

Yasak yalnızca **yeni rezervasyon yapmayı** engeller. Siteye girmek, geçmişi
görmek, değerlendirme yazmak, şikayet etmek serbesttir. Bu ceza, admin'in bir
kullanıcıyı platformdan tamamen yasaklamasıyla (kural ihlali gibi sebeplerle)
karıştırılmamalıdır — o ayrı ve daha ağır bir işlemdir. Yasak tek bir pazara
özel değildir: platformdaki **her** tezgah için geçerlidir.

### Satıcı yanlışlıkla "Gelmedi" işaretlerse

Satıcı işareti **geri alabilir** (bölüm 1'deki Geri Al). Geri alınan bir
"Gelmedi", o kişinin devam eden bir yasağı varsa **yasağı da otomatik
kaldırır** ve alıcıya haber verilir. Ancak ceza anında iptal edilmiş diğer
rezervasyonlar geri gelmez (yerlerine başkaları yükselmiş olabilir) — alıcı
yasağı kalktığı için hemen yeniden rezervasyon yapabilir, sadece sıradaki
yerini kaybetmiş olur. Bu bilinçli bir sadelik tercihidir: böyle bir durum
nadirdir ve mağdur alıcı satıcıya düşük puan/olumsuz yorum/şikayet ile
karşılık verebilir.

### Belediye/admin ne yapabilir?

- **Yasağı erken kaldırma (af):** Admin panelindeki "Yasağı Kaldır" düğmesi
  hem yasağı bitirir hem sayacı sıfırlar. Kayıtlar silinmez ("hiçbir kayıt
  kalıcı silinmez" ilkesi), sadece sayıma girmez. Af kalıcı muafiyet değildir
  — kişi yeniden üst üste 3 biriktirirse yeniden yasaklanır.
- **Yasaklıları görme:** Admin panelindeki "Güvenilirlik" sayfası **şu anda
  yasağı devam eden** alıcıları, yasağın biteceği tarihle birlikte listeler.
  (Listede olmak = şu an gerçekten rezervasyon yapamıyor; eski sürümdeki
  "listede var ama aslında yapabilir" karışıklığı kalktı.)
- **Ayarlar:** "Üst üste kaç gelmedi" eşiği 1–20 arası (varsayılan 3), yasak
  süresi 1–30 gün arası (varsayılan 7), bekleme listesi kapasitesi 0–50 arası
  (varsayılan 5) değiştirilebilir. Değişiklik anında geçerli olur.

---

## 3. Pazar Haftası Döngüsü

### İki önemli zaman noktası

Her pazarın (örneğin Seferihisar'da çarşamba günü) haftalık döngüsünde iki farklı an vardır:

- **Başlangıç anı:** Pazarın açıldığı gün ve saat. "Bu rezervasyonun hükmünü satıcı vermeli" denen kayıtlar (aşağıya bakın) bu ana göre belirlenir.
- **Kapanış/işlem-sonu anı:** Pazar gününün bittiği an. Sistemin o haftanın bekleyen kuyruğunu temizlediği andır.

### Hafta sonunda (kapanışta) bekleyen rezervasyonlara ne olur?

> Bu bölüm 2026-07-09'da değişti: **sistem artık hiçbir rezervasyonu kendi
> kendine "gelmedi" yazmaz.** "Gelmedi" kararını yalnızca satıcı verebilir.

Pazar kapandığında, hâlâ sonuçlanmamış rezervasyonlar için sistem şöyle davranır:

- **Pazar başlarken zaten aktif (tezgahtan alacak) durumda olan ve hâlâ işaretlenmemiş rezervasyonlar** → **dokunulmaz, satıcı beklenir.** Sistem "satıcı mı işaretlemeyi unuttu, alıcı mı gerçekten gelmedi" ayrımını yapamaz; bu belirsizlikten alıcının ceza alması kabul edilemez. Gerçeği bilen tek taraf satıcıdır: satıcı panele girdiğinde, bu bekleyen işaretlemeleri yapmadan başka hiçbir işlem yapamaz (panel kilitlenir), tezgahındaki tüm ürünler de vitrinde "Beklemede" görünür. Satıcı "Sattım" derse normal satış olur, "Gelmedi" derse ceza **o an** işlenir (3 gün boyunca hiç girmezse belediye/admin'e uyarı gider).

  **Örnek:** Fatma salı akşamı bir ürünü aktif olarak rezerve etti, çarşamba pazara gitmedi, satıcı da işaretlemeyi unuttu. Fatma'ya hiçbir şey OLMAZ — kayıt, satıcı girip karar verene kadar bekler. Satıcı cuma günü girip "Gelmedi" derse ceza sayacı o cuma işler.

- **Pazar başladıktan sonra sıraya giren ya da yükselen rezervasyonlar (örneğin gün içinde biri vazgeçtiği için bekleme listesinden aktife geçenler) ve hâlâ bekleme listesinde kalanlar** → **cezasız iptal** edilir. Mantık şu: bu kişiler pazar başladığında henüz "gelme sözü" vermiş değillerdi, o yüzden gelmemeleri onlara karşı kullanılmaz.

  **Örnek:** Elif, pazar öğlen saatlerinde bekleme listesinden aktife yükseldi ama pazar kapanana kadar tezgaha uğrayamadı. Bu rezervasyon iptal olur ama Elif'in güvenilirlik geçmişine hiçbir olumsuz kayıt işlenmez.

- **Zaten "sattım", "gelmedi" ya da "vazgeçti" olarak sonuçlanmış rezervasyonlara hiç dokunulmaz** — yani bir rezervasyon iki kere cezalandırılmaz.

### Ürün sonraki hafta nasıl başlar?

Kuyruk temizlendikten sonra, ürün stok olarak elde varsa yeniden "sergide" görünür ve **sıfırdan** başlar — önceki haftanın bekleme listesi sırası bir sonraki haftaya taşınmaz. Eğer ürün o hafta zaten tamamen satılmışsa, bu durum değişmez.

### İtiraz konusunda şimdilik bir not

"Haksız yere gelmedi yazıldı" diyen bir alıcı için iki çözüm yolu vardır: satıcı işaretini **Geri Al**abilir (bu, varsa devam eden rezervasyon yasağını da otomatik kaldırır — bkz. bölüm 2), ya da belediye/admin **"Yasağı Kaldır"** ile af verebilir. Yapılandırılmış bir itiraz formu/akışı şu an yoktur; ileride ihtiyaç görülürse eklenecektir.
