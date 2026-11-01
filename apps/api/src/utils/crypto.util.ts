import crypto from 'crypto';
import { logger } from '../config/logger.js';

/**
 * Cifragem de segredos (tokens de acesso etc.) com AES-256-GCM.
 *
 * Formato armazenado: `enc:v1:<iv_b64>:<tag_b64>:<cipher_b64>`.
 * Chave: env `ENCRYPTION_KEY` (32 bytes, em hex ou base64).
 * Sem chave: grava/lê em texto puro (instalações antigas continuam funcionando).
 */

const PREFIX = 'enc:v1:';
const IV_LENGTH = 12;

let warnedMissingKey = false;
let cachedKeySource: string | undefined;
let cachedKey: Buffer | null = null;

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      logger.warn('[crypto] ENCRYPTION_KEY não definida: segredos serão armazenados em texto puro');
    }
    return null;
  }
  if (raw === cachedKeySource) return cachedKey;

  let key: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) key = b64;
  }

  if (!key) {
    throw new Error('ENCRYPTION_KEY inválida: use 32 bytes em hex (64 caracteres) ou base64');
  }

  cachedKeySource = raw;
  cachedKey = key;
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('enc:');
}

export function encryptSecret(plain: string): string {
  if (plain == null || plain === '') return plain;
  if (isEncrypted(plain)) return plain; // já cifrado
  const key = getKey();
  if (!key) return plain;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  if (!stored.startsWith('enc:')) return stored; // legado em texto puro

  if (!stored.startsWith(PREFIX)) {
    throw new Error('Formato de segredo cifrado não suportado');
  }

  const key = getKey();
  if (!key) {
    throw new Error('Segredo cifrado encontrado mas ENCRYPTION_KEY não está definida');
  }

  const parts = stored.slice(PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Segredo cifrado malformado');
  }
  const [ivB64, tagB64, dataB64] = parts;

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
