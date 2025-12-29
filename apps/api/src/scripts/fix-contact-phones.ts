/**
 * Script to fix contact phone numbers that have WhatsApp JID suffixes (@lid, @s.whatsapp.net, etc)
 * Run with: npx tsx apps/api/src/scripts/fix-contact-phones.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove WhatsApp JID suffix if present (@s.whatsapp.net, @lid, etc)
  let normalized = phone.replace(/@[^@]*$/g, '');
  
  // Remove all non-numeric characters
  normalized = normalized.replace(/\D/g, '');
  
  return normalized;
}

async function fixContactPhones() {
  console.log('🔍 Searching for contacts with invalid phone numbers...');

  // Find all contacts with @ in phone number
  const contacts = await prisma.contact.findMany({
    where: {
      phone: {
        contains: '@',
      },
    },
    select: {
      id: true,
      phone: true,
      name: true,
      companyId: true,
    },
  });

  console.log(`📋 Found ${contacts.length} contacts with invalid phone numbers`);

  if (contacts.length === 0) {
    console.log('✅ No contacts to fix!');
    await prisma.$disconnect();
    return;
  }

  let fixed = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      const normalized = normalizePhoneNumber(contact.phone);
      
      if (!normalized || normalized.length === 0) {
        console.error(`❌ Invalid phone number for contact ${contact.id}: ${contact.phone}`);
        errors++;
        continue;
      }

      // Check if normalized phone already exists for another contact in the same company
      const existing = await prisma.contact.findFirst({
        where: {
          companyId: contact.companyId,
          phone: normalized,
          id: { not: contact.id },
        },
      });

      if (existing) {
        console.warn(`⚠️  Contact ${contact.id} (${contact.name || 'sem nome'}) has phone ${contact.phone} that normalizes to ${normalized}, but contact ${existing.id} already has this number. Skipping.`);
        errors++;
        continue;
      }

      // Update contact with normalized phone
      await prisma.contact.update({
        where: { id: contact.id },
        data: { phone: normalized },
      });

      console.log(`✅ Fixed contact ${contact.id} (${contact.name || 'sem nome'}): ${contact.phone} -> ${normalized}`);
      fixed++;
    } catch (error: any) {
      console.error(`❌ Error fixing contact ${contact.id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📋 Total: ${contacts.length}`);

  await prisma.$disconnect();
}

fixContactPhones()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });





