-- Aynı TC ile birden fazla Member (iptal sonrası yeniden kayıt için)
DROP INDEX IF EXISTS "Member_nationalId_key";

CREATE INDEX "Member_nationalId_idx" ON "Member"("nationalId");
