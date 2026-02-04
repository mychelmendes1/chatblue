-- AlterTable: Add AI settings to WhatsApp connections
-- Allows enabling/disabling AI per connection and setting a default user

-- Add ai_enabled column (default true to maintain existing behavior)
ALTER TABLE "whatsapp_connections" ADD COLUMN IF NOT EXISTS "ai_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Add default_user_id column (nullable, references users)
ALTER TABLE "whatsapp_connections" ADD COLUMN IF NOT EXISTS "default_user_id" TEXT;

-- Add foreign key constraint for default_user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_connections_default_user_id_fkey'
    ) THEN
        ALTER TABLE "whatsapp_connections" 
        ADD CONSTRAINT "whatsapp_connections_default_user_id_fkey" 
        FOREIGN KEY ("default_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index for default_user_id
CREATE INDEX IF NOT EXISTS "whatsapp_connections_default_user_id_idx" ON "whatsapp_connections"("default_user_id");
