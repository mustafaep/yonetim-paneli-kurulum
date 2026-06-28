#!/usr/bin/env bash
# ============================================================
#   YÖNETİM PANELİ - YEREL KURULUM (Mac / Linux)
#   Çalıştırmak için:  bash kurulum.sh
# ============================================================
set -e
cd "$(dirname "$0")"

# Docker Desktop'in containerd/attestation hatasini onler ("image already exists").
export BUILDX_NO_DEFAULT_ATTESTATIONS=1

echo "============================================================"
echo "           YÖNETİM PANELİ - YEREL KURULUM"
echo "============================================================"
echo

# ---- 1) Docker kurulu ve çalışıyor mu? ----
echo "[1/4] Docker kontrol ediliyor..."
if ! docker version >/dev/null 2>&1; then
    echo
    echo "  HATA: Docker bulunamadı veya çalışmıyor."
    echo
    echo "  Lütfen Docker Desktop'ı kurun ve AÇIK olduğundan emin olun:"
    echo "     https://www.docker.com/products/docker-desktop/"
    echo
    echo "  Docker'ı açtıktan sonra bu komutu tekrar çalıştırın."
    exit 1
fi
echo "    Docker çalışıyor."
echo

# ---- 2) Ayar dosyası (.env.local) ----
echo "[2/4] Ayar dosyası hazırlanıyor..."
if [ ! -f ".env.local" ]; then
    cp ".env.local.example" ".env.local"
    echo "    .env.local oluşturuldu (varsayılan ayarlarla)."
else
    echo "    .env.local zaten var, korunuyor."
fi
echo

# ---- 3) Kurulum / başlatma ----
echo "[3/4] Uygulama kuruluyor ve başlatılıyor..."
echo "    (İlk kurulum birkaç dakika sürebilir, lütfen bekleyin.)"
echo
docker compose -f docker-compose.local.yml --env-file .env.local up -d --build
echo

# ---- 4) Bitti ----
echo "[4/4] Hazırlanıyor (veritabanı ve ilk veriler)..."
echo "    Bu adım ilk kurulumda 1-2 dakika sürebilir."
echo
echo "============================================================"
echo "  KURULUM TAMAMLANDI!"
echo "------------------------------------------------------------"
echo "  Panele giriş adresi : http://localhost:3030"
echo
echo "  Giriş bilgileri (.env.local dosyasından):"
echo "     E-posta : admin@panel.local"
echo "     Şifre   : Admin1234!"
echo "  (Bu bilgileri değiştirdiyseniz .env.local dosyasına bakın.)"
echo
echo "  NOT: Adres hemen açılmazsa 1-2 dakika bekleyip sayfayı yenileyin."
echo "============================================================"

# Tarayıcıda açmayı dene (Mac: open, Linux: xdg-open)
if command -v open >/dev/null 2>&1; then
    open "http://localhost:3030" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:3030" >/dev/null 2>&1 || true
fi
