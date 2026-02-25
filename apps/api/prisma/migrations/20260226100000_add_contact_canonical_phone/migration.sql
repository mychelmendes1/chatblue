-- Add canonical_phone to contacts for unifying same person (e.g. Brazil 9th digit: 554298067510 and 5542998067510 -> same contact)
ALTER TABLE "contacts" ADD COLUMN "canonical_phone" TEXT;

CREATE INDEX "contacts_company_id_canonical_phone_idx" ON "contacts"("company_id", "canonical_phone");
