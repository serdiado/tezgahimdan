# Deploy mimarisi (Oracle VPS — Docker tabanlı prod)

## Karar: Docker mu, native mi?

Proje başlangıcında (bkz. CLAUDE.md) "Docker yalnızca dev'de ve sadece DB için"
öngörülmüştü. Gerçek deploy'a geçilirken bu karar **bilinçli olarak
gözden geçirildi** ve prod'da da Docker kullanılmasına karar verildi
(hem uygulama hem Postgres). Gerekçe CLAUDE.md'nin ilk varsayımından
farklı, çünkü hedef VPS beklenenden farklı çıktı:

- VPS **paylaşımlı bir hosting sunucusu** — CyberPanel + OpenLiteSpeed
  üzerinde başka, ilgisiz bir işin (`tirebirlik.com.tr`, gerçek mail
  servisiyle) barındığı tek kutu. Node/pnpm/Postgres'i doğrudan sisteme
  kurmak, o diğer işi etkileyebilecek versiyon/bağımlılık çakışması riski
  taşırdı — Docker bunu tamamen izole eder.
- Aynı sunucuda daha önce başka bir Next.js projesi (`katalog`) aynen bu
  şekilde (Docker + OpenLiteSpeed reverse-proxy) çalıştırılmış ve sorunsuz
  görülmüştü — kanıtlanmış bir yerel desen.
- 500 kullanıcı/20 pazaryeri ölçeğinde container'ın performans maliyeti
  ölçülemeyecek kadar küçük; ileride veritabanı ayrı bir yönetilen servise
  taşınmak istenirse bu karar buna engel değil (`DATABASE_URL` değişir,
  container'da olması bunu etkilemez).

## Dosyalar

- **`Dockerfile`**: 3 aşama — `deps` (bağımlılık kurulumu) → `builder`
  (`prisma generate` + `next build`) → `runner` (yalın standalone çalışma
  zamanı, non-root kullanıcı). `node:22-slim` (Debian/glibc) kasıtlı
  seçildi — Prisma'nın query-engine binary'si Alpine/musl'da ekstra
  `binaryTargets` yapılandırması ister, glibc'de sorunsuz.
- **`docker-compose.prod.yml`**: `db` (Postgres) + `migrate` (tek seferlik,
  `profiles: tools` — otomatik başlamaz, `--profile tools run --rm migrate`
  ile elle çağrılır) + `app`. Kök dizindeki `docker-compose.yml` SADECE
  dev DB için kalmaya devam ediyor, karıştırılmamalı.
- **`public/uploads/`** bir bind-mount volume (`./public/uploads:/app/public/uploads`)
  — image rebuild'lerinde kaybolmaz, VPS diskinde kalıcı.

## Yerel build test sırasında bulunan ve düzeltilen 3 gerçek hata

1. **pnpm 10+ native derleme script engeli**: `bcrypt`, `@prisma/client`,
   `@prisma/engines`, `sharp` gibi native-binding gerektiren paketlerin
   kurulum script'lerini pnpm güvenlik gereği varsayılan engelliyor
   (`ERR_PNPM_IGNORED_BUILDS`). `pnpm-workspace.yaml`'a `onlyBuiltDependencies`
   eklendi + `pnpm install --frozen-lockfile; pnpm approve-builds --all`
   ile açıkça onaylanıyor. **Önemli detay**: onay kalıcı kaydedilmiyor —
   `pnpm exec`/`pnpm run` sonraki her çağrıda AYNI kontrolü tekrar tetikler.
   Bu yüzden `builder` aşamasında `pnpm exec prisma generate`/`pnpm build`
   YERİNE `node_modules/.bin/prisma`/`node_modules/.bin/next` doğrudan
   çağrılıyor (pnpm sarmalayıcısını tamamen atlar).
2. **OpenSSL eksik**: `node:22-slim` içinde Prisma'nın query-engine'i
   çalışma zamanında OpenSSL'i dinamik linkler ama imajda kurulu değil —
   `base` aşamasına `apt-get install -y openssl` eklendi.
3. **CMS sayfaları build'de patlıyor**: `/hakkimizda`, `/sss`, `/kvkk`
   admin panelden düzenlenebilir içerik olduğu için veritabanından okuyor,
   ama Next.js bunları statik sayfa olarak build ANINDA önceden oluşturmaya
   çalışıyordu — build ortamında gerçek `DATABASE_URL` yok, olsa bile admin
   değişikliği o zaman yayına yansımazdı. Üçüne de `export const dynamic =
   "force-dynamic"` eklendi.

## cron: pazar-sıfırlama

`/api/cron/pazar-sifirlama` harici bir zamanlayıcı ister (bkz.
[`haftalik-sifirlama.md`](./haftalik-sifirlama.md)). VPS'te `/etc/cron.d/`
altında 5 dakikada bir çalışan bir görev var — **secret asla cron.d'ye
gömülmedi** (o dosya 644, herkes okuyabilir); bunun yerine secret zaten
600 izinli `.env.production`'dan okuyan, 700 izinli ayrı bir script
(`cron-pazar-sifirlama.sh`) çağrılıyor.

## HTTPS

CyberPanel'in kendi AutoSSL (Let's Encrypt) özelliği kullanıldı — DNS
doğru IP'ye işaret ettikten sonra tek tıkla kurulur, ayrıca certbot/Nginx
elle yapılandırılmadı.

## Standart deploy adımı (yedekli)

Pilot dönemi başladıktan sonra (gerçek kullanıcı verisi var) her deploy
`scripts/deploy.sh` ile yapılır — **VPS'te root olarak** (docker komutları
için gerekli; CyberPanel'in site-özel kullanıcısının (`tezga6305`) docker
soketine erişimi kasıtlı olarak yok, paylaşımlı sunucuda bu doğru bir
kısıtlama). Script sırayla: `scripts/backup-db.sh` (yedek) → `git pull` →
`docker compose build` (TÜM servisler, sadece `app` değil — aşağıya bkz.) →
`migrate` → `app`'i yeniden başlat. Migration adımı başarısız olursa `set -e`
sayesinde script durur, çalışan `app` container'ına hiç dokunulmaz (kesinti
olmaz), ama script bunu otomatik geri almaz — yedek `scripts/backup-db.sh`
çıktısındaki dosyadan elle restore edilir.

**Yerel test build'de bulunup düzeltilen 2 gerçek hata (adversarial review):**
1. İlk taslakta sadece `docker compose build app` çalışıyordu — `migrate`
   servisi ayrı bir imaj (`target: builder`) kullandığı için, `docker compose
   run` var olan bir imajı YENİDEN BUILD ETMEZ. Sonuç: İKİNCİ deploy'dan
   itibaren `git pull` ile gelen yeni migration dosyaları hiç imaja
   girmeyecek, migrate sessizce eski migration setini "başarılı" şekilde
   çalıştırmış gibi görünecekti — şema/kod senkronsuzluğu geç fark edilirdi.
   İlk düzeltme (`docker compose build`, servis adsız) **YETERSİZ çıktı**:
   `migrate` `profiles: ["tools"]` altında olduğu için compose, profil aktif
   olmadan onu servis listesine hiç almıyor — çıplak `build` yine sadece
   app'i build ediyor. **Bu öngörülen senaryo 2026-07-09 deploy'unda gerçekten
   yaşandı**: satıcı-ihmal migration'ları eski migrate imajına girmedi,
   migrate "No pending migrations" dedi, app yeni kodla (olmayan kolonları
   sorgulayarak) ayağa kalktı ve canlı site çöktü. Kesin düzeltme:
   `docker compose --profile tools build` (deploy.sh'de) — profil aktifken
   hem app hem migrate build ediliyor. Kurtarma: migrate imajı profille
   yeniden build edilip migration'lar uygulandı, app restart edildi (~15 dk
   kesinti; DB yedeği adım 1'de zaten alınmıştı, veri kaybı yok).
2. `backup-db.sh`'de dosya `pg_dump | gzip > dosya` ile oluşturulup SONRA
   `chmod 600` ile kısıtlanıyordu — büyük bir DB'de bu arada dosya varsayılan
   (daha geniş) izinle PII içeriğiyle diskte durabilirdi. `umask 077` script
   başına eklendi (dosya OLUŞTURULDUĞU andan itibaren kısıtlı), ayrıca yarım
   kalan dump'ı temizleyen bir `ERR` trap eklendi.

→ Script'ler: [`scripts/backup-db.sh`](../../scripts/backup-db.sh),
[`scripts/deploy.sh`](../../scripts/deploy.sh)
