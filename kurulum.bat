@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Docker Desktop'in containerd/attestation hatasini onler ("image already exists").
set "BUILDX_NO_DEFAULT_ATTESTATIONS=1"

echo ============================================================
echo            YONETIM PANELI - YEREL KURULUM
echo ============================================================
echo.

REM ---- 1) Docker kurulu ve calisiyor mu? ----
echo [1/4] Docker kontrol ediliyor...
docker version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  HATA: Docker bulunamadi veya calismiyor.
    echo.
    echo  Lutfen "Docker Desktop" programini kurun ve ACIK oldugundan emin olun:
    echo     https://www.docker.com/products/docker-desktop/
    echo.
    echo  Docker Desktop'i actiktan sonra bu dosyayi tekrar calistirin.
    echo.
    pause
    exit /b 1
)
echo     Docker calisiyor.
echo.

REM ---- 2) Ayar dosyasi (.env.local) ----
echo [2/4] Ayar dosyasi hazirlaniyor...
if not exist ".env.local" (
    copy ".env.local.example" ".env.local" >nul
    echo     .env.local olusturuldu (varsayilan ayarlarla).
) else (
    echo     .env.local zaten var, korunuyor.
)
echo.

REM ---- 3) Kurulum / baslatma ----
echo [3/4] Uygulama kuruluyor ve baslatiliyor...
echo     (Ilk kurulum birkac dakika surebilir, lutfen bekleyin.)
echo.
docker compose -f docker-compose.local.yml --env-file .env.local up -d --build
if errorlevel 1 (
    echo.
    echo  HATA: Kurulum sirasinda bir sorun olustu.
    echo  Docker Desktop'in acik oldugundan emin olup tekrar deneyin.
    echo.
    pause
    exit /b 1
)
echo.

REM ---- 4) Bitti ----
echo [4/4] Hazirlaniyor (veritabani ve ilk veriler)...
echo     Bu adim ilk kurulumda 1-2 dakika surebilir.
echo.
echo ============================================================
echo   KURULUM TAMAMLANDI!
echo ------------------------------------------------------------
echo   Panele giris adresi : http://localhost:3030
echo.
echo   Giris bilgileri (.env.local dosyasindan):
echo      E-posta : admin@panel.local
echo      Sifre   : Admin1234!
echo   (Bu bilgileri degistirdiyseniz .env.local dosyasina bakin.)
echo.
echo   NOT: Adres hemen acilmazsa 1-2 dakika bekleyip sayfayi yenileyin.
echo ============================================================
echo.

REM Tarayicida adresi acmaya calis
start "" "http://localhost:3030"

echo Bu pencereyi kapatabilirsiniz.
echo.
pause
endlocal
