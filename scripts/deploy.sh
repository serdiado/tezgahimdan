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
# Servis adi vermeden `build` - compose dosyasindaki TUM build: anahtarli
# servisleri (app + migrate) yeniden build eder. Sadece "build app" yeterli
# DEGIL: migrate ayri bir hedef (builder) kullaniyor, `run --rm migrate`
# imaj zaten diskteyse onu YENIDEN BUILD ETMEZ - ikinci deploy'dan itibaren
# git pull ile gelen yeni migration dosyalari image'e hic girmeden migrate
# "basarili" gorunup eski migration setini calistirmis olurdu (build-testinde
# bulundu, gercek bir prod-deploy hatasi olurdu).
$COMPOSE build

echo "=== 4/5: Migration uygulaniyor ==="
$COMPOSE --profile tools run --rm migrate

echo "=== 5/5: Uygulama yeniden baslatiliyor ==="
$COMPOSE up -d app

echo "=== Tamamlandi ==="
