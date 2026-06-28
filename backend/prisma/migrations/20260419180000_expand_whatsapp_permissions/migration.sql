-- WHATSAPP_ACCESS → ayrıntılı WhatsApp izinleri

INSERT INTO "CustomRolePermission" ("id", "roleId", "permission", "createdAt")
SELECT
  gen_random_uuid()::text,
  crp."roleId",
  new_perm,
  NOW()
FROM "CustomRolePermission" crp
CROSS JOIN (
  VALUES
    ('WHATSAPP_CHAT_VIEW'),
    ('WHATSAPP_CHAT_SEND'),
    ('WHATSAPP_CHAT_MANAGE'),
    ('WHATSAPP_BULK_SEND'),
    ('WHATSAPP_TEMPLATE_VIEW'),
    ('WHATSAPP_TEMPLATE_MANAGE'),
    ('WHATSAPP_INSTANCE_MANAGE')
) AS v(new_perm)
WHERE crp.permission = 'WHATSAPP_ACCESS'
ON CONFLICT ("roleId", "permission") DO NOTHING;

DELETE FROM "CustomRolePermission" WHERE "permission" = 'WHATSAPP_ACCESS';
