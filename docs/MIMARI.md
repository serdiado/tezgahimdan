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

## Bilinen kısıtlar (deploy öncesi gözden geçirilecek — tüm proje geneli)

- **Rate-limit yok:** SMS doğrulaması gelene kadar, sahte numaralarla kuyruk doldurulabilir. Deploy öncesi en azından IP bazlı limit değerlendirilmeli.
- **Telefonla mevcut rezerv kodu ifşası:** Aynı telefonu tekrar giren biri, o numaranın mevcut kodunu görüyor. SMS doğrulamasıyla kendiliğinden kapanır.
- **Yükselen yedeğe bildirim yok:** Yedekten aktife yükselen kişiye şu an bildirim gitmiyor — no-show riskini artırır, bildirim/SMS fazında ele alınacak.
- **Satıcı kendi ürününe rezervasyon yapabiliyor:** Şu an engellenmiyor, kural tanımsız.
- **Stok sonradan düşürülürse:** Mevcut aktif rezervasyon sayısı yeni stoktan büyük kalabilir. Ürün düzenleme akışı yazılırken ele alınacak.
- **Geri alma redlerinin doğası:** Geri alma redleri (`DurumGecmisi`'ndeki `geri_alma_reddedildi` kayıtları) kalıcı (gerçekten dolu/satıldı) ya da yarış kaynaklı geçici olabilir. Admin paneli bu kayıtları listelerken bu ayrımı yapmalı.
