@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo            YONETIM PANELI - YEDEK AL
echo ============================================================
echo.

REM ---- Docker calisiyor mu? ----
docker version >nul 2>&1
if errorlevel 1 (
    echo  HATA: Docker bulunamadi veya calismiyor.
    echo  Lutfen "Docker Desktop"i acin (yesil/calisiyor) ve tekrar deneyin.
    echo.
    pause
    exit /b 1
)

REM ---- Tarih-saat damgasi (yyyy-MM-dd_HH-mm) ----
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set "TS=%%i"

REM ---- Yedek klasoru ----
if not exist "yedekler" mkdir "yedekler"

echo [1/2] Resimler ve dosyalar yedekleniyor...
docker run --rm -v yonetim-panel-local_backend-uploads:/data -v "%cd%\yedekler":/backup alpine tar czf /backup/uploads-yedek-%TS%.tar.gz -C /data .
if errorlevel 1 goto :hata

echo [2/2] Veritabani yedekleniyor...
docker exec panel-local-postgres pg_dump -U postgres yonetim_local > "yedekler\db-yedek-%TS%.sql"
if errorlevel 1 goto :hata

echo.
echo ============================================================
echo   YEDEK TAMAMLANDI!
echo ------------------------------------------------------------
echo   Yedek dosyalari "yedekler" klasorunde olusturuldu:
echo      uploads-yedek-%TS%.tar.gz   (resimler/belgeler)
echo      db-yedek-%TS%.sql           (veritabani)
echo.
echo   ONEMLI: "yedekler" klasorunu harici disk / USB bellek veya
echo           buluta KOPYALAYIN. Yedek, baska bir yerde de durmali.
echo ============================================================
echo.
pause
endlocal
exit /b 0

:hata
echo.
echo  HATA: Yedek alinirken bir sorun olustu.
echo  - Uygulama calisir durumda mi? (once kurulum.bat ile baslatin)
echo  - Docker Desktop acik ve yesil mi?
echo  Kontrol edip tekrar deneyin.
echo.
pause
endlocal
exit /b 1
