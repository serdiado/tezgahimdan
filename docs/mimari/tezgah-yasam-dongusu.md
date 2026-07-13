# Tezgah Yaşam Döngüsü — Duraklatma, Kalıcı Kapatma, Hesap Silme

> Kapsam (2026-07-13 kullanıcı kararları): **duraklatma UYGULANDI** (pilota
> girdi), **kalıcı kapatma PLANLANDI** (kural kilitlendi, pilotta kodlanmadı),
> **hesap silme admin-başvurulu olarak UYGULANDI**.

İlgili: [`satici-onboarding.md`](./satici-onboarding.md) (`gizliMi` ayrımı),
[`rezervasyon-motoru.md`](./rezervasyon-motoru.md) (slot boşaltma),
[`guvenilirlik-sistemi.md`](./guvenilirlik-sistemi.md) (`yasakSupurmesi` deseni),
[`haftalik-sifirlama.md`](./haftalik-sifirlama.md) (satıcı-ihmal etkileşimi).

## 1. Duraklatma (self-servis tatil modu) — UYGULANDI

**İhtiyaç:** Üretici bir hafta pazara gelemeyecek (hastalık, tatil). Bugüne
kadar tek çaresi admin'e haber vermekti.

**Alan:** `Magaza.duraklatildiMi` — `gizliMi`'den **bilinçli olarak ayrı**:
`gizliMi` admin moderasyonu (fren pedalı), bu satıcının kendi kararı. Ayrı
tutulmasa satıcı "devam ettir" ile admin gizlemesini açabilirdi.

**Etkileri:**
- Tüm listelerden düşer (ana sayfa ürün/mağaza, pazar sayfası, çapraz-mağaza
  şeritler) — `gizliMi` ile aynı filtre noktaları + `duraklatildiMi: false`.
- **Doğrudan `/magaza/[slug]` ziyareti 404 OLMAZ** (gizliMi'den fark): hero
  (WhatsApp + sosyal medya) görünür kalır + "ara verdi" notu; ürünler/yorumlar/
  rezervasyon gizli. Neden: iptal bildirimi alıcıyı tam buraya yönlendirir.
- Yeni rezervasyon kapanır: motor ön-kontrolü `magaza-duraklatilmis` döner
  (`magaza-gizli` ile aynı desen); API 409 "tezgah şu an ara verdi".
- **Takip listesinden DÜŞMEZ** (gizliMi'den ikinci fark — bilinçli): duraklatma
  geçici ve sayfası erişilebilir; takipçinin listesinden kaybolması kafa karıştırır.

**Bekleyen rezervasyonlar (kritik karar):** Duraklatma anında **cezasız iptal**
edilir + her alıcıya bildirim gider (kullanıcı kararı: bildirim, tezgah
sayfasına — WhatsApp düğmesinin olduğu yere — götürür ki "isteyen anında
ulaşabilsin"). Gelmedi sayacı/yasak mekanizması HİÇ devreye girmez (alıcı suçu yok).

- **Süpürme:** `magazaDuraklatmaSupurmesi` — `yasakSupurmesi`'nin mağaza-kapsamlı
  ikizi (2 turlu, ürün-başına `FOR UPDATE`, `doldu→sergide` bakımı, audit
  `rezervasyon_duraklatma_iptali`). Sıra önemli: **önce bayrak yazılır** (kapı
  kapanır), **sonra süpürülür** — yarış penceresindeki tekil kayıt 2. turda yakalanır.
- **Aynı istisna kuralı:** BAŞLAMIŞ pazarın (o gün devam eden / geçmiş haftanın
  işaretlenmemiş) kayıtlarına DOKUNULMAZ — hüküm satıcıda. Bunun kritik sonucu:
  **duraklatma, işaretleme sorumluluğundan kaçış yolu değildir** — zorunlu işlem
  ekranı (panel kilidi) duraklatmayla kapanmaz.
- **Yükselen bildirimi bilinçli YOK:** aynı mağazada zincirleme terfi eden yedek
  de aynı süpürmede iptal edileceği için "sıra sana geldi" yanıltıcı olurdu.

**UI:** Tezgah Ayarları'nda ayrı kart (form dışında, anında etkili; iki adımlı
satır-içi onay — `window.confirm` değil). Duraklatılmışken kart "Devam Ettir"e
döner; `/panel` ana sayfasında amber hatırlatma şeridi. Kurulum modunda
(tezgah yeni açıldıysa) kart gösterilmez.

## 2. Kalıcı kapatma — PLANLANDI (pilotta kodlanmadı)

**Kilitlenen kural (2026-07-13 kullanıcı kararı):** Satıcı kalıcı kapatma
isteği verdiğinde **bulunduğu pazarın kapanması beklenir** — son pazar yapılıp
işlemler tamamlandıktan sonra tezgah **sergiye kapanır**: kalıcı silme değil
**gizleme** (tezgah da ürünler de görünmez olur).

Uygulama günü notları:
- "Kapanış planlandı" ara durumu gerekir (yeni alan ör. `kapanisTalebiTarihi`);
  talep anında yeni rezervasyon muhtemelen kapanmalı, mevcutlar son pazar
  gününde normal akışla (satıldı/gelmedi) sonuçlanmalı, pazar işlem-sonu
  geçince gizleme uygulanmalı (haftalık sıfırlama cron'una doğal binme noktası).
- Mekanik olarak `silindiMi` DEĞİL (getOwnMagaza'yı keser, tek-aktif-magaza
  index'ini boşaltır → yeniden açılış davranışı düşünülmeli) — büyük ihtimalle
  `duraklatildiMi`'ye benzer kalıcı bir görünürlük bayrağı + satıcı panelinde
  "tezgahın kapalı" durumu. Tasarım turu uygulama gününe bırakıldı.
- Duraklatma varken aciliyeti düşük: "kapatmak isteyen çoğu kişi ara vermek ister."

## 3. Hesap silme — admin-başvurulu UYGULANDI (self-servis Faz 2+)

**Karar:** Self-servis silme YOK (e-posta doğrulama altyapısı + anonimleştirme
derinliği ister); kullanıcı **başvurur, admin siler**. KVKK sayfasında başvuru
yolu anlatılır (her zaman görünür, CMS metninden bağımsız).

**Mekanik ("hiçbir kayıt kalıcı silinmez" ile uyumlu):** `Kullanici.silindiMi=true`
+ **anonimleştirme**: `ad="Silinmiş Üye"`, `telefon/email/sifreHash/emailVerified=NULL`.
- Giriş engeli: `auth.ts` hem Credentials `authorize` hem Google `signIn`
  yolunda `silindiMi` kontrolü (anonimleştirme email'i boşalttığı için eşleşme
  zaten kopar — kontroller emniyet kemeri).
- Unique alanlar boşaldığı için aynı telefon/email ile **yeniden kayıt açılır**
  (KVKK'nın istediği "bağın kopması" tam olarak bu).
- Rezervasyon/değerlendirme satırları kalır ama anonim kullanıcıya işaret eder
  (değerlendirmelerde ad "Silinmiş Üye" görünür).
- **Korumalar** (`/api/admin/kullanici-sil`): kendi hesabı silinemez, admin
  hesabı bu yoldan silinemez (tek-admin-kalma riski), **aktif tezgahı olan
  kullanıcı silinemez** (önce tezgah kaldırılmalı — bekleyenler oradan düzgün kapanır).
- Geri dönüşü YOK (kişisel veri anonimleştirildiği için) — admin UI iki adımlı
  onayda bunu açıkça söyler.
