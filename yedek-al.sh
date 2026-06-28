#!/usr/bin/env bash
# ============================================================
#   YÖNETİM PANELİ - YEDEK AL (Mac / Linux)
#   Çalıştırmak için:  bash yedek-al.sh
# ============================================================
set -e
cd "$(dirname "$0")"

echo "============================================================"
echo "           YÖNETİM PANELİ - YEDEK AL"
echo "============================================================"
echo

# ---- Docker çalışıyor mu? ----
if ! docker version >/dev/null 2>&1; then
    echo "  HATA: Docker bulunamadı veya çalışmıyor."
    echo "  Lütfen Docker Desktop'ı açın ve tekrar deneyin."
    exit 1
fi

TS="$(date +%Y-%m-%d_%H-%M)"
mkdir -p yedekler

echo "[1/2] Resimler ve dosyalar yedekleniyor..."
docker run --rm -v yonetim-panel-local_backend-uploads:/data -v "$(pwd)/yedekler":/backup alpine tar czf "/backup/uploads-yedek-$TS.tar.gz" -C /data .

echo "[2/2] Veritabanı yedekleniyor..."
docker exec panel-local-postgres pg_dump -U postgres yonetim_local > "yedekler/db-yedek-$TS.sql"

echo
echo "============================================================"
echo "  YEDEK TAMAMLANDI!"
echo "  Dosyalar 'yedekler' klasöründe:"
echo "     uploads-yedek-$TS.tar.gz   (resimler/belgeler)"
echo "     db-yedek-$TS.sql           (veritabanı)"
echo
echo "  ÖNEMLİ: 'yedekler' klasörünü harici disk / USB / buluta"
echo "          kopyalayın. Yedek başka bir yerde de durmalı."
echo "============================================================"
