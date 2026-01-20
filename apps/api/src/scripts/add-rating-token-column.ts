import { prisma } from '../config/database.js';

async function addMissingColumns() {
  try {
    // Add push_subscription column to users table
    console.log('Checking push_subscription column in users table...');
    
    const pushSubResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='push_subscription';
    `;
    
    if ((pushSubResult as any[]).length === 0) {
      console.log('Adding push_subscription column...');
      await prisma.$executeRaw`
        ALTER TABLE users 
        ADD COLUMN push_subscription TEXT;
      `;
      console.log('Column push_subscription added successfully');
    } else {
      console.log('Column push_subscription already exists');
    }

    // Add rating_token column to tickets table
    console.log('Checking rating_token column in tickets table...');
    
    const ratingTokenResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tickets' AND column_name='rating_token';
    `;
    
    if ((ratingTokenResult as any[]).length === 0) {
      console.log('Adding rating_token column...');
      await prisma.$executeRaw`
        ALTER TABLE tickets 
        ADD COLUMN rating_token VARCHAR(255) UNIQUE;
      `;
      console.log('Column rating_token added successfully');
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_tickets_rating_token ON tickets(rating_token);
      `;
      console.log('Index created successfully');
    } else {
      console.log('Column rating_token already exists');
    }

    // Add nps_score column to tickets table
    console.log('Checking nps_score column in tickets table...');
    
    const npsScoreResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tickets' AND column_name='nps_score';
    `;
    
    if ((npsScoreResult as any[]).length === 0) {
      console.log('Adding NPS columns...');
      await prisma.$executeRaw`
        ALTER TABLE tickets 
        ADD COLUMN nps_score INT,
        ADD COLUMN nps_comment TEXT,
        ADD COLUMN nps_rated_at TIMESTAMP;
      `;
      console.log('NPS columns added successfully');
    } else {
      console.log('NPS columns already exist');
    }

    // Add FCR and reopen columns to tickets table
    console.log('Checking is_first_contact_resolution column in tickets table...');
    
    const fcrResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tickets' AND column_name='is_first_contact_resolution';
    `;
    
    if ((fcrResult as any[]).length === 0) {
      console.log('Adding FCR and reopen columns...');
      await prisma.$executeRaw`
        ALTER TABLE tickets 
        ADD COLUMN is_first_contact_resolution BOOLEAN DEFAULT FALSE,
        ADD COLUMN reopen_count INT DEFAULT 0,
        ADD COLUMN reopened_at TIMESTAMP,
        ADD COLUMN abandoned_at TIMESTAMP,
        ADD COLUMN was_abandoned BOOLEAN DEFAULT FALSE;
      `;
      console.log('FCR and reopen columns added successfully');
    } else {
      console.log('FCR and reopen columns already exist');
    }

    console.log('All missing columns have been added!');
  } catch (error: any) {
    if (error.code === '42701' || error.message?.includes('already exists')) {
      console.log('Some columns already exist, continuing...');
    } else {
      console.error('Error adding columns:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();

