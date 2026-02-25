/**
 * Backfill canonical_phone for existing contacts.
 * Run after applying the migration that adds canonical_phone.
 * Usage: npx tsx apps/api/src/scripts/backfill-canonical-phone.ts
 */

import { PrismaClient } from '@prisma/client';
import { toCanonicalPhone } from '../utils/canonical-phone.js';

const prisma = new PrismaClient();

async function backfillCanonicalPhone() {
  console.log('Backfilling canonical_phone for contacts...');

  const contacts = await prisma.contact.findMany({
    where: { canonicalPhone: null },
    select: { id: true, phone: true, companyId: true },
  });

  console.log(`Found ${contacts.length} contacts with null canonical_phone`);

  let updated = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      const canonical = toCanonicalPhone(contact.phone);
      if (!canonical) {
        console.warn(`Contact ${contact.id}: empty canonical for phone ${contact.phone}`);
        continue;
      }
      await prisma.contact.update({
        where: { id: contact.id },
        data: { canonicalPhone: canonical },
      });
      updated++;
      if (updated % 500 === 0) console.log(`  Updated ${updated}...`);
    } catch (e: any) {
      console.error(`Contact ${contact.id}: ${e?.message}`);
      errors++;
    }
  }

  console.log(`Done. Updated: ${updated}, Errors: ${errors}`);
  await prisma.$disconnect();
}

backfillCanonicalPhone().catch((e) => {
  console.error(e);
  process.exit(1);
});
