import crypto from 'crypto';

/**
 * Valida o header X-Hub-Signature-256 (HMAC-SHA256 do corpo bruto com o App Secret).
 * Sem META_APP_SECRET configurado: aceita (com aviso) para não quebrar instalações antigas.
 */
export function verifyMetaSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string | undefined = process.env.META_APP_SECRET
): { valid: boolean; skipped?: boolean } {
  if (!appSecret) {
    return { valid: true, skipped: true };
  }
  if (!rawBody || !signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return { valid: false };
  }
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signatureHeader.slice('sha256='.length).trim().toLowerCase();
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(received, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false };
  }
  return { valid: crypto.timingSafeEqual(expectedBuf, receivedBuf) };
}
