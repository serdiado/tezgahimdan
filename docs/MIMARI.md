# Mimari Kararlar — Tezgahımdan

Bu dosya bir **indeks**: projedeki büyük mimari kararların kısa özeti ve nerede detaylandırıldığı. "Neden böyle yapıldı" sorusunun kısa cevabı burada, tam cevap ilgili detay dosyasında (`docs/mimari/` altında).

Yeni bir mimari karar alındığında (özellikle eşzamanlılık, veri bütünlüğü, ölçeklenme gibi geri dönüşü zor kararlarda):
1. Konuya özel bir detay dosyası aç (`docs/mimari/<konu-adi>.md`)
2. Bu dosyaya 3-5 satırlık bir özet + link ekle

---

## Rezervasyon motoru (kilit + kuyruk + kullanıcı/satıcı akışları)

Pesimistik satır kilidi (`SELECT ... FOR UPDATE`) ile aktif+yedek kuyruğu yönetimi. Eşzamanlılık riski en yüksek bölüm. Aynı kilit dört akışı serileştirir: **rezervasyon oluştur** (8 paralel istekle test), **Vazgeç** (alıcı), **Satıldı/Gelmedi** (satıcı), **Geri Al** (satıcı yanlış işaretlemeyi geri alır). Satıldı stok-tutarlı: her satış bir birim tüketir, kapasite `stok − satıldı` üzerinden (INVARIANT: `aktif ≤ stok − satıldı`, fazla-satış imkânsız). Geri Al iki durumda reddedilir (`urun_satildi` / `kapasite_dolu`), red nedeni `DurumGecmisi`'ne yazılır.

→ Detay: [`docs/mimari/rezervasyon-motoru.md`](./mimari/rezervasyon-motoru.md)

**Bilinmesi gereken bağımlılık:** Ürünü `doldu` durumuna çeviren tek yer bu akış. Slot boşaltan her yeni özellik (Vazgeç ✓, Gelmedi ✓, haftalık sıfırlama ✓, admin müdahalesi) `doldu → sergide` geri dönüşünü yapmayı unutmamalı.

---

## Haftalık sıfırlama (otomatik)

Pazar kapanışında o pazarın bekleyen kuyruğunu **tamamen temizler** (rezervasyon motoruyla **aynı** `FOR UPDATE` kilidi, ama davranış ayrı — motor yükseltir, sıfırlama temizler). No-show cezası pazar **başlangıç** eşiğine göre: `aktifOlmaZamani < pazarBaslangicAni` olan (başlangıçta zaten aktif) + satılmamış → `gelmedi`; sonradan yükselen + yedekler → cezasız `iptal`; `satildi` dokunulmaz. Harici cron + korumalı API (`/api/cron/pazar-sifirlama`), duruma-bakan (restart'ta kaçmaz), idempotent (`PazarSifirlama` tablosu + durum-bazlı). No-show olayları puan sistemine `rezervasyon_gelmedi:otomatik:%` formatında hazır.

→ Detay: [`docs/mimari/haftalik-sifirlama.md`](./mimari/haftalik-sifirlama.md)

---

## Satıcı onboarding (self-servis + moderasyon)

"Mağaza Aç" ile bir kişi **anında** satıcı olur (admin onayı yok): `magazaAc()` tek
transaction'da mağazayı açar + `alici→satici` terfi eder + `DurumGecmisi`'ne
`magaza_olusturuldu` izi bırakır. Kalite denetimi sonradan **`gizliMi`** bayrağıyla:
admin mağazayı vitrinsen gizler. `gizliMi`, `silindiMi`'den **ayrı** tutulur — çünkü
`silindiMi` hem `getOwnMagaza`'yı filtreler (satıcı erişimini keser) hem de
tek-aktif-mağaza unique index'i yüzünden gizlenen satıcının ikinci mağaza açmasına yol
açardı. `gizliMi` ayrıca yeni rezervasyonu da kapatır (mevcut bekleyenlere dokunmadan).
Rol JWT'de bayat kalabildiği için (aynı oturumda terfi) yetki `getSaticiSession` içinde
**DB'den** okunur.

→ Detay: [`docs/mimari/satici-onboarding.md`](./mimari/satici-onboarding.md)

**İleri referans:** Ana Sayfa çok-mağaza vitrini kurulunca `gizliMi` filtresi oraya da
eklenmeli (bugün yalnız `getMagazaBySlug` filtreliyor).

---

## Mağaza takibi + fiyat düşüşü bildirimi + en çok beğenilenler vitrini

Favori/Beğeni sisteminin 3 küçük genişlemesi. **Mağaza takibi**: `UrunFavori`'yi
genişletmek yerine ayrı `MagazaTakip` tablosu (farklı hedef varlık, `begeniMi`
karşılığı yok — genişletmek her mevcut favori sorgusunu "urunId null olabilir"
ihtimaline karşı gözden geçirmeyi gerektirirdi). **Fiyat düşüşü**: yeni fonksiyon
yok, mevcut `bildirimGonderTakipcilere` yeniden kullanıldı, karşılaştırma motor
kilidi DIŞINDA. **En çok beğenilenler**: Prisma'nın resmi desteklediği
`groupBy`+`orderBy:{_count}` ile sıralama, görünürlük filtresi ayrı bir
`Urun.findMany`'de uygulanıyor (test: gizli mağazanın çok-beğenilen ürünü
vitrinde çıkmıyor). Üçü de rezervasyon motoruna HİÇ dokunmuyor.

→ Detay: [`docs/mimari/magaza-takip.md`](./mimari/magaza-takip.md)

---

## Değerlendirme/yorum sistemi

PLAN.md'nin bilinçli Faz-2 ertelemesiydi. Kullanıcı kararı: **SADECE gerçekten
satın alan** (`Rezervasyon.durum="satildi"` VE `aliciId`=kullanıcı) değerlendirme
bırakabilir — bu kural DB'de zorlanmaz, API katmanında salt-okunur
`Rezervasyon.findFirst` ile doğrulanır (motora hiç çağrı yok). Puan/yorum
SONRADAN güncellenebilir (upsert, tek satır — begeni/takip toggle'ıyla aynı
mantık). "Değerlendir" butonu bilinçli olarak `/rezervasyonum`'da (ürün
kartında değil) — satın-alma kontrolü o sayfada zaten bedava, karta koymak
her render'da gizli bir yetki sorgusu gerektirirdi.

→ Detay: [`docs/mimari/degerlendirme-sistemi.md`](./mimari/degerlendirme-sistemi.md)

---

## Bilinen kısıtlar (deploy öncesi gözden geçirilecek — tüm proje geneli)

- **Rate-limit yok:** Deploy öncesi en azından IP bazlı limit değerlendirilmeli. (KP-1 üyelik zorunluluğuyla sahte-numarayla kitle rezervasyonu riski büyük ölçüde azaldı — rezervasyon için hesap gerekir; yine de rate-limit tamamen ikame etmez.)
- **~~Telefonla mevcut rezerv kodu ifşası~~ (KP-1 ile kapandı):** Kod+telefon arama (`/api/rezervasyon/sorgula`) kaldırıldı; kullanıcı yalnız giriş yapıp kendi rezervasyonlarını görür.
- **Yükselen yedeğe bildirim yok:** Yedekten aktife yükselen kişiye şu an bildirim gitmiyor — no-show riskini artırır, bildirim/SMS fazında ele alınacak.
- **Satıcı kendi ürününe rezervasyon yapabiliyor:** Şu an engellenmiyor, kural tanımsız.
- **Stok sonradan düşürülürse:** Mevcut aktif rezervasyon sayısı yeni stoktan büyük kalabilir. Ürün düzenleme akışı yazılırken ele alınacak.
- **Geri alma redlerinin doğası:** Geri alma redleri (`DurumGecmisi`'ndeki `geri_alma_reddedildi` kayıtları) kalıcı (gerçekten dolu/satıldı) ya da yarış kaynaklı geçici olabilir. Admin paneli bu kayıtları listelerken bu ayrımı yapmalı.
- **Kategori kaldırma ile eşzamanlı ürün ekleme (kapanmamış milisaniyelik pencere):** `urun-ekle`/`urun-duzenle` artık gönderilen kategoriyi kilitsiz okuyup `silindiMi` kontrol ediyor (AP-4 sonrası); admin bir kategoriyi *tam bu okumadan hemen sonra* kaldırırsa nadir bir yarış hâlâ mümkün — kabul edilebilir risk (kategori kaldırma nadir bir admin eylemi).
