import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique protocol number for tickets
 * Format: YYYYMMDD-XXXX (where XXXX is a random 4-digit number)
 */
export function generateProtocol(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const random = Math.floor(1000 + Math.random() * 9000);

  return `${year}${month}${day}-${random}`;
}

/**
 * Generate a short unique ID
 */
export function generateShortId(): string {
  return uuidv4().split('-')[0];
}
