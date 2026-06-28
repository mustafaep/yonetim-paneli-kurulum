#!/bin/sh
set -e

echo "========================================="
echo "  Backend Entrypoint - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# ─── 0. Uploads Klasörlerini Oluştur ───
echo "[0/3] Uploads klasörleri kontrol ediliyor..."
# Volume root’u root/yanlış UID ile ve sadece okunur olabiliyor; tek mkdir hatası set -e ile
# tüm süreci öldürüyordu — her dizin için mkdir ayrı ve hata yok sayılıyor.
for d in \
  uploads/documents uploads/logos uploads/header-paper \
  uploads/payments uploads/invoices uploads/advances uploads/tevkifat \
  uploads/staging/documents \
  uploads/temp/document-previews/files uploads/temp/document-previews/metadata
do
  mkdir -p "$d" 2>/dev/null || true
done
if [ -d uploads ] && [ ! -w uploads ]; then
  echo "⚠️  uploads dizinine (node) yazılamıyor — kalıcı çözüm: docker compose exec -u root backend chown -R node:node /app/uploads"
fi
echo "✅ Uploads klasörleri kontrol edildi"

# ─── 1. Veritabanı Hazırlık Kontrolü ───
echo "[1/3] Veritabanı bağlantısı kontrol ediliyor..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const p = new PrismaClient();
        p.\$connect().then(() => { p.\$disconnect(); process.exit(0); })
          .catch(() => process.exit(1));
    " 2>/dev/null; then
        echo "✅ Veritabanı bağlantısı başarılı"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ Veritabanına $MAX_RETRIES denemede bağlanılamadı!"
        exit 1
    fi

    echo "   Bekleniyor... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# ─── 2. Migration'ları Çalıştır ───
echo "[2/3] Migration'lar çalıştırılıyor..."

# Bilinen problemli migration'ları skip et (migration geçmişi karışmış olanlar)
if [ -d "prisma/migrations" ]; then
    # 202501* serisi migration'lar (20250120000000 hariç - CustomRoleScope tablosunu oluşturuyor)
    for MIGRATION in $(ls -1 prisma/migrations 2>/dev/null | grep -E '^202501' || true); do
        if [ "$MIGRATION" = "20250120000000_add_role_scope_system" ]; then
            continue
        fi
        npx prisma migrate resolve --applied "$MIGRATION" 2>/dev/null || true
    done

    # Ek problemli migration'lar
    for MIGRATION in \
        "20251228230102_remove_contracted_institutions_feature" \
        "20251229000706_remove_workplace_feature"; do
        npx prisma migrate resolve --applied "$MIGRATION" 2>/dev/null || true
    done
fi

# Migration'ları deploy et
npx prisma migrate deploy 2>&1 || {
    echo "⚠️  İlk migration denemesi başarısız, failed migration'ları resolve ediliyor..."
    sleep 2

    # Başarısız (failed) migration'ları bul ve rolled-back olarak işaretle
    FAILED_MIGRATIONS=$(npx prisma migrate status 2>&1 | grep -oP '`\K[^`]+(?=`.*failed)' || true)
    if [ -n "$FAILED_MIGRATIONS" ]; then
        for FM in $FAILED_MIGRATIONS; do
            echo "   Rolling back failed migration: $FM"
            npx prisma migrate resolve --rolled-back "$FM" 2>/dev/null || true
        done
    fi

    sleep 2
    npx prisma migrate deploy 2>&1 || {
        echo "❌ Migration hatası! Logları kontrol edin."
        echo "   Manuel çözüm: npx prisma migrate resolve --rolled-back <migration_name>"
        exit 1
    }
}

echo "✅ Migration'lar tamamlandı"

# ─── 2.5 Yerel Kurulum: Otomatik İlk Seed (yalnızca DB boşsa) ───
# Bu blok YALNIZCA LOCAL_AUTO_SEED=true iken çalışır (docker-compose.local.yml).
# VPS/production'da bu değişken tanımlı OLMADIĞI için tamamen atlanır.
# Güvenlik: Sadece veritabanında hiç kullanıcı yoksa seed çalışır; mevcut
# verilerinizi ASLA silmez (her yeniden başlatmada tekrar seed YAPMAZ).
if [ "$LOCAL_AUTO_SEED" = "true" ]; then
    echo "[2.5] Yerel kurulum: veritabanı boş mu kontrol ediliyor..."

    USER_COUNT=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const p = new PrismaClient();
        p.user.count()
          .then((c) => { console.log(c); return p.\$disconnect(); })
          .catch(() => { console.log('ERR'); });
    " 2>/dev/null | tr -d '[:space:]')

    if [ "$USER_COUNT" = "0" ]; then
        echo "   📦 Veritabanı boş — temel veriler ekleniyor"
        echo "      (admin kullanıcı, iller/ilçeler, roller, belge şablonları)..."
        npx ts-node -r tsconfig-paths/register --transpile-only prisma/seed7.ts \
            || echo "   ⚠️  seed7 çalıştırılamadı (atlandı)"
        npx ts-node -r tsconfig-paths/register --transpile-only prisma/seed5.ts \
            || echo "   ⚠️  seed5 çalıştırılamadı (atlandı)"
        echo "   ✅ İlk kurulum verileri eklendi. Giriş e-postası: ${ADMIN_EMAIL:-(ADMIN_EMAIL tanımsız)}"
    elif [ "$USER_COUNT" = "ERR" ]; then
        echo "   ⚠️  Kullanıcı sayısı okunamadı — seed atlandı."
    else
        echo "   ✅ Veritabanında veri mevcut ($USER_COUNT kullanıcı) — seed atlandı, veriler korunuyor."
    fi
fi

# ─── 3. Uygulamayı Başlat ───
echo "[3/3] Uygulama başlatılıyor..."
echo "========================================="
exec "$@"
