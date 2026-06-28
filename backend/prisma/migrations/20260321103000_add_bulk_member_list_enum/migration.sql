-- AlterEnum: PostgreSQL yeni enum değeri ayrı commit sonrası kullanılabilir; veri güncellemesi bir sonraki migration'da.
ALTER TYPE "DocumentTemplateType" ADD VALUE 'BULK_MEMBER_LIST';
