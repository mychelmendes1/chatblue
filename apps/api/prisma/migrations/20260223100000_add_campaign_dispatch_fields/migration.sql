-- AlterTable: add campaign fields to tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "campaign_id" INTEGER;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "campaign_dispatched_at" TIMESTAMP(3);

-- CreateTable: idempotency for campaign.dispatched webhook
CREATE TABLE IF NOT EXISTS "campaign_dispatches" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "dispatched_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_dispatches_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_dispatches_company_id_campaign_id_dispatched_at_key" ON "campaign_dispatches"("company_id", "campaign_id", "dispatched_at");

-- Index for lookups
CREATE INDEX IF NOT EXISTS "campaign_dispatches_company_id_campaign_id_dispatched_at_idx" ON "campaign_dispatches"("company_id", "campaign_id", "dispatched_at");

-- Index on tickets for mass-dispatch filter
CREATE INDEX IF NOT EXISTS "tickets_company_id_campaign_id_idx" ON "tickets"("company_id", "campaign_id");

-- AddForeignKey
ALTER TABLE "campaign_dispatches" ADD CONSTRAINT "campaign_dispatches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
