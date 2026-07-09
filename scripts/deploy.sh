#!/bin/bash
# Standart production deploy adimi. VPS'te /home/tezgahimdan.com/public_html
# icinde calistirilir (repo koku). Her adim bir oncekinin basarili olmasina
# bagli (set -e) - migration hata verirse app yeniden baslatilmaz, eski
# container calismaya devam eder (kesinti yasanmaz).
set -euo pipefail

PROJE_ADI="tezgahimdan"
COMPOSE="docker compose -f docker-compose.prod.yml -p $PROJE_ADI"

cd "$(dirname "$0")/.."

echo "=== 1/5: Yedek aliniyor ==="
./scripts/backup-db.sh

echo "=== 2/5: Kod guncelleniyor (git pull) ==="
git pull

echo "=== 3/5: Imaj build ediliyor (app + migrate) ==="
# --profile tools SART: migrate servisi "profiles: [tools]" altinda oldugu
# icin, profil aktif degilken compose onu servis listesinde HIC GORMEZ -
# ciplak `build` sadece app'i build eder ve `run --rm migrate` diskteki ESKI
# migrate imajini kullanir. Sonuc: git pull ile gelen yeni migration'lar
# imaja girmeden migrate "No pending migrations" deyip basarili gorunur, app
# ise yeni (kolonlari bekleyen) kodla ayaga kalkar -> canli site DB hatasiyla
# coker. 2026-07-09 deploy'unda GERCEKTEN yasandi (satici-ihmal migration'lari
# atlandi, site kesintiye ugradi) - bu satiri profilsiz hale GERI DONDURME.
$COMPOSE --profile tools build

echo "=== 4/5: Migration uygulaniyor ==="
$COMPOSE --profile tools run --rm migrate

echo "=== 5/5: Uygulama yeniden baslatiliyor ==="
$COMPOSE up -d app

echo "=== Tamamlandi ==="
