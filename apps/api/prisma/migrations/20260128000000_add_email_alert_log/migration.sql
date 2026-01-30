-- CreateTable
CREATE TABLE "email_alert_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_alert_logs_company_id_alert_type_entity_id_idx" ON "email_alert_logs"("company_id", "alert_type", "entity_id");

-- CreateIndex
CREATE INDEX "email_alert_logs_sent_at_idx" ON "email_alert_logs"("sent_at");

-- AddForeignKey
ALTER TABLE "email_alert_logs" ADD CONSTRAINT "email_alert_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
