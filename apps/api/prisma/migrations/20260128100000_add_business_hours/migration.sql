-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "business_hours_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "business_hours_timezone" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "business_hours_days" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "business_hours_start_time" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "business_hours_end_time" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "out_of_hours_message" TEXT;
