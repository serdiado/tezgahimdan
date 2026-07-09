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

### Bu bir "puan" değil, o anki canlı bir sayım

Sistemde kimsenin bir yerde saklanan "güven puanı" yoktur. Bunun yerine, her rezervasyon denemesinde sistem şu soruyu **o anda yeniden** sorar: *"Bu kişi daha önce kaç kere 'gelmedi' olarak işaretlendi?"* Bu sayı hiçbir yerde kalıcı olarak tutulmaz, sadece o anki karar için hesaplanır.

### Neyin geçmişi kötü etkilediği, neyin etkilemediği

- **Kötü etkileyen tek şey:** Bir rezervasyonun **"gelmedi"** olarak işaretlenmesi — ister satıcı elle işaretlesin, ister pazar günü sona erip de hâlâ elinde bekleyen aktif bir rezervasyon varsa sistem bunu otomatik olarak "gelmedi" yazsın (bkz. bölüm 3).
- **Hiçbir olumsuz etkisi olmayan şeyler:**
  - **Vazgeçmek** ("Ben almayacağım" demek) — bu bir ceza değildir, geçmişe hiç işlenmez.
  - **Satın almak** ("Sattım" işaretlenmesi) — bu, geçmişteki "gelmedi" sayısını **azaltmaz**. Yani bir kişi 10 kere ürün alsa bile, geçmişteki "gelmedi" sayısı hâlâ aynı şekilde sayılmaya devam eder. İki şey birbirinden bağımsızdır.

**Örnek:** Mehmet, geçmişte 3 kere "gelmedi" yazıldı. Aradan zaman geçti, Mehmet 5 farklı üründen düzgünce alışveriş yaptı. Bu 5 alışveriş, eski 3 "gelmedi" kaydını **silmez veya azaltmaz** — o 3 kayıt hâlâ oradadır.

### 3 "gelmedi" sonrası ne olur — tam bir yasak mı?

Varsayılan eşik değeri **3**'tür (belediye/admin bu sayıyı isterse değiştirebilir). Ama eşiği geçmiş olmak tek başına yeterli değildir — kısıtlamanın devreye girmesi için **iki şartın birden** sağlanması gerekir:

1. Kişinin "gelmedi" sayısı eşiğe ulaşmış veya geçmiş olmalı, **VE**
2. Kişinin **o an elinde** hâlâ bekleyen bir aktif rezervasyonu (henüz sonuçlanmamış, "tezgahtan alacağım" statüsünde bir siparişi) olmalı.

Bu ikinci şart sağlanmıyorsa — yani kişinin elinde hiç bekleyen rezervasyon yoksa — geçmiş "gelmedi" sayısı 3'ü çoktan geçmiş olsa bile, **yeni rezervasyon yapabilir.**

**Örnek:** Ahmet'in geçmişte 3 "gelmedi" kaydı var ve elinde şu an bir aktif rezervasyon duruyor. Yeni bir ürüne rezervasyon yapmaya çalışırsa, sistem ona önce elindeki rezervasyonu tamamlaması gerektiğini bildirir ve yeni rezervasyona izin vermez. Ama Ahmet o rezervasyondan vazgeçerse (ya da satıcı onu sonuçlandırırsa), o andan itibaren — 3 "gelmedi" kaydı hâlâ orada dursa bile — Ahmet yeniden rezervasyon yapabilir.

Bu kısıtlama sadece **yeni rezervasyon yapmayı** engeller. Kişinin siteye girmesi, mevcut rezervasyonlarını görmesi, vazgeçmesi, değerlendirme yazması gibi hiçbir şeyi etkilemez. Ayrıca bu, admin'in bir kullanıcıyı platformdan tamamen yasaklaması (kural ihlali gibi sebeplerle) ile **karıştırılmamalıdır** — o tamamen ayrı, daha ağır bir işlemdir.

Son olarak: bu kısıtlama tek bir pazara veya tezgaha özel değildir. Bir tezgahta biriken "gelmedi" geçmişi, kişinin platformdaki **her** tezgahtaki rezervasyon hakkını etkiler.

### Kısıtlama nasıl kalkar?

İki yol vardır:

1. **Kendiliğinden:** Yukarıda anlatıldığı gibi, kişi elindeki bekleyen rezervasyonu bitirdiği (alıp veya vazgeçtiği) an, kısıtlamanın ikinci şartı ortadan kalkar ve tekrar rezervasyon yapabilir hale gelir. Bu bir "silme" değildir — geçmiş kayıt hâlâ durur, sadece o an kapı açıktır.
2. **Belediye/admin sıfırlaması:** Admin panelinde bir "Güvenilirliği Sıfırla" düğmesi vardır. Buna basıldığında, o kişinin **o tarihten önceki** "gelmedi" kayıtları artık sayılmaz hale gelir (kayıtlar silinmez, projenin "hiçbir kayıt kalıcı silinmez" ilkesi gereği sistemde saklı kalır, ama sayıma dahil edilmezler). Bu sıfırlama **kalıcı bir muafiyet değildir** — sıfırlama tarihinden sonra kişi yeniden "gelmedi" biriktirmeye başlarsa, eşik yine aşılabilir ve kısıtlama tekrar devreye girer.

### Admin ekranındaki listeyle ilgili önemli bir not

Belediye/admin panelindeki "Güvenilirlik" listesi, eşiği aşmış olan **herkesi** gösterir — ama bu, listede gördüğünüz herkesin **şu anda** rezervasyon yapamadığı anlamına gelmez. Yukarıda anlatıldığı gibi, kısıtlamanın gerçekten devrede olması için kişinin elinde bekleyen bir rezervasyon da olması gerekir; liste bu ikinci şartı ayrıca göstermez. Yani listede bir isim görmek, "bu kişi şu an rezervasyon yapamıyor" anlamına gelmeyebilir — sadece "bu kişinin geçmişte eşiği aşan bir gelmedi sayısı var" anlamına gelir.

### Eşik değeri değiştirilebilir mi?

Evet. Varsayılan olarak 3'tür, ama belediye/admin bunu ayarlar ekranından 1 ile 20 arasında bir değere değiştirebilir. Aynı ayarlar ekranından, bölüm 1'de anlatılan bekleme listesi kapasitesi (varsayılan 5 kişi) de 0 ile 50 arasında bir değere değiştirilebilir. Değişiklik yapıldığı anda, bir sonraki rezervasyon denemesinden itibaren yeni değerler geçerli olur — ayrıca bir işlem gerekmez.

---

## 3. Pazar Haftası Döngüsü

### İki önemli zaman noktası

Her pazarın (örneğin Seferihisar'da çarşamba günü) haftalık döngüsünde iki farklı an vardır:

- **Başlangıç anı:** Pazarın açıldığı gün ve saat. Kimin "gelmedi" cezası alacağına bu an göre karar verilir.
- **Kapanış/sıfırlama anı:** Pazar gününün bittiği an. Sistemin o haftanın bekleyen kuyruğunu temizlediği andır.

### Hafta sonunda (kapanışta) bekleyen rezervasyonlara ne olur?

Pazar kapandığında, hâlâ sonuçlanmamış (ne "sattım" ne "gelmedi" ne "vazgeçtim" denmiş) rezervasyonlar için sistem otomatik bir temizlik yapar. Bu temizlik iki farklı sonuç doğurur:

- **Pazar başlarken zaten aktif (tezgahtan alacak) durumda olan ve satılmamış rezervasyonlar** → otomatik olarak **"gelmedi"** yazılır. Bu, güvenilirlik geçmişine işlenen bir cezadır — tıpkı satıcının elle "Gelmedi" işaretlemesi gibi.

  **Örnek:** Fatma, salı akşamı bir ürünü aktif olarak rezerve etti. Çarşamba pazar açıldı, Fatma pazara gitmedi ve satıcı da onu elle işaretlemeyi unuttu. Pazar kapanınca sistem bunu otomatik olarak "gelmedi" yazar — Fatma'nın güvenilirlik geçmişine ceza olarak işlenir.

- **Pazar başladıktan sonra sıraya giren ya da yükselen rezervasyonlar (örneğin gün içinde biri vazgeçtiği için bekleme listesinden aktife geçenler) ve hâlâ bekleme listesinde kalanlar** → **cezasız iptal** edilir. Mantık şu: bu kişiler pazar başladığında henüz "gelme sözü" vermiş değillerdi, o yüzden gelmemeleri onlara karşı kullanılmaz.

  **Örnek:** Elif, pazar öğlen saatlerinde bekleme listesinden aktife yükseldi ama pazar kapanana kadar tezgaha uğrayamadı. Bu rezervasyon iptal olur ama Elif'in güvenilirlik geçmişine hiçbir olumsuz kayıt işlenmez.

- **Zaten "sattım", "gelmedi" ya da "vazgeçti" olarak sonuçlanmış rezervasyonlara hiç dokunulmaz** — yani bir rezervasyon iki kere cezalandırılmaz.

### Ürün sonraki hafta nasıl başlar?

Kuyruk temizlendikten sonra, ürün stok olarak elde varsa yeniden "sergide" görünür ve **sıfırdan** başlar — önceki haftanın bekleme listesi sırası bir sonraki haftaya taşınmaz. Eğer ürün o hafta zaten tamamen satılmışsa, bu durum değişmez.

### İtiraz konusunda şimdilik bir not

Otomatik "gelmedi" cezaları, belediye/admin tarafından görülebilir durumdadır. Ancak şu an için, bir alıcının "haksız yere gelmedi yazıldı" itirazını admin panelinden tek işlemle geri almak mümkün değildir; bu, ileride eklenmesi planlanan bir özelliktir. Böyle bir durumla karşılaşılırsa, çözüm şimdilik yukarıda anlatılan güvenilirlik sıfırlama yoluyla (bölüm 2) sağlanabilir.
