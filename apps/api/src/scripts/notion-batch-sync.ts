import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Client } from '@notionhq/client';

const prisma = new PrismaClient();

async function main() {
  const companyId = process.argv[2];
  const mode = process.argv[3] || 'update-existing';

  if (!companyId) {
    console.error('Uso: npx tsx notion-batch-sync.ts <companyId> [update-existing|full-search]');
    process.exit(1);
  }

  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  if (!settings?.notionApiKey || !settings?.notionDatabaseId) {
    console.error('Credenciais do Notion não configuradas.');
    process.exit(1);
  }

  const notion = new Client({ auth: settings.notionApiKey });
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  console.log(`\n=== Notion Batch Sync: ${company?.name} (${mode}) ===\n`);

  if (mode === 'update-existing') {
    await updateExistingNotionContacts(notion, companyId, settings.notionDatabaseId);
  } else {
    await fullSearch(notion, companyId, settings.notionDatabaseId);
  }

  await prisma.$disconnect();
}

async function updateExistingNotionContacts(notion: Client, companyId: string, dbId: string) {
  const contacts = await prisma.contact.findMany({
    where: { companyId, notionPageId: { not: null } },
    select: { id: true, phone: true, name: true, notionPageId: true },
  });

  console.log(`Contatos com Notion page ID: ${contacts.length}\n`);

  let clients = 0;
  let exClients = 0;
  let errors = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    try {
      const page = await notion.pages.retrieve({ page_id: contact.notionPageId! }) as any;
      const props = page.properties;

      const inativo = props['Cliente inativo?'];
      const cancelDate = props['Data de Cancelamento'];

      let isClient = true;
      let isExClient = false;

      if (inativo?.type === 'checkbox' && inativo.checkbox === true) {
        isClient = false;
        isExClient = true;
      }
      if (cancelDate?.date?.start) {
        isClient = false;
        isExClient = true;
      }

      if (isClient) clients++;
      if (isExClient) exClients++;

      const notionName = props['Nome do Cliente']?.title?.[0]?.plain_text;

      await prisma.contact.update({
        where: { id: contact.id },
        data: { isClient, isExClient, name: notionName || contact.name },
      });

      const status = isClient ? 'CLIENTE' : isExClient ? 'EX-CLIENTE' : '?';
      console.log(`[${i + 1}/${contacts.length}] ${status} - ${contact.phone} (${notionName || contact.name})`);

      if ((i + 1) % 3 === 0) await new Promise(r => setTimeout(r, 1100));
    } catch (err: any) {
      errors++;
      console.error(`[${i + 1}/${contacts.length}] ❌ ${contact.phone}: ${err.code || err.status || ''} ${err.message}`);
      if (err.status === 429) await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n=== Resultado ===');
  console.log(`Processados: ${contacts.length}`);
  console.log(`Clientes ativos: ${clients}`);
  console.log(`Ex-clientes: ${exClients}`);
  console.log(`Erros: ${errors}`);
}

async function fullSearch(notion: Client, companyId: string, dbId: string) {
  const dbInfo = await notion.databases.retrieve({ database_id: dbId }) as any;
  const telefoneProp = dbInfo.properties?.Telefone;
  const phoneType = telefoneProp?.type || 'phone_number';
  console.log(`Tipo do campo Telefone: ${phoneType}`);

  let hasEmail = true;

  const contacts = await prisma.contact.findMany({
    where: { companyId },
    select: { id: true, phone: true, name: true, email: true, notionPageId: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total de contatos: ${contacts.length}\n`);

  let found = 0, notFound = 0, clients = 0, exClients = 0, errors = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const cleanPhone = contact.phone.replace(/\D/g, '');

    try {
      let phoneFilter: any;
      if (phoneType === 'number') {
        phoneFilter = { property: 'Telefone', number: { equals: Number(cleanPhone) } };
      } else {
        phoneFilter = { property: 'Telefone', phone_number: { contains: cleanPhone.slice(-9) } };
      }

      const filters: any[] = [phoneFilter];
      if (contact.email && hasEmail) {
        filters.push({ property: 'Email', email: { equals: contact.email } });
      }

      let response;
      try {
        response = await notion.databases.query({
          database_id: dbId,
          filter: filters.length === 1 ? filters[0] : { or: filters },
        });
      } catch (filterErr: any) {
        if (filterErr?.code === 'validation_error' && filterErr?.message?.includes('Email')) {
          hasEmail = false;
          response = await notion.databases.query({ database_id: dbId, filter: phoneFilter });
        } else {
          throw filterErr;
        }
      }

      if (response.results.length === 0) {
        notFound++;
        if (i < 20 || i % 50 === 0) console.log(`[${i + 1}/${contacts.length}] ⬜ ${contact.phone} (${contact.name || '-'})`);
      } else {
        found++;
        const page = response.results[0] as any;
        const props = page.properties;

        const inativo = props['Cliente inativo?'];
        const cancelDate = props['Data de Cancelamento'];
        let isClient = true, isExClient = false;
        if (inativo?.type === 'checkbox' && inativo.checkbox === true) { isClient = false; isExClient = true; }
        if (cancelDate?.date?.start) { isClient = false; isExClient = true; }
        if (isClient) clients++;
        if (isExClient) exClients++;

        const notionName = props['Nome do Cliente']?.title?.[0]?.plain_text;

        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            notionPageId: page.id,
            isClient,
            isExClient,
            name: notionName || contact.name,
          },
        });

        const status = isClient ? 'CLIENTE' : isExClient ? 'EX-CLIENTE' : 'encontrado';
        console.log(`[${i + 1}/${contacts.length}] ✅ ${contact.phone} (${notionName || contact.name}) → ${status}`);
      }

      if ((i + 1) % 3 === 0) await new Promise(r => setTimeout(r, 1100));
    } catch (err: any) {
      errors++;
      console.error(`[${i + 1}/${contacts.length}] ❌ ${contact.phone}: ${err.code || err.status || ''} ${err.message}`);
      if (err.status === 429) {
        console.log('  Rate limited, aguardando 10s...');
        await new Promise(r => setTimeout(r, 10000));
      }
    }
  }

  console.log('\n=== Resultado ===');
  console.log(`Total: ${contacts.length} | Encontrados: ${found} | Não encontrados: ${notFound}`);
  console.log(`Clientes: ${clients} | Ex-clientes: ${exClients} | Erros: ${errors}`);
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
