import 'dotenv/config';
import { Client } from '@notionhq/client';

async function main() {
  const apiKey = process.argv[2];
  const dbId = process.argv[3];
  if (!apiKey || !dbId) {
    console.error('Uso: npx tsx notion-check-props.ts <NOTION_API_KEY> <DATABASE_ID>');
    process.exit(1);
  }

  const notion = new Client({ auth: apiKey });

  // 1. Schema do database
  const db = await notion.databases.retrieve({ database_id: dbId }) as any;
  console.log('\n=== Propriedades do Database ===');
  for (const [name, prop] of Object.entries(db.properties)) {
    const p = prop as any;
    let extra = '';
    if (p.type === 'select' && p.select?.options) {
      extra = ` → opções: [${p.select.options.map((o: any) => o.name).join(', ')}]`;
    }
    if (p.type === 'status' && p.status?.options) {
      extra = ` → opções: [${p.status.options.map((o: any) => o.name).join(', ')}]`;
    }
    console.log(`  ${name}: ${p.type}${extra}`);
  }

  // 2. Primeiros 3 registros com suas propriedades
  const pages = await notion.databases.query({ database_id: dbId, page_size: 3 });
  console.log(`\n=== Amostra de ${pages.results.length} registro(s) ===`);
  for (const page of pages.results) {
    const props = (page as any).properties;
    console.log('\n---');
    for (const [name, value] of Object.entries(props)) {
      const v = value as any;
      let display = '';
      switch (v.type) {
        case 'title': display = v.title?.[0]?.plain_text || '(vazio)'; break;
        case 'rich_text': display = v.rich_text?.[0]?.plain_text || '(vazio)'; break;
        case 'number': display = String(v.number ?? '(vazio)'); break;
        case 'select': display = v.select?.name || '(vazio)'; break;
        case 'status': display = v.status?.name || '(vazio)'; break;
        case 'email': display = v.email || '(vazio)'; break;
        case 'phone_number': display = v.phone_number || '(vazio)'; break;
        case 'checkbox': display = String(v.checkbox); break;
        case 'date': display = v.date?.start || '(vazio)'; break;
        case 'multi_select': display = v.multi_select?.map((s: any) => s.name).join(', ') || '(vazio)'; break;
        default: display = `[${v.type}]`;
      }
      console.log(`  ${name} (${v.type}): ${display}`);
    }
  }
}

main().catch(console.error);
