# Satıcı Onboarding — Mimari

İlgili genel özet: [`../MIMARI.md`](../MIMARI.md#satıcı-onboarding-self-servis--moderasyon)

## Karar: Self-servis satıcı olma (admin onayı yok)

Bir kişi "Mağaza Aç" ile **anında** satıcı olur; admin onayı beklenmez. Rol yükseltme
ve mağaza oluşturma tek işlemde yapılır: `magazaAc()` (`src/lib/magaza.ts`) bir
transaction içinde (1) mağazayı oluşturur, (2) kullanıcı hâlâ `alici` ise `satici`'ya
terfi eder (`updateMany where rol=alici` — başkasının rolüne asla dokunmaz), (3)
`DurumGecmisi`'ne `magaza_olusturuldu` izi düşer. Onboarding sihirbazı
(`/panel/magaza-ac`, yalnız giriş şartlı — satıcı geçidi YOK, çünkü kullanıcı henüz
satıcı değil) ve `urun-ekle` içindeki "önce mağaza" dalı **aynı** fonksiyonu kullanır:
terfi/iz/kilit mantığı tek yerde, kopya yok.

Gerekçe: hedef kitle deneyimsiz üreticiler; kutsal kural "WhatsApp'tan zor bir şey
eklenmez". Admin onayı sürtünme ekler ve admin panelini önkoşul yapardı. Kalite
denetimi **sonradan**, `gizliMi` moderasyon bayrağıyla.

## Moderasyon: neden `gizliMi`, `silindiMi` değil

`Magaza.gizliMi` (admin kontrollü, self-servisin "fren pedalı") ayrı bir alandır;
`silindiMi` ile aynı işi **göremez**:

- `silindiMi=true` yapılırsa `getOwnMagaza` (`where silindiMi=false`) de filtreler →
  **satıcı kendi mağazasını kaybeder**, panelden yönetemez.
- Tek-aktif-mağaza kısıtı partial unique index `Magaza(sahipId) WHERE silindiMi=false`
  üzerinden çalışır → `silindiMi=true` ile gizlenen satıcı **ikinci bir aktif mağaza
  açabilir** (baypas).

`gizliMi` bu ikisini bozmadan yalnız **vitrini** kapatır:

- Vitrin sorguları `silindiMi=false AND gizliMi=false` filtreler (`getMagazaBySlug`).
- `getOwnMagaza` yalnız `silindiMi`'ye bakar → gizli satıcı panele erişmeye devam eder.
- Tek-aktif kısıt `silindiMi` üzerinden işler → gizli satıcı ikinci mağaza açamaz (P2002).
- **Yeni rezervasyon da kapanır:** `rezervasyonOlustur` ön-kontrolü `magaza.gizliMi`
  ise `magaza-gizli` döner (net TR mesaj: "Bu mağaza şu anda aktif değil…"). Mevcut
  bekleyen rezervasyonlara **dokunulmaz** — satıcı panelinden normal sonuçlanır.

Admin toggle UI'ı henüz yok (admin paneli adımı); alan + vitrin filtresi + iz şimdi
eklendi, acil durumda DB'den set edilebilir. Her yeni mağaza `DurumGecmisi`'ne iz
bırakır → admin paneli gelince "yeni açılan mağazalar" listelenip gerekirse frenlenir.

**Not:** `getOwnMagaza` artık `include: { pazar: true }` ile pazar ilişkisini de
dönüyor ve `React.cache()` ile sarılı — çünkü aynı istekte hem yeni
`src/app/panel/layout.tsx` gate'i hem de çağıran sayfa bu fonksiyonu kullanabiliyor,
tekrar Prisma sorgusu atmadan `magaza.pazar.aktifMi`'yi okuyabiliyor. Bu, `gizliMi`/
`silindiMi`'den **ayrı** bir üçüncü moderasyon/kapanma ekseni (`Pazar.aktifMi`) —
detay için: [`pazar-yasam-dongusu.md`](./pazar-yasam-dongusu.md).

## JWT rol tazeliği (çözüm a)

Rol JWT içinde taşınır (`src/auth.ts`). Self-servis onboarding'de kullanıcı **aynı
oturumda** `alici → satici` terfi eder; JWT o an **bayat** kalır (yeniden giriş yapana
kadar eski rol). Çözüm (a): `getSaticiSession()` (`src/lib/yetki.ts`) rolü her istekte
**DB'den** okur — tek nokta, tüm panel/API çağrıları otomatik doğru olur; `SiteHeader`
de aynı yolu kullanır (terfi sonrası "Panelim" hemen görünür). Maliyet: +1 hafif sorgu,
bu ölçekte önemsiz. Alternatif (JWT'yi mid-session yenileme, `trigger:"update"`)
karmaşası bilinçli olarak kaçınıldı. **Erişim kararı artık JWT'ye değil DB'ye dayanır.**

## İleri referans (unutma)

- **Ana Sayfa çok-mağaza vitrini kurulunca `gizliMi` filtresi oraya da eklenmeli.**
  Bugün gizli mağazayı yalnız `getMagazaBySlug` filtreliyor; herkese açık her mağaza
  listesinin (ana sayfa, arama, kategori vitrini) `silindiMi=false AND gizliMi=false`
  filtrelemesi şart, yoksa gizli mağaza listede sızar.
- Admin paneli: `gizliMi` toggle + "yeni açılan mağazalar" listesi (DurumGecmisi
  `magaza_olusturuldu`) + geri-alma redleri (bkz. [`rezervasyon-motoru.md`](./rezervasyon-motoru.md)).
