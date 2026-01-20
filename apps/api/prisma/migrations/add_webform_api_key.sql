-- Add webformApiKey column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS webform_api_key TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_webform_api_key ON companies(webform_api_key) WHERE webform_api_key IS NOT NULL;






