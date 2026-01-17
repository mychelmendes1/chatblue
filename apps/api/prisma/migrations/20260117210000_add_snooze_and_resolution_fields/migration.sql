-- Add SNOOZED status to TicketStatus enum
ALTER TYPE "TicketStatus" ADD VALUE 'SNOOZED';

-- Add TICKET_SNOOZED and TICKET_UNSNOOZED to ActivityType enum
ALTER TYPE "ActivityType" ADD VALUE 'TICKET_SNOOZED';
ALTER TYPE "ActivityType" ADD VALUE 'TICKET_UNSNOOZED';

-- Add resolution note field to tickets
ALTER TABLE "tickets" ADD COLUMN "resolution_note" TEXT;

-- Add snooze fields to tickets
ALTER TABLE "tickets" ADD COLUMN "snoozed_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN "snoozed_until" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN "snooze_reason" TEXT;

-- Add index for snooze lookup
CREATE INDEX "tickets_status_snoozed_until_idx" ON "tickets"("status", "snoozed_until");
