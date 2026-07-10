# Çoklu Pazar ve Çoklu Gün — Planlanan Mimari Karar

> **DURUM: PLANLANMIŞ — HENÜZ UYGULANMADI.** Bu dosya, ileride (pilot sonrası
> büyüme fazında) yapılacak bir revizyonun kararlarını sağlama almak için
> yazıldı. Bugünkü sistem hâlâ "pazar başına haftada tek gün" varsayımıyla
> çalışıyor ve Seferihisar pilotu için doğru. Uygulama zamanı geldiğinde bu
> dosya üzerinde tekrar ayrıntılı bir tasarım turu yapılacak; aşağıdakiler
> yön ve ilkelerdir, nihai şema/kod değil.

İlgili: [`rezervasyon-motoru.md`](./rezervasyon-motoru.md),
[`guvenilirlik-sistemi.md`](./guvenilirlik-sistemi.md),
[`haftalik-sifirlama.md`](./haftalik-sifirlama.md).

## 1. Sorun

Motorun tamamı **bir pazarın haftada TEK gün kurulduğu** varsayımına dayanıyor:
`Pazar.baslangicGunu/sifirlamaGunu/islemSonGunu/hatirlatmaGunu` hepsi tek
`HaftaGunu`; `Rezervasyon.pazarHaftasi` "bir sonraki tek sıfırlama tarihi";
gelmedi/sıfırlama/satıcı-işaretleme hep bu tek güne göre. Gerçek dünyada iki
ihtiyaç bunu zorluyor.

## 2. Netleşen iki gerçek dünya kalıbı

**A — Çok pazar, farklı günler (satıcı birden çok pazarda):** Seferihisar'da
tezgahı olan bir üretici, başka bir gün Sığacık pazarında da tezgah açabilir.
Bugün engelli: bir satıcının **tek aktif tezgahı** olabilir (partial unique
index, `sahipId` + `silindiMi=false`) ve tezgah **tek pazara** bağlı
(`magaza.pazarId` tekil).

**B — Tek pazar, çok gün (aynı yerde birden çok gün):** Bazı belediyeler aynı
yerde haftada 2 gün pazar kuruyor; Eskişehir'de üretici kadınlar aynı yerde
haftanın 7 günü tezgah açabiliyor.

> Not: "her gün pazar" burada **aynı pazarın birden çok günü** olarak
> modellenir (B), farklı bir ürün modu (sürekli dükkân) olarak değil. Satıcının
> her akşam işaretleme yükü (zorunlu işlem ekranı her occurrence'da tetiklenir)
> kabul edilen bir sonuç — kullanıcı kararı: "burada mantık hatası yok".

## 3. Kilitlenen kararlar (özet)

1. **Ceza kapsamı GLOBAL:** gelmedi tüm pazarlar üzerinden tek sayaçta birikir;
   yasak "sistemde rezervasyon yapamama"dır (başka şehirdeki pazardan bile).
2. **Sayım yöntemi:** üst üste 3 gelmedi → süreli yasak (mevcut model korunur;
   oran'a geçilmez — açıklanabilirlik + minimum-örnek gerekçesiyle).
3. **Magaza modeli:** tek marka, çoklu pazar; merkezden yönetilir (ayrı Magaza
   kayıtları değil).
4. **Ürün:** tek katalog + "hangi pazarlarda satılsın" etiketi (Ürün↔Pazar).
5. **Stok:** tek ORTAK havuz (pazar-başına ayrı değil).
6. **Tezgah Ekle:** self-servis (satıcı ikinci pazarını kendi aktive eder).
7. **Kuyruk sırası:** occurrence (erken pazar) önceliği + geç pazar baştan
   yedek, kapanışta terfi (aşağıda ayrıntılı).

## 4. Ceza modeli — zaten karşılanıyor

Kararlar 1-2, **mevcut gelmedi-yasağını hiç değiştirmiyor**: yasak
`Kullanici.rezervasyonYasagiBitisi`'nde (global), sayaç `aliciId` bazlı (pazar
sınırı taşımıyor, bkz. `guvenilirlik-sistemi.md`). Çok-pazarlı dünyada üst
üste-3 doğru çalışır: sayaç tüm pazarların sonuçlanmış kayıtlarını tarih
sırasına dizer, araya giren bir "satıldı" (başka şehirde bile) seriyi bozar.
Oran ise yalnızca **satıcıya gösterilen güvenilirlik göstergesi** olarak kalır
("x/y aldı" rozeti), ceza tetiği değil.

## 5. Veri modeli (hedef)

- **Magaza ↔ Pazar: çoka-çok.** Satıcının tek markası birden çok pazarda
  "aktif" olur (Tezgah Ekle). "İki tezgah" kullanıcının zihinsel modeli; teknik
  karşılığı "tek marka, iki pazarda görünür". "Tek aktif magaza" partial unique
  index'i bu modele göre yeniden düşünülür.
- **Ürün TANIMI paylaşılır** (baslik, aciklama, fiyat, foto, kategori) +
  **Ürün ↔ Pazar etiketi** (hangi pazarlarda satılsın; ürün eklerken seçilir).
- **Stok TEK ORTAK HAVUZ.** Aynı ürün her pazarda aynı stok/kuyruk sayılarını
  gösterir (kuyruk sayıları zaten ürün-başına, `kuyrukSayilariHaritasi` — kutudan
  çıkar). Bir pazarda yapılan rezervasyon diğerinde de sayacı düşürür. Fiziksel
  gerçeklik: aynı mal aynı anda iki yerde olamaz; tek parti, ilk hak eden alır.
- **Rezervasyon `pazarId` + occurrence taşır (ZORUNLU EKLEME).** Bugün rezervasyon
  pazarı ürün→mağaza→pazar (tek) üzerinden buluyor. Çok pazara yayılan ortak
  stokta, satıcının o günkü tezgahında **hangi rezervasyonlar bu occurrence'a
  ait** bilmesi için rezervasyona açık `pazarId` + occurrence günü eklenir.
  (`pazarHaftasi` zaten `@db.Date` — spesifik occurrence tarihini taşıyabiliyor.)

## 6. Çok-günlü motor

- **`Pazar.acikGunler`**: tek gün yerine gün SETİ (admin pazar açarken tik
  listesiyle seçer). Saatler (başlangıç/kapanış/işlem-sonu/hatırlatma) her açık
  gün için aynı varsayılır.
- **`sonrakiSifirlamaTarihi`**: "tek günden sonraki" yerine "açık günler
  kümesinden en yakını"nı hesaplar (tek fonksiyonda kapalı değişiklik).
- **Sıfırlama/süpürme occurrence bazına**: iyi haber — mevcut süpürme zaten her
  rezervasyonun kendi işlem-sonu anını kontrol ediyor (`pazarIslemSonAni(pazar,
  rez.pazarHaftasi)`), yani ortak kuyrukta Çarşamba kayıtlarını süpürüp
  Cumartesi'yi atlayabilir. "doldu/sergide" ve "tükendi" geçişleri ortak kuyrukta
  dikkatli hesaplanmalı.

## 7. Ortak stok + occurrence-öncelikli kuyruk (ASIL KARAR)

Ortak stok + farklı günlerde kurulan pazarlar, kuyruk sıralamasında tek gerçek
gerilimi doğurur. Çözüm kuralı:

> **Erken kurulan pazar (occurrence) asil VE yedekleri önce alır; geç pazarın
> tüm rezervasyonları baştan YEDEK başlar. Erken pazar kapanıp satıcı
> "Sattım/Gelmedi" işaretlediğinde stok kaldıysa, geç pazarın yedeklerinin ilk
> sırası asile TERFİ eder (kaskad).**

- **Sıralama ölçütü:** (occurrence günü ASC, sonra rezervasyon zamanı ASC).
  Yani erken pazarın SONRA rezerve edeni bile, geç pazarın ÖNCE rezerve edeninin
  önündedir. Kullanıcı kararı: fiziksel olarak önce kurulan pazar ilk hakkı alır;
  geç pazarı seçen bunu bilerek seçer.
- **Neden bu, "occurrence+zaman'a göre global sırala"dan iyi:** o alternatif,
  geç pazardaki bir asili, erken pazardan sonradan gelen bir rezervasyon
  yüzünden asillikten yedeğe DÜŞÜRÜRDÜ (sürpriz mağduriyet). Bu kuralda geç
  pazar baştan yedek başlar, **sadece yukarı çıkar; kimse düşmez.**
- **"Boş asil slotu" ile kayıp yok:** erken pazar stoktan az rezerve etmişse
  (ör. stok=3, Çarşamba'da 2 kişi), kalan mal boşa gitmez — kapanışta geç
  pazarın yedekleri asile terfi eder ve satılır.
- **Motor sonucu:** bugün "asil önce dolar, sonra yedek" (global) mantığı,
  "asil slotları erken pazar için ayrılır; terfi her occurrence kapanışında
  zincirleme" haline gelir. `aktifSlotBosalt` yükseltme mantığının
  occurrence-farkındalıklı versiyonu.

### Örnek (stok=1)
- R1 Pazartesi rezerve → market B (Cumartesi, geç).
- R2 Salı rezerve → market A (Çarşamba, erken).
- Sıra: R2 (erken) asil#1, R1 (geç) yedek#1.
- Çarşamba: satıcı R2'ye satar (hazır alıcı, mal boşta beklemez). satıldı → tükendi
  → R1 iptal ("tükendi" bildirimi gider). Ya da R2 gelmedi → stok 1 kalır, R1
  asile terfi → Cumartesi alır.

### Örnek (stok=3, erken pazar az doldu)
- Çarşamba (erken): R1, R2 (2 asil). Cumartesi (geç): R3, R4, R5 (hepsi yedek).
- Çarşamba: R1, R2 satıldı → satıldı=2, 1 mal kaldı. Kapanışta R3 (yedek#1)
  asile terfi. Cumartesi: R3 alır. Toplam 3 satıldı, kayıp yok.

### Şart: şeffaflık
Geç pazar sayfasında rezervasyon anında alıcı **"bu ürün daha erken kurulan bir
pazarda da satılıyor; o pazar öncelikli, yedek sırasına gireceksin"** uyarısını
görmeli. Uyarı varsa kural tam adil; yoksa "asil slot boş görünüyordu ama yedek
oldum" şaşkınlığı olur.

## 8. Alıcı occurrence seçimi (UX)

- **Çok pazar (A):** alıcı zaten hangi pazar sayfasındaysa o pazara rezerve eder
  — **ekstra seçici gerekmez** (occurrence = bulunduğu pazar sayfası).
- **Tek pazar çok gün (B):** alıcı tek pazardadır ama Çarşamba/Cumartesi seçmeli
  → **küçük bir gün seçici** gerekir. Sürtünme sadece burada (kutsal kural
  gerginliği; 2-3 gün için hafif, 7 gün için biraz daha ağır).

## 9. Self-servis Tezgah Ekle

Admin pazarı **tanımlar** (A ve B ikisinde de). Satıcı, "Tezgah Ekle"
bölümünden admin'in tanımladığı başka bir pazarı **kendi aktive eder** (ör.
"Urla pazarını da aktif et"). Ürünlerini eklerken/düzenlerken "hangi pazarlarda
satılsın" seçer. Kötüye kullanım/kalite endişesi olursa admin-onaylı bir varyant
düşünülebilir, ama varsayılan self-servis (WhatsApp-basitliği).

## 10. Açık / ertelenen maddeler

- **Stok tazeleme (mevcut, keskinleşen):** stok=3 satıldıysa `durum='satildi'`
  kalıcı; haftalık tekrarlanan pazarda satıcı gelecek hafta için stoğu nasıl
  yeniler? Bugün de var olan bir soru (bkz. `rezervasyon-motoru.md` "stok
  sonradan düşürülürse"), ortak stok + çok occurrence bunu daha görünür yapıyor.
- **Ceza kadansı hissi:** üst üste-3 günlük pazarda takvimde hızlanır (3 gün);
  kullanıcı "nadir + her şartta adil" diyerek kabul etti, ama pilot verisiyle
  yeniden bakılabilir.
- **"Tek aktif magaza" index'i:** çoka-çok modele geçerken bu kısıt yeniden
  tasarlanmalı (satıcı hâlâ tek MARKA ama çok pazar).

## 11. Uygulama notu

Pilot (Seferihisar, haftalık) bu revizyonu İÇERMEZ. Test edilmiş mevcut motor
korunur. Uygulama fazına gelindiğinde: (1) bu dosya üzerinde ayrıntılı tasarım
turu, (2) şema + migration (Magaza↔Pazar, Urun↔Pazar, Rezervasyon.pazarId,
Pazar.acikGunler), (3) motorun occurrence-farkındalıklı hale getirilmesi
(sıralama + terfi + süpürme), (4) UI (admin gün seçimi, Tezgah Ekle, ürün pazar
etiketi, alıcı gün seçici + geç-pazar uyarısı), (5) her adımda psql ile bağımsız
doğrulama — mevcut çalışma tarzıyla.
