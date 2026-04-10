-- CreateTable
CREATE TABLE "mcp_integration_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "secret_hash" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "mcp_integration_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_integration_key_companies" (
    "mcp_integration_key_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "mcp_integration_key_companies_pkey" PRIMARY KEY ("mcp_integration_key_id","company_id")
);

-- CreateIndex
CREATE INDEX "mcp_integration_keys_created_by_user_id_idx" ON "mcp_integration_keys"("created_by_user_id");

-- CreateIndex
CREATE INDEX "mcp_integration_keys_revoked_at_idx" ON "mcp_integration_keys"("revoked_at");

-- CreateIndex
CREATE INDEX "mcp_integration_key_companies_company_id_idx" ON "mcp_integration_key_companies"("company_id");

-- AddForeignKey
ALTER TABLE "mcp_integration_keys" ADD CONSTRAINT "mcp_integration_keys_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_integration_key_companies" ADD CONSTRAINT "mcp_integration_key_companies_mcp_integration_key_id_fkey" FOREIGN KEY ("mcp_integration_key_id") REFERENCES "mcp_integration_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_integration_key_companies" ADD CONSTRAINT "mcp_integration_key_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
