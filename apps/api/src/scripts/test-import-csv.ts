/**
 * Test script for CSV import parsing. Run: npx tsx src/scripts/test-import-csv.ts
 */

function normalizePhoneForImport(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.length === 10) return '55' + digits;
  return digits;
}

const MAX_IMPORT_ROWS = 5000;

type Mapping = { phoneColumn: number; nameColumn: number | null; messageColumn: number | null };

function parse(
  buffer: Buffer,
  mapping: Mapping,
  explicitSeparator?: string
): { phone: string; name?: string; message?: string }[] {
  let text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const first = lines[0];
  const separator =
    explicitSeparator === ';' || explicitSeparator === ','
      ? explicitSeparator
      : first.includes(';')
        ? ';'
        : ',';
  const startIndex = 1;
  const phoneCol = mapping.phoneColumn;
  const nameCol = mapping.nameColumn ?? -1;
  const msgCol = mapping.messageColumn ?? -1;

  const rows: { phone: string; name?: string; message?: string }[] = [];
  for (let i = startIndex; i < lines.length && rows.length < MAX_IMPORT_ROWS; i++) {
    const parts = lines[i].split(separator).map((p) => p.trim());
    const rawPhone = parts[phoneCol] ?? '';
    const phone = normalizePhoneForImport(rawPhone);
    if (phone.length < 10) continue;
    rows.push({
      phone,
      name: nameCol >= 0 && parts[nameCol] !== undefined ? parts[nameCol] || undefined : undefined,
      message: msgCol >= 0 && parts[msgCol] !== undefined ? parts[msgCol] || undefined : undefined,
    });
  }
  return rows;
}

const csvWithComma = 'telefone,nome,mensagem\n11999998888,João,Oi tudo bem?\n21987654321,Maria,Olá';
const csvWithSemicolon = 'telefone;nome;mensagem\n11999998888;João;Oi\n21987654321;Maria;Olá';

const mapping: Mapping = { phoneColumn: 0, nameColumn: 1, messageColumn: 2 };

console.log('--- Test 1: CSV with comma, separator passed explicitly ---');
const r1 = parse(Buffer.from(csvWithComma, 'utf-8'), mapping, ',');
console.log('Rows:', r1.length, r1);

console.log('\n--- Test 2: CSV with comma, no explicit separator ---');
const r2 = parse(Buffer.from(csvWithComma, 'utf-8'), mapping);
console.log('Rows:', r2.length, r2);

console.log('\n--- Test 3: CSV with semicolon, separator ; ---');
const r3 = parse(Buffer.from(csvWithSemicolon, 'utf-8'), mapping, ';');
console.log('Rows:', r3.length, r3);

console.log('\n--- Test 4: CSV with comma but wrong separator ; (would break) ---');
const r4 = parse(Buffer.from(csvWithComma, 'utf-8'), mapping, ';');
console.log('Rows:', r4.length, r4);

console.log('\n--- Test 5: phoneColumn=1 (nome column - no digits) ---');
const r5 = parse(Buffer.from(csvWithComma, 'utf-8'), { phoneColumn: 1, nameColumn: 0, messageColumn: 2 }, ',');
console.log('Rows:', r5.length, r5);

if (r1.length === 2 && r2.length === 2 && r3.length === 2 && r4.length === 0 && r5.length === 0) {
  console.log('\nAll tests passed.');
} else {
  console.log('\nSome tests failed.');
  process.exit(1);
}
