@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo            YONETIM PANELI - DURDUR
echo ============================================================
echo.
echo Uygulama durduruluyor (verileriniz KORUNUR)...
echo.

docker compose -f docker-compose.local.yml down

echo.
echo ============================================================
echo   Uygulama durduruldu.
echo   Tekrar baslatmak icin: kurulum.bat dosyasini calistirin.
echo ============================================================
echo.
pause
