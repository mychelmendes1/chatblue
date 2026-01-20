import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

// Carregar variáveis de ambiente
config();

const prisma = new PrismaClient();

async function diagnoseAI() {
  console.log('\n🔍 DIAGNÓSTICO DA IA\n');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar todas as empresas
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`\n📊 Encontradas ${companies.length} empresa(s)\n`);

    for (const company of companies) {
      console.log(`\n🏢 Empresa: ${company.name} (${company.id})`);
      console.log('-'.repeat(60));

      // 2. Verificar configurações da empresa
      const settings = await prisma.companySettings.findUnique({
        where: { companyId: company.id },
      });

      if (!settings) {
        console.log('❌ CompanySettings não encontrado - será criado automaticamente quando acessar configurações');
        continue;
      }

      console.log('\n📋 Configurações da Empresa:');
      console.log(`  • AI Habilitada: ${settings.aiEnabled ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`  • Provedor AI: ${settings.aiProvider || '❌ Não configurado'}`);
      console.log(`  • API Key: ${settings.aiApiKey ? `✅ Configurada (${settings.aiApiKey.substring(0, 10)}...)` : '❌ Não configurada'}`);
      console.log(`  • Modelo Padrão: ${settings.aiDefaultModel || '❌ Não configurado'}`);
      console.log(`  • System Prompt: ${settings.aiSystemPrompt ? `✅ Configurado (${settings.aiSystemPrompt.substring(0, 50)}...)` : '❌ Não configurado'}`);

      // 3. Verificar usuários IA
      const aiUsers = await prisma.user.findMany({
        where: {
          companyId: company.id,
          isAI: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          aiConfig: true,
        },
      });

      console.log(`\n🤖 Usuários IA: ${aiUsers.length}`);
      
      if (aiUsers.length === 0) {
        console.log('  ❌ Nenhum usuário IA encontrado!');
        console.log('  💡 Solução: Crie um usuário IA através da interface (Configurações > Agente IA) ou pelo seed');
      } else {
        for (const aiUser of aiUsers) {
          console.log(`\n  👤 ${aiUser.name} (${aiUser.email})`);
          console.log(`    • ID: ${aiUser.id}`);
          console.log(`    • Ativo: ${aiUser.isActive ? '✅ SIM' : '❌ NÃO'}`);
          
          if (!aiUser.isActive) {
            console.log('    ⚠️  Usuário IA está INATIVO - a IA não funcionará!');
          }

          if (aiUser.aiConfig) {
            const config = aiUser.aiConfig as any;
            console.log(`    • Provider: ${config.provider || '❌ Não configurado'}`);
            console.log(`    • Model: ${config.model || '❌ Não configurado'}`);
            console.log(`    • System Prompt: ${config.systemPrompt ? `✅ Configurado (${config.systemPrompt.substring(0, 40)}...)` : '❌ Não configurado'}`);
            console.log(`    • Temperature: ${config.temperature ?? 'Não configurado'}`);
            console.log(`    • Max Tokens: ${config.maxTokens ?? 'Não configurado'}`);
          } else {
            console.log('    ❌ aiConfig não está configurado!');
            console.log('    💡 Solução: Configure o aiConfig através da interface (Configurações > Agente IA)');
          }
        }
      }

      // 4. Verificar tickets recentes
      const recentTickets = await prisma.ticket.findMany({
        where: {
          companyId: company.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
          },
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              isAI: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      });

      console.log(`\n🎫 Tickets das últimas 24h: ${recentTickets.length}`);
      
      if (recentTickets.length > 0) {
        for (const ticket of recentTickets) {
          console.log(`  • Protocolo ${ticket.protocol} - Status: ${ticket.status}`);
          if (ticket.assignedTo) {
            console.log(`    → Atribuído a: ${ticket.assignedTo.name} ${ticket.assignedTo.isAI ? '(IA)' : '(Humano)'} ${ticket.assignedTo.isActive ? '' : '❌ INATIVO'}`);
            console.log(`    → isAIHandled: ${ticket.isAIHandled ? '✅ SIM' : '❌ NÃO'}`);
          } else {
            console.log(`    → ❌ Não atribuído a nenhum usuário`);
          }
        }
      }

      // 5. Resumo dos problemas
      console.log(`\n📝 RESUMO DOS PROBLEMAS ENCONTRADOS:`);
      const problems: string[] = [];

      if (!settings.aiEnabled) {
        problems.push('❌ AI não está habilitada nas configurações da empresa');
      }

      if (!settings.aiApiKey) {
        problems.push('❌ API Key não está configurada');
      }

      if (!settings.aiProvider) {
        problems.push('❌ Provedor AI não está configurado');
      }

      if (aiUsers.length === 0) {
        problems.push('❌ Nenhum usuário IA encontrado');
      } else {
        const activeAIUsers = aiUsers.filter(u => u.isActive);
        if (activeAIUsers.length === 0) {
          problems.push('❌ Nenhum usuário IA está ativo');
        }

        const aiUsersWithConfig = aiUsers.filter(u => u.aiConfig);
        if (aiUsersWithConfig.length === 0) {
          problems.push('❌ Nenhum usuário IA tem aiConfig configurado');
        }
      }

      if (problems.length === 0) {
        console.log('  ✅ Nenhum problema encontrado! A IA deveria estar funcionando.');
        console.log('  💡 Se ainda não estiver funcionando, verifique os logs da aplicação para erros específicos.');
      } else {
        console.log(`  Encontrados ${problems.length} problema(s):`);
        problems.forEach(p => console.log(`    ${p}`));
      }

      console.log('\n' + '='.repeat(60));
    }

  } catch (error: any) {
    console.error('\n❌ Erro durante diagnóstico:', error);
    logger.error('AI diagnosis error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar diagnóstico
diagnoseAI()
  .then(() => {
    console.log('\n✅ Diagnóstico concluído!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

