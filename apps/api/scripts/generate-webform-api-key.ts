import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function generateApiKey(companyName: string) {
  try {
    // Buscar empresa pelo nome
    const company = await prisma.company.findFirst({
      where: {
        name: {
          contains: companyName,
          mode: 'insensitive',
        },
      },
    });

    if (!company) {
      console.error(`❌ Empresa "${companyName}" não encontrada.`);
      console.log('\nEmpresas disponíveis:');
      const allCompanies = await prisma.company.findMany({
        select: { id: true, name: true, slug: true },
      });
      allCompanies.forEach((c) => {
        console.log(`  - ${c.name} (${c.slug})`);
      });
      process.exit(1);
    }

    // Gerar API Key segura (64 caracteres hexadecimais)
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Atualizar empresa com a nova API Key
    const updated = await prisma.company.update({
      where: { id: company.id },
      data: { webformApiKey: apiKey },
      select: {
        id: true,
        name: true,
        slug: true,
        webformApiKey: true,
      },
    });

    console.log('\n✅ API Key gerada com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Empresa: ${updated.name}`);
    console.log(`Slug: ${updated.slug}`);
    console.log(`API Key: ${updated.webformApiKey}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANTE: Guarde esta chave em local seguro!');
    console.log('   Ela será necessária para autenticar requisições do formulário web.\n');

    return apiKey;
  } catch (error: any) {
    console.error('❌ Erro ao gerar API Key:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
const companyName = process.argv[2] || 'Tokeniza';
generateApiKey(companyName);








