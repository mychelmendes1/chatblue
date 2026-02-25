/**
 * Merge duplicate contacts that share the same (companyId, canonicalPhone).
 * Keeps the contact with the most tickets (or oldest createdAt) as primary and moves all tickets from others to it, then deletes the duplicates.
 * Run after backfill-canonical-phone. Usage: npx tsx apps/api/src/scripts/merge-duplicate-contacts-by-canonical.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeDuplicateContacts() {
  console.log('Finding duplicate contacts by (companyId, canonicalPhone)...');

  // Find canonicalPhone values that have more than one contact in the same company
  const duplicates = await prisma.$queryRaw<
    Array<{ company_id: string; canonical_phone: string; cnt: bigint }>
  >`
    SELECT company_id, canonical_phone, COUNT(*)::bigint AS cnt
    FROM contacts
    WHERE canonical_phone IS NOT NULL
    GROUP BY company_id, canonical_phone
    HAVING COUNT(*) > 1
  `;

  console.log(`Found ${duplicates.length} (companyId, canonicalPhone) groups with duplicates`);

  let totalMerged = 0;
  let totalDeleted = 0;
  let errors = 0;

  for (const row of duplicates) {
    const { company_id: companyId, canonical_phone: canonicalPhone } = row;

    const contacts = await prisma.contact.findMany({
      where: { companyId, canonicalPhone },
      include: { _count: { select: { tickets: true } } },
      orderBy: [{ tickets: { _count: 'desc' } }, { createdAt: 'asc' }],
    });

    if (contacts.length < 2) continue;

    // Primary = first after ordering by ticket count desc, then createdAt asc
    const [primary, ...toMerge] = contacts;
    console.log(`\nMerging ${contacts.length} contacts for company ${companyId} canonical ${canonicalPhone}`);
    console.log(`  Primary: ${primary.id} (${primary.phone}) with ${primary._count.tickets} tickets`);

    for (const dup of toMerge) {
      try {
        const ticketCount = await prisma.ticket.count({ where: { contactId: dup.id } });
        if (ticketCount > 0) {
          await prisma.ticket.updateMany({
            where: { contactId: dup.id },
            data: { contactId: primary.id },
          });
          totalMerged += ticketCount;
          console.log(`  Moved ${ticketCount} tickets from ${dup.id} (${dup.phone}) to primary`);
        }

        await prisma.contact.delete({ where: { id: dup.id } });
        totalDeleted++;
        console.log(`  Deleted duplicate contact ${dup.id}`);
      } catch (e: any) {
        console.error(`  Error merging ${dup.id}:`, e?.message);
        errors++;
      }
    }
  }

  console.log(`\nDone. Tickets reassigned: ${totalMerged}, Duplicate contacts deleted: ${totalDeleted}, Errors: ${errors}`);
  await prisma.$disconnect();
}

mergeDuplicateContacts().catch((e) => {
  console.error(e);
  process.exit(1);
});
