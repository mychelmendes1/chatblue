-- CreateTable
CREATE TABLE "predefined_messages" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "name" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predefined_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "predefined_messages_company_id_shortcut_key" ON "predefined_messages"("company_id", "shortcut");

-- CreateIndex
CREATE INDEX "predefined_messages_company_id_idx" ON "predefined_messages"("company_id");

-- AddForeignKey
ALTER TABLE "predefined_messages" ADD CONSTRAINT "predefined_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
