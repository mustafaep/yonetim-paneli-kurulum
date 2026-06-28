-- Toplu üye listesi şablonunu yeni tipe taşı (seed5 / eski veritabanları)
UPDATE "DocumentTemplate"
SET type = 'BULK_MEMBER_LIST'
WHERE name = 'Toplu Üye Listesi Üst Yazısı'
  AND type = 'NOTIFICATION_LETTER';
