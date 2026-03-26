-- AlterTable
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "survey_sent_at" TIMESTAMP(3);
