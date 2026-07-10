# Mobil Uygulama — Planlanan Mimari Karar

> **DURUM: PLANLANMIŞ — İLERİ TARİHLİ, HENÜZ UYGULANMADI.** Bu dosya, mobil
> uygulama yönünü ve gerekçesini sağlama almak için yazıldı. Ayrı bir kulvar;
> başlandığında adım adım plan çıkarılacak. Aşağıdakiler yön ve ilkelerdir.

İlgili: [`bildirim-sistemi.md`](./bildirim-sistemi.md).

## 1. Amaç (kullanıcı kararı)

- **Öncelik: mobil PUSH bildirim.** Asıl hedef alıcıları mobile taşımak değil,
  **satıcıları mobilde organize etmek ve sürekli bildirimle yönlendirmek**
  (ör. "açık işlemlerinizi tamamlayın").
- **Farklı arayüz/işleyiş İSTENMİYOR.** Kullanıcı web'de alıştığı aynı paneli
  cepten yapacak — mobil için ayrı bir UX yok.
- Önce **Android**, sonra **iOS**.

## 2. Karar: Capacitor (web'i saran tek kod)

Mevcut Next.js web uygulamasını native bir kabuğa alır: kullanıcı **birebir
aynı web panelini** kullanır, tek web kodundan **hem Android hem iOS** çıkar,
üstüne native yetenekler (en önemlisi **push**) ekler.

**Neden Capacitor / neden React Native değil:**
- Arayüz web ile paylaşıldığı için, web'de yapılan her değişiklik mobile
  **otomatik yansır** — mobil app'i her değişiklikte yeniden düzenlemek YOK.
  (React Native ayrı bir arayüz kod tabanı demek olurdu → her ekran ×2 bakım.)
- İş mantığı (rezervasyon motoru, gelmedi/yasak, bildirimler, çoklu-pazar) zaten
  **sunucuda** — hangi mobil yaklaşım olursa olsun tek yerde kalır, mobil sadece
  tüketir. Bu, mobili "ince kabuk" tutmayı mümkün kılıyor.
- "WhatsApp kadar basit" ilkesi + küçük ekip: 2-3 frontend'i ayrı ayrı sürdürmek
  istenmiyor.

## 3. Push — asıl iş burada

Arayüz Capacitor'la bedava taşınır; **push kendi altyapısını ister** (bir kereye
mahsus kurulum, sonrası paylaşımlı). En önemli mimari ilke: **push, mevcut
bildirim sistemine yeni bir TESLİM KANALIDIR — iş mantığı yeniden yazılmaz.**
Tetikleyiciler (yeni rezervasyon → satıcı, pazar kapandı → "işlemlerini tamamla",
satıcı ihmali) zaten var; `Bildirim.bildirimKanali` alanı tam bunun için kanca
olarak bırakılmıştı. Olay olunca "zil bildirimi + push da gönder" denir.

Gereken parçalar:
1. **Cihaz token'ı saklama:** satıcı app'i kurup giriş yapınca telefonun push
   adresi (token) üretilir; kullanıcıya bağlı DB'de saklanır (yeni tablo, ör.
   `CihazTokeni`: kullaniciId, token, platform).
2. **Push gönderim servisi:** backend, olay anında ilgili token'a push atar
   (mevcut `bildirimGonder*` akışına eklenen bir adım).
3. **Platform servisleri:** Android → **FCM (Firebase)**, ücretsiz/kolay;
   iOS → **APNs (Apple)**, Apple Developer hesabı gerekir, biraz daha zahmetli.
4. **Mağaza yayını:** Google Play (~25$ tek sefer), App Store (~99$/yıl + inceleme).

## 4. Satıcı senaryosu (push'un ideal kullanımı)

"Açık işlemlerinizi tamamlayın" = mevcut **zorunlu işlem ekranı** +
`saticininBekleyenIslemleriGetir` + `pazarHatirlatmalariGonder` (kapanış
hatırlatma cron'u). Push bunun üstüne biner: pazar kapandı, satıcı işaretlemedi
→ telefonuna push → **push'a dokununca doğrudan `/panel/rezervasyonlar`** açılır
(Capacitor push hedef URL/route taşıyabilir → deep-link). Tam "sürekli bildirimle
yönlendirme".

## 5. Önerilen sıra

1. **Web'i PWA'ya çevir** (manifest + service worker) — temel taş, küçük iş.
2. **Capacitor + Android + FCM push** — satıcı tetikleri (yeni rezervasyon,
   "işlemlerini tamamla" hatırlatması) push'a bağlanır → Play Store. Push'un
   kolay tarafı burası.
3. **iOS + APNs + App Store** — aynı web, aynı push mantığı; sadece Apple
   tarafının kurulumu eklenir.

## 6. Sonuç / ilkeler

- Mobil = wrapped web → **değişikliklerde mobili yeniden düzenleme YOK**.
- İş mantığı sunucuda paylaşımlı → motor/kural değişiklikleri mobile bedava taşınır.
- Push = mevcut bildirim tetiklerine kanal; tek gerçek yeni iş cihaz-token +
  FCM/APNs + gönderim + platform hesapları.
- Başlanınca ayrı bir kulvar olarak adım adım planlanır (pilot/web işleyişini
  bozmadan; mobil yalnızca aynı backend'i tüketir).

## 7. İş bölümü ve gereksinimler (uygulama günü)

Mobil, "ya Claude ya dış araç" değil: **kodun tamamı Claude'da, platform/hesap/
derleme adımları kullanıcıda** (Claude her portal adımını tek tek yönlendirir).

**Claude (kod):** web→PWA (manifest + service worker + ikonlar); Capacitor
kurulumu + config + android/ios platform ekleme; push backend (`CihazTokeni`
tablosu + migration, token kaydetme route'u, FCM/APNs gönderim servisi, mevcut
bildirim tetiklerine bağlama); istemci push kaydı; deep-link (`/panel/rezervasyonlar`);
web/PWA tarafının tarayıcı testi.

**Kullanıcı (dış araç + hesap, yönlendirmeyle):**
- **Android derleme:** Android Studio + Android SDK — **Windows'ta yapılabilir.**
- **iOS derleme:** **Mac + Xcode ZORUNLU** (iOS yalnız macOS'ta derlenir).
  Geliştirme makinesi **Windows** olduğu için iOS'ta ya bir Mac ya da bir
  **bulut derleme** servisi (Ionic Appflow / EAS Build / GitHub Actions macOS
  runner) gerekir. **Erken planlanacak kritik gereksinim budur.**
- **Firebase/FCM:** proje + `google-services.json` (birkaç tık).
- **Apple Developer (~99$/yıl) + APNs anahtarı**, **Google Play (~25$ tek sefer)**.
- İmza anahtarları/sertifikalar (keystore / iOS sertifikaları) — güvenlik-hassas,
  kullanıcı tutar.
- Gerçek cihazda test: izin + token akışı + test push doğrulaması.

**Sonuç:** "önce Android" planı bu açıdan da doğru — Windows'ta doğrudan
ilerlenebilir; iOS'a geçmeden önce Mac/bulut-derleme ayarı yapılır.
