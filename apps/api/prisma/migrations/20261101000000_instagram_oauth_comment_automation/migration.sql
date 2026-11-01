-- CreateEnum
CREATE TYPE "InstagramCommentEventStatus" AS ENUM ('RECEIVED', 'MATCHED', 'REPLIED', 'PRIVATE_SENT', 'USER_REPLIED', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "whatsapp_connections" ADD COLUMN     "auth_method" TEXT,
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "last_token_refresh_at" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "token_expires_at" TIMESTAMP(3),
ADD COLUMN     "webhook_fields" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "instagram_username" TEXT,
ADD COLUMN     "window_source" TEXT;

-- CreateTable
CREATE TABLE "instagram_comment_automations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "media_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "match_mode" TEXT NOT NULL DEFAULT 'contains',
    "exclude_replies" BOOLEAN NOT NULL DEFAULT true,
    "public_replies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "private_message" JSONB NOT NULL,
    "department_id" TEXT,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "once_per_user" BOOLEAN NOT NULL DEFAULT true,
    "daily_limit" INTEGER,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "private_sent_count" INTEGER NOT NULL DEFAULT 0,
    "user_replied_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,

    CONSTRAINT "instagram_comment_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_comment_events" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "media_type" TEXT,
    "from_ig_id" TEXT NOT NULL,
    "from_username" TEXT,
    "text" TEXT NOT NULL,
    "parent_id" TEXT,
    "status" "InstagramCommentEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "skip_reason" TEXT,
    "error" TEXT,
    "public_reply_id" TEXT,
    "private_reply_message_id" TEXT,
    "private_sent_at" TIMESTAMP(3),
    "user_replied_at" TIMESTAMP(3),
    "ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "automation_id" TEXT,

    CONSTRAINT "instagram_comment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instagram_comment_automations_company_id_idx" ON "instagram_comment_automations"("company_id");

-- CreateIndex
CREATE INDEX "instagram_comment_automations_connection_id_is_active_idx" ON "instagram_comment_automations"("connection_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_comment_events_comment_id_key" ON "instagram_comment_events"("comment_id");

-- CreateIndex
CREATE INDEX "instagram_comment_events_company_id_created_at_idx" ON "instagram_comment_events"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "instagram_comment_events_connection_id_from_ig_id_idx" ON "instagram_comment_events"("connection_id", "from_ig_id");

-- CreateIndex
CREATE INDEX "instagram_comment_events_automation_id_from_ig_id_idx" ON "instagram_comment_events"("automation_id", "from_ig_id");

-- CreateIndex
CREATE INDEX "whatsapp_connections_instagram_account_id_idx" ON "whatsapp_connections"("instagram_account_id");

-- CreateIndex
CREATE INDEX "contacts_company_id_instagram_id_idx" ON "contacts"("company_id", "instagram_id");

-- AddForeignKey
ALTER TABLE "instagram_comment_automations" ADD CONSTRAINT "instagram_comment_automations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comment_automations" ADD CONSTRAINT "instagram_comment_automations_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comment_events" ADD CONSTRAINT "instagram_comment_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comment_events" ADD CONSTRAINT "instagram_comment_events_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comment_events" ADD CONSTRAINT "instagram_comment_events_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "instagram_comment_automations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

