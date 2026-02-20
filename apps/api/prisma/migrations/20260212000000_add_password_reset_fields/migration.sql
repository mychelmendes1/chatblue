-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(3);

-- CreateIndex (unique constraint for password_reset_token)
CREATE UNIQUE INDEX IF NOT EXISTS "users_password_reset_token_key" ON "users"("password_reset_token");

-- CreateIndex (optional, for lookups)
CREATE INDEX IF NOT EXISTS "idx_users_password_reset_token" ON "users"("password_reset_token") WHERE "password_reset_token" IS NOT NULL;
