import { prisma } from '../config/database.js';

interface ColumnDef {
  table: string;
  column: string;
  type: string;
  defaultValue?: string;
}

const columnsToAdd: ColumnDef[] = [
  // Users table
  { table: 'users', column: 'push_subscription', type: 'TEXT' },
  
  // Tickets table - Rating
  { table: 'tickets', column: 'rating_token', type: 'VARCHAR(255) UNIQUE' },
  
  // Tickets table - NPS
  { table: 'tickets', column: 'nps_score', type: 'INT' },
  { table: 'tickets', column: 'nps_comment', type: 'TEXT' },
  { table: 'tickets', column: 'nps_rated_at', type: 'TIMESTAMP' },
  
  // Tickets table - FCR and reopen
  { table: 'tickets', column: 'is_first_contact_resolution', type: 'BOOLEAN', defaultValue: 'FALSE' },
  { table: 'tickets', column: 'reopen_count', type: 'INT', defaultValue: '0' },
  { table: 'tickets', column: 'reopened_at', type: 'TIMESTAMP' },
  { table: 'tickets', column: 'abandoned_at', type: 'TIMESTAMP' },
  { table: 'tickets', column: 'was_abandoned', type: 'BOOLEAN', defaultValue: 'FALSE' },
  
  // Tickets table - Resolution
  { table: 'tickets', column: 'resolution_note', type: 'TEXT' },
  
  // Tickets table - Snooze
  { table: 'tickets', column: 'snoozed_at', type: 'TIMESTAMP' },
  { table: 'tickets', column: 'snoozed_until', type: 'TIMESTAMP' },
  { table: 'tickets', column: 'snooze_reason', type: 'TEXT' },
  
  // Tickets table - Previous ticket reference
  { table: 'tickets', column: 'previous_ticket_id', type: 'VARCHAR(255)' },
  
  // Contacts table - Instagram
  { table: 'contacts', column: 'instagram_id', type: 'VARCHAR(255)' },
  { table: 'contacts', column: 'lid_id', type: 'VARCHAR(255)' },
  
  // WhatsApp connections - Instagram fields
  { table: 'whatsapp_connections', column: 'instagram_account_id', type: 'VARCHAR(255)' },
  { table: 'whatsapp_connections', column: 'instagram_username', type: 'VARCHAR(255)' },
  
  // Company settings - Blue Assistant
  { table: 'company_settings', column: 'blue_enabled', type: 'BOOLEAN', defaultValue: 'TRUE' },
];

async function syncAllColumns() {
  console.log('Starting column synchronization...\n');
  
  let addedCount = 0;
  let existingCount = 0;
  let errorCount = 0;
  
  for (const col of columnsToAdd) {
    try {
      // Check if column exists
      const result = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='${col.table}' AND column_name='${col.column}';
      `);
      
      if ((result as any[]).length === 0) {
        console.log(`Adding ${col.table}.${col.column}...`);
        
        let sql = `ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`;
        if (col.defaultValue) {
          sql += ` DEFAULT ${col.defaultValue}`;
        }
        
        await prisma.$executeRawUnsafe(sql);
        console.log(`  ✅ Added ${col.table}.${col.column}`);
        addedCount++;
      } else {
        console.log(`  ⏭️  ${col.table}.${col.column} already exists`);
        existingCount++;
      }
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log(`  ⏭️  ${col.table}.${col.column} already exists`);
        existingCount++;
      } else {
        console.error(`  ❌ Error adding ${col.table}.${col.column}:`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log('\n==========================================');
  console.log(`Summary:`);
  console.log(`  - Added: ${addedCount}`);
  console.log(`  - Already existed: ${existingCount}`);
  console.log(`  - Errors: ${errorCount}`);
  console.log('==========================================\n');
  
  // Create indexes for new columns
  console.log('Creating indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_tickets_rating_token ON tickets(rating_token)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_snoozed_until ON tickets(snoozed_until)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_instagram_id ON contacts(instagram_id)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_lid_id ON contacts(lid_id)',
  ];
  
  for (const indexSql of indexes) {
    try {
      await prisma.$executeRawUnsafe(indexSql);
      console.log(`  ✅ Index created/exists`);
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error(`  ❌ Index error:`, error.message);
      }
    }
  }
  
  console.log('\nColumn synchronization complete!');
}

syncAllColumns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

