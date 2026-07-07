# Alıcı Kullanıcı Paneli — Sol Menü + Yeni Sayfalar

## Bağlam

`/rezervasyonum` tek başına rezervasyon listesi + gömülü mağaza-değerlendirme
bloğu + iki dinamik form state'ini karıştırıyordu ("anlaşılması zor tablo").
Alıcı tarafında hiç merkezi bir panel yoktu — `Favorilerim`/`Bildirimlerim`/
`Rezervasyonlarım` header'da dağınık ikonlardı, "Değerlendirmelerim" ve "Takip
Ettiğim Mağazalar" için hiç toplu liste sayfası, "Ayarlar" (ad/telefon/şifre
değiştirme) hiç yoktu.

## Route group ile URL'leri koruma — projede İLK sidebar deseni

Ne satıcı panelinde (`src/app/panel/`) ne admin panelinde (`src/app/admin/`)
`layout.tsx` ya da sidebar/mobil-menü deseni yoktu — her sayfa bağımsız kendi
`<SiteHeader/><main>` sarmalayıcısını çağırıyordu. `AdminNav.tsx` yatay bir nav
bileşeni olarak hazırlanmış ama HİÇBİR admin sayfasında kullanılmıyordu (ölü
kod). Bu yüzden alıcı paneli için sıfırdan bir desen kuruldu:

`src/app/(alici-panel)/` — parantezli route group, URL'e YANSIMAZ. Mevcut
`/rezervasyonum`, `/favorilerim`, `/bildirimlerim` `git mv` ile bu grubun
içine taşındı (URL'ler değişmedi, davranış aynı kaldı). 4 yeni sayfa
(`/degerlendirmelerim/urunler`, `/degerlendirmelerim/magazalar`,
`/takip-ettigim-magazalar`, `/ayarlar`) aynı gruba eklendi.

**Auth gate BİLEREK layout'a taşınmadı** — her page.tsx kendi
`redirect("/giris?next=/tam/yolu")` kontrolünü korudu. Next.js layout'ları
hangi alt-rotanın aktif olduğunu (next= parametresi için doğru path'i)
prop olarak almaz; bunu genellemeye çalışmak (`headers()` üzerinden pathname
okumaya çalışmak gibi) kırılgan bir çözüm olurdu. Küçük bir kod tekrarı
(3-4 satır × 7 sayfa) kabul edildi — projede zaten "birden fazla katmanda
yetki kontrolü" alışkanlığı var (bkz. `magazaGuncelle` server action yorumu).

## `AliciPanelMenu.tsx` — tek bileşen, iki görünüm

Drawer/off-canvas YOK. Tek `"use client"` bileşen, `usePathname()` ile aktif
link vurgulanır, Tailwind breakpoint ile iki görünüm:
- Masaüstü (`md:`): sol sabit dikey liste.
- Mobil (`<md`): üstte `overflow-x-auto` yatay kaydırılabilir sekme çubuğu
  (WhatsApp'taki sekme çubuğuna benzer — hiçbir gizli/açılır durum yok).

Hamburger+drawer ve alt sabit sekme çubuğu (bottom tab bar) elendi: ilki ek
bir tıklama gerektirir, ikincisi 7 menü öğesi için "daha fazla" katmanı
gerektirirdi — ikisi de "WhatsApp kadar basit" kutsal kuralına aykırı.

**Bilinen tuzak (canlı yakalandı):** `className` çok satırlı bir JS string
literal olarak yazılırsa (satır sonu + girinti string'in içinde), server-render
ile client-render arasında whitespace normalize farkı React hydration
mismatch'ine yol açar. Tüm `className` değerleri TEK SATIRDA tutulmalı (ya da
`clsx`/template literal ile birleştirilmeli, embedded newline OLMAMALI).

## Yeni sayfalar — mevcut fonksiyon/bileşenlerin yeniden kullanımı

- **Ürün Değerlendirmelerim** (`/degerlendirmelerim/urunler`) —
  `kullaniciTumUrunDegerlendirmeleriGetir` (`src/lib/degerlendirme.ts`),
  `DegerlendirmeFormu.tsx` AYNEN yeniden kullanıldı.
- **Mağaza Değerlendirmelerim** (`/degerlendirmelerim/magazalar`) —
  `kullaniciTumMagazaDegerlendirmeleriGetir` (`src/lib/magaza-degerlendirme.ts`),
  `MagazaDegerlendirmeFormu.tsx` aynen yeniden kullanıldı. Bu sayfa eklenince
  `/rezervasyonum`'daki "Mağazaları Değerlendir" bloğu TAMAMEN çıkarıldı (tek
  sorumluluk kararı — kod tekrarı yerine taşıma tercih edildi).
- **Takip Ettiğim Mağazalar** (`/takip-ettigim-magazalar`) —
  `kullaniciTakipEttigiMagazalarGetir` (`src/lib/magaza-takip.ts`).
  `MagazaKarti.tsx` `src/app/`'den `src/components/`'e taşındı (artık
  cross-feature paylaşılan bileşen) ve opsiyonel `altAksiyon?: ReactNode`
  prop'u eklendi (kartın tamamı `<Link>` olduğu için "Takibi Bırak" butonu
  Link'in DIŞINDA render edilir, nested-button sorunu yok). "Takibi Bırak"
  için YENİ bir bileşen YAZILMADI — mevcut `MagazaTakipButonu` (zaten
  toggle+fetch+router.refresh() içeriyor) `benimTakibimVar={true}` ile aynen
  kullanıldı.
- **Ayarlar** (`/ayarlar`) — ad/telefon/şifre değiştirme. `MagazaAyarlariForm.tsx`
  ile birebir aynı server-action deseni. Şifre değiştirme `bcrypt.compare` +
  `bcrypt.hash` (auth.ts/api/register ile AYNI round sayısı, 10) — email
  göndermeden yapılabilen TEK şifre-değişikliği türü.
  **Faz 2'ye bilinçli olarak ertelendi:** "şifremi unuttum" (email gönderme
  altyapısı — nodemailer/resend/SMTP — projede hiç yok) ve "hesabımı sil"
  (`Kullanici` modelinde `silindiMi` alanı yok, yeni migration + "rezervasyon
  geçmişi ne olacak" gibi ürün kararları gerektirir).

## Rezervasyon motoruna dokunuş: HİÇ

Hepsi ya salt-okunur yeni sorgular (kullanıcının kendi verisini listeleme) ya
da zaten var olan upsert/toggle fonksiyonlarının (`degerlendirmeUpsert`,
`magazaDegerlendirmeUpsert`, `magazaTakipToggle`) yeniden kullanımı.
`rezervasyon.ts`'e hiç çağrı yapılmadı.
