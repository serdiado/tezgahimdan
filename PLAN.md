# Tezgahımdan — Proje Planı (v5)

## 0. Marka

**Platform adı: Tezgahımdan** (alan adı: tezgahimdan.com)
**Slogan / alt başlık:** "Üreten Kadın'ın Tezgahı"

İsim, satıcının ağzından çıkan sıcak ve kişisel bir ifadeyi ("tezgahımdan") taşırken sistemin işleyişini de anlatır: ürün doğrudan satıcının tezgahından geliyor. Tek bir şehir/pazara bağlı olmadığı için ulusal büyüme planıyla uyumludur. Yedek/ikincil alan adı olarak `pazarimkapida.com` düşünülebilir (ileride online satış/kargo fazında kullanılabilir).

**Ana renk: Mercan-pembe** (`#F0517E` civarı). Sıcak, samimi ve davetkâr; el emeği ürünlerin (takı, örgü, reçel) duygusuyla en uyumlu bulunan seçenek. Kategoriler kendi (serin tonlu) renklerini korur, zemin beyaz/nötr kalır. Vitrin mockup'larında bu palet doğrulandı; satıcı paneli ve admin panelinde de aynı ana renk kullanılacak, satıcı panelinde sadelik önceliklidir.

---

## 1. Amaç ve Kutsal Kural

Yerel üreticilerin evde yapıp pazarda sattıkları el yapımı ürünleri (takı, toka, örgü, reçel…) sergiledikleri, **herkesin kendi mağazasının olduğu**, kullanımı **WhatsApp'ta paylaşım kadar basit** bir web sitesi.

**Kutsal kural:** WhatsApp'tan zor hiçbir şey eklenmez. "Resmini çek → fiyatını yaz → gönder" sadeliğini bozan özellik ya girmez ya sonraki faza kalır.

Kullanıcılar teknolojiyle çok haşır neşir olmayabilir; arayüz sade ve anlaşılır tutulur (tarayıcıda açılır, indirme yok; net butonlar; kritik işlemde tek onay). Abartmadan.

---

## 2. Roller ve Ekranlar

**Roller:** **Satıcı** (mağaza açar, ürün ekler) · **Üye/Alıcı** (üye olur, rezerve eder) · **Admin** (her şeyi yönetir). İleride: **Pazar Sorumlusu** (§7 temel).

### A. Vitrin (herkese açık web)
- **Mağaza sayfası** — paylaşılabilir link; büyüme motoru
- **Kategoriye göre gezinme**
- **Ürün sayfası** — foto, fiyat, açıklama, satıcı, kalan durum
- **Rezerve Et** — dolu ise (stok + 5) kapanır
- **Haftalık ritim ana sayfası** — "pazara X gün kaldı" geri sayımı, "bu hafta yeni eklenenler", "bu çarşamba pazarda" vurgusu
- Her ürün/mağazada **"Şikâyet et"** bağlantısı (admine gider)

### B. Satıcı Paneli
- Basit giriş; mağaza bilgisi (bir **pazara** bağlı)
- **Ürün Ekle** — foto → kategori → fiyat → **stok adedi** (vars. 1) → açıklama → Gönder
- **Ürünlerim** — Sergide / Doldu / Satıldı
- **Gelen rezervasyonlar** — sıra görünür; her alıcının **güvenilirliği** yanında (ör. "4/4 aldı"); **"Satıldı" / "Gelmedi"** işaretleme
- **Mağaza QR kodu** — yazdırılıp tezgaha konur; okutan mağaza linkine gider

### C. Üye (Alıcı) Alanı
- **Basit üyelik** — telefon + SMS kod (şifre yok)
- Rezerve etme
- **"Bu hafta pazardan alacaklarım"** — tüm aktif rezervasyonlar, rezerv kodları, hangi tezgah/pazar
- **"Vazgeç"** — slot anında boşalır, sıradaki yedek yükselir
- Güvenilirlik özeti: kaç aldı / kaç gelmedi

### D. Admin Paneli (sen — karmaşık olabilir)
- **Pazar yönetimi** + her pazara **sıfırlama günü/saati** (Seferihisar → Çarşamba 20:00)
- **Kategori** ekleme/düzenleme
- Satıcı onayı; **satıcı adına ürün ekleme**
- **Şikâyetleri** görme/işleme
- Tüm mağaza/ürün yönetimi; durum geçmişine erişim

---

## 3. İşleyiş Mantığı

### Kilit + Sıra (sistemin kalbi)
- Satıcı **stok adedini** girer (genelde 1; reçel gibi ürünlerde fazla).
- İlk **stok kadar** kişi **aktif hak sahibi**; arkasına en fazla **5 yedek** → toplam **(stok + 5)**; dolunca "Rezerve Et" kapanır.
- Aktif almazsa **hakkı düşer**, yedek yükselir. Çift rezervasyon olmaz. Faz 1'de para pazarda nakit.

### Güvenilirlik / No-show'un bedeli
- Her alıcının aldı/gelmedi geçmişi tutulur (telefon anahtarıyla).
- Satıcıya rezervasyonda alıcının oranı gösterilir.
- Tekrar gelmeyen otomatik kısıtlanır (ör. 3 no-show → aynı anda yalnızca 1 aktif rezervasyon). Eşik admin ayarı.

### Vazgeç
- Aktif hak sahibi vazgeçince slot anında boşalır, sıradaki yedek aktife yükselir.

### Haftalık Sıfırlama (otomatik)
- Her pazarın **sıfırlama gün + saati** admin panelinden ayarlanır (Türkiye saati).
- O an geldiğinde arka plandaki **zamanlanmış görev** tetiklenir: satıcının "Satıldı" işaretlemediği aktifler otomatik **"Gelmedi"** olur, yedekler yükselir.

### Pazar öncesi hatırlatma
- No-show'u düşüren en basit şey. Şimdilik satıcı elle WhatsApp atar; ileride otomatik (veri zaten var).

---

## 4. Teknik Kurulum

Sende var: **VS Code + Claude Code, Docker Desktop, Oracle sunucu.**
- **Tek uygulama — Next.js.** Vitrin, `/panel` (satıcı), `/uye` (alıcı), `/admin` aynı projede.
- **PostgreSQL** (Docker Desktop'ta).
- **Fotoğraflar** — başta sunucu diskinde; büyüyünce Cloudflare R2 / Oracle Object Storage.
- **Zamanlanmış görev (scheduler)** — pazar sıfırlamalarını tetikler (Europe/Istanbul).
- **Docker Compose** — uygulama + veritabanı + scheduler tek dosyada; lokalden Oracle'a aynen taşınır.
- **Caddy** — otomatik HTTPS.
- **Giriş** — üye/alıcı: telefon + SMS kod → küçük maliyetli bir **SMS servisi** gerekir (istenirse başta e-posta+şifreyle başlanıp sonra SMS'e geçilebilir). Admin tek hesap: sen.

---

## 5. Veri Modeli

- **Pazarlar** — ad, bölge, sıfırlama günü/saati, saat dilimi, aktif
- **Kullanıcılar** — ad, telefon, giriş, **rol** (satıcı / alıcı / admin / [ileride] pazar_sorumlusu)
- **Kategoriler** — ad
- **Mağazalar** — sahibi, ad, slug, açıklama, WhatsApp no, **bağlı pazar**
- **Ürünler** — mağaza, kategori, başlık, açıklama, fiyat, **stok**, fotoğraflar
- **Rezervasyonlar** — ürün, alıcı, **tip (aktif/yedek)**, sıra no, durum (bekliyor/satıldı/gelmedi/iptal), rezerv kodu, pazar haftası, oluşturma zamanı
- **Durum geçmişi (log)** — her önemli değişiklik: kim, ne zaman, ne oldu → istatistik + anlaşmazlık + geri alma
- **Şikâyetler** — şikâyet eden, hedef (ürün/mağaza), sebep, durum

**İki kalıcı kural:**
1. **Hiçbir kayıt kalıcı silinmez** — silme = gizleme (ürün/mağaza dahil).
2. **Alıcı kimliği = telefon** — güvenilirlik ve istatistiğin çapası.

---

## 6. İstatistikler (şimdi veri, sonra ekran)

Ayrı sistem gerektirmez. Rezervasyon sonuçları + log kayıtlı kaldığı sürece "kim kaç rezerv yaptı, kaçını aldı, kaçına gelmedi" sayımla çıkar. Rapor ekranı istenince eklenir.

---

## 7. Geleceğin Temeli (şimdi at, sonra kazan)

- **Pazar Sorumlusu rolüne hazır** — rolleri ve pazar bağını öyle kur ki, ileride her pazara yerel sorumlu atamak bir *ayar* olsun, kod baştan yazma değil.
- **Silinmeyen geçmiş / audit** — §5'teki log; sonradan eklemesi pahalı, şimdi bedava.
- **Hafif hukuk** — telefon sakladığın için kısa aydınlatma metni; gıda (reçel vb.) için "üretici sorumludur" ibaresi.

---

## 8. Yapım Sırası

1. **İskelet** — proje + veritabanı (Pazarlar, roller, log/soft-delete **baştan**) + giriş
2. **Satıcı paneli** — ürün ekleme (foto/kategori/stok)
3. **Üyelik + rezervasyon + vitrin** — üye girişi, Rezerve Et, sıra mantığı, Vazgeç, "bu hafta alacaklarım"
4. **Otomatik sıfırlama** — scheduler + Satıldı/Gelmedi + güvenilirlik kuralı
5. **Admin** — pazar/sıfırlama/kategori/onay/satıcı adına ekleme/şikâyetler
6. **Cila + ritim** — haftalık ana sayfa (geri sayım, yeni eklenenler), QR, hatırlatma, hukuk notu
7. **Sunucuya alma** — Compose → Oracle, alan adı + HTTPS

**İnce dilim:** tek satıcı – tek ürün – tek alıcı; sıra + sıfırlama çalışsın; canlıda.

---

## 9. Şimdi Yapılmayacaklar (sonra)

Online ödeme, kargo, serbest metin arama, değerlendirme/yorum, **otomatik** hatırlatma, öne çıkarma, istatistik rapor ekranı, pazar sorumlusu yönetim ekranı (temeli var).
Faz 2+. (Kategoriler, çok-pazar, güvenilirlik, üyelik, şikâyet, audit — baştan var.)
