-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "blue_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "blue_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "message" TEXT,
    "response" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blue_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blue_interactions_user_id_created_at_idx" ON "blue_interactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "blue_interactions_company_id_idx" ON "blue_interactions"("company_id");

-- AddForeignKey
ALTER TABLE "blue_interactions" ADD CONSTRAINT "blue_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blue_interactions" ADD CONSTRAINT "blue_interactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;




