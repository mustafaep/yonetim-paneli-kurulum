-- ADVANCE_ADD → ADVANCE_CREATE, ADVANCE_UPDATE, ADVANCE_DELETE, ADVANCE_DOCUMENT

INSERT INTO "CustomRolePermission" ("id", "roleId", "permission", "createdAt")
SELECT
  gen_random_uuid()::text,
  crp."roleId",
  new_perm,
  NOW()
FROM "CustomRolePermission" crp
CROSS JOIN (
  VALUES
    ('ADVANCE_CREATE'),
    ('ADVANCE_UPDATE'),
    ('ADVANCE_DELETE'),
    ('ADVANCE_DOCUMENT')
) AS v(new_perm)
WHERE crp.permission = 'ADVANCE_ADD'
ON CONFLICT ("roleId", "permission") DO NOTHING;

DELETE FROM "CustomRolePermission" WHERE "permission" = 'ADVANCE_ADD';
