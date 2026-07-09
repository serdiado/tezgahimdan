#!/bin/bash
# Production veritabanini yedekler. VPS'te calisir, docker-compose.prod.yml'in
# ayni sunucuda oldugu varsayimiyla. public_html DISINDA bir klasore yazar
# (git pull/clean asla dokunmasin, web'den asla servis edilmesin diye) -
# yedekler gercek kullanici verisi (telefon, email, sifre hash) icerdigi
# icin dosya izinleri kasitli olarak kisitli tutulur (bkz. asagida).
set -euo pipefail

# umask 077: dizin/dosya OLUSTURULDUGU ANDAN itibaren sadece sahibi okuyabilir
# - `mkdir` + ayrica `chmod 700` gibi iki adimli bir yaklasimda dosya/dizin ilk
# olusturuldugu kisa pencerede varsayilan (daha genis) izinle var olurdu; bu
# pencereyi tamamen kapatir (asagidaki chmod satirlari savunma-katmani olarak
# kaliyor, artik gereksiz ama zararsiz).
umask 077

PROJE_ADI="tezgahimdan"
DB_CONTAINER="${PROJE_ADI}-db-1"
YEDEK_DIZINI="/home/tezgahimdan.com/backups"
SAKLAMA_GUNU=14

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "HATA: $DB_CONTAINER container'i calismiyor, yedek alinamadi." >&2
  exit 1
fi

mkdir -p "$YEDEK_DIZINI"
chmod 700 "$YEDEK_DIZINI"

ZAMAN_DAMGASI=$(date +%Y%m%d_%H%M%S)
DOSYA="$YEDEK_DIZINI/tezgahimdan_${ZAMAN_DAMGASI}.sql.gz"

# pg_dump/gzip pipe'i ortada basarisiz olursa (set -e + pipefail sayesinde
# script hemen durur) yarim/bozuk dosya diskte KALMASIN diye - ERR trap'i
# temizler. Basari durumunda trap acikca kaldiriliyor (asagida) ki SONRAKI
# adimlarda (retention temizligi gibi) olasi bir hata bu iyi yedegi silmesin.
trap 'rm -f "$DOSYA"' ERR

# --no-owner --no-privileges: farkli bir ortama restore edilirken rol/izin
# uyusmazligi hatasi vermesin (bkz. ilk DB tasima sirasinda ayni yaklasim).
docker exec "$DB_CONTAINER" pg_dump -U tezgahimdan -d tezgahimdan --no-owner --no-privileges \
  | gzip > "$DOSYA"

chmod 600 "$DOSYA"
trap - ERR

BOYUT=$(du -h "$DOSYA" | cut -f1)
echo "Yedek alindi: $DOSYA ($BOYUT)"

# Eski yedekleri temizle - diskin sinirsiz dolmasini onler, ama SAKLAMA_GUNU
# kadar geriye donuk kurtarma imkani birakir.
SILINEN=$(find "$YEDEK_DIZINI" -name "tezgahimdan_*.sql.gz" -mtime +"$SAKLAMA_GUNU" -print -delete | wc -l)
if [ "$SILINEN" -gt 0 ]; then
  echo "$SAKLAMA_GUNU günden eski $SILINEN yedek silindi."
fi
