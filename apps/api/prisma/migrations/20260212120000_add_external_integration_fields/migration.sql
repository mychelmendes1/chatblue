-- AlterTable: Integração externa (webhook de saída + API de métricas)
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "outbound_webhook_url" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "outbound_webhook_secret" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "external_integration_api_key" TEXT;
