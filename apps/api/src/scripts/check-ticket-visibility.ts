import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Carregar variáveis de ambiente PRIMEIRO
config();

// Criar Prisma Client após carregar variáveis
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkTicketVisibility() {
  const phone = '554896195555';
  
  console.log(`\n🔍 VERIFICANDO VISIBILIDADE DO TICKET PARA ${phone}\n`);
  console.log('='.repeat(60));

  try {
    // 1. Buscar o contato
    const contact = await prisma.contact.findFirst({
      where: {
        phone: { contains: phone },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!contact) {
      console.log(`❌ Contato com telefone ${phone} não encontrado`);
      await prisma.$disconnect();
      return;
    }

    console.log(`\n📞 Contato encontrado:`);
    console.log(`  • ID: ${contact.id}`);
    console.log(`  • Nome: ${contact.name || 'Sem nome'}`);
    console.log(`  • Telefone: ${contact.phone}`);
    console.log(`  • Empresa: ${contact.company.name} (${contact.company.id})`);

    // 2. Buscar tickets do contato
    const tickets = await prisma.ticket.findMany({
      where: {
        contactId: contact.id,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
        contact: {
          select: {
            phone: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`\n🎫 Tickets encontrados: ${tickets.length}`);

    for (const ticket of tickets) {
      console.log(`\n  📋 Protocolo: ${ticket.protocol}`);
      console.log(`    • Status: ${ticket.status}`);
      console.log(`    • Atribuído a: ${ticket.assignedTo ? `${ticket.assignedTo.name} (${ticket.assignedTo.email})` : '❌ Ninguém'}`);
      console.log(`    • Departamento: ${ticket.department ? `${ticket.department.name} (${ticket.department.id})` : '❌ Nenhum'}`);
      console.log(`    • isAIHandled: ${ticket.isAIHandled ? '✅ Sim' : '❌ Não'}`);
    }

    // 3. Buscar usuário Tayara
    const tayara = await prisma.user.findFirst({
      where: {
        name: { contains: 'Tayara', mode: 'insensitive' },
        companyId: contact.companyId,
      },
      include: {
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
      },
    });

    if (!tayara) {
      console.log(`\n❌ Usuária Tayara não encontrada na empresa ${contact.company.name}`);
    } else {
      console.log(`\n👤 Usuária Tayara:`);
      console.log(`  • ID: ${tayara.id}`);
      console.log(`  • Nome: ${tayara.name}`);
      console.log(`  • Email: ${tayara.email}`);
      console.log(`  • Role: ${tayara.role}`);
      console.log(`  • Ativa: ${tayara.isActive ? '✅ Sim' : '❌ Não'}`);
      
      const deptIds = tayara.departments.map(d => d.departmentId);
      console.log(`  • Departamentos (${deptIds.length}):`);
      
      if (deptIds.length === 0) {
        console.log(`    ⚠️  Nenhum departamento atribuído!`);
        console.log(`    💡 Tayara só verá tickets atribuídos diretamente a ela ou não atribuídos`);
      } else {
        for (const userDept of tayara.departments) {
          console.log(`    • ${userDept.department.name} (${userDept.department.id})`);
          if (userDept.department.parentId) {
            const parent = await prisma.department.findUnique({
              where: { id: userDept.department.parentId },
              select: { name: true },
            });
            console.log(`      └─ Parent: ${parent?.name || 'N/A'}`);
          }
        }
      }

      // 4. Verificar visibilidade de cada ticket para Tayara
      console.log(`\n🔍 ANÁLISE DE VISIBILIDADE:\n`);
      
      for (const ticket of tickets) {
        console.log(`\n  📋 Ticket ${ticket.protocol}:`);
        
        let canSee = false;
        const reasons: string[] = [];
        
        // Verificar se está atribuído a Tayara
        if (ticket.assignedToId === tayara.id) {
          canSee = true;
          reasons.push('✅ Atribuído diretamente a Tayara');
        }
        
        // Verificar se está no departamento de Tayara
        if (ticket.departmentId && deptIds.includes(ticket.departmentId)) {
          canSee = true;
          reasons.push(`✅ Ticket está no departamento ${ticket.department?.name}`);
        }
        
        // Verificar departamentos pais
        if (ticket.departmentId) {
          const ticketDept = await prisma.department.findUnique({
            where: { id: ticket.departmentId },
            include: {
              parent: {
                select: { id: true, name: true },
              },
            },
          });
          
          if (ticketDept?.parentId && deptIds.includes(ticketDept.parentId)) {
            canSee = true;
            reasons.push(`✅ Ticket está em departamento filho de ${ticketDept.parent.name}`);
          }
        }
        
        // Se Tayara não tem departamentos, pode ver tickets não atribuídos
        if (deptIds.length === 0 && !ticket.assignedToId) {
          canSee = true;
          reasons.push('✅ Tayara não tem departamentos e ticket não está atribuído');
        }
        
        // Verificar role
        if (['SUPER_ADMIN', 'ADMIN'].includes(tayara.role)) {
          canSee = true;
          reasons.push('✅ Tayara é ADMIN/SUPER_ADMIN - vê todos os tickets');
        }
        
        if (canSee) {
          console.log(`    ✅ VISÍVEL para Tayara`);
          reasons.forEach(r => console.log(`      ${r}`));
        } else {
          console.log(`    ❌ NÃO VISÍVEL para Tayara`);
          console.log(`      Motivos:`);
          if (ticket.assignedToId && ticket.assignedToId !== tayara.id) {
            console.log(`        • Ticket atribuído a ${ticket.assignedTo?.name || 'outro usuário'}`);
          }
          if (ticket.departmentId && !deptIds.includes(ticket.departmentId)) {
            console.log(`        • Ticket no departamento ${ticket.department?.name} que Tayara não faz parte`);
            if (ticket.department?.parentId) {
              const parent = await prisma.department.findUnique({
                where: { id: ticket.department.parentId },
                select: { name: true },
              });
              console.log(`        • Departamento pai: ${parent?.name || 'N/A'}`);
            }
          }
          if (!ticket.departmentId && deptIds.length > 0) {
            console.log(`        • Ticket sem departamento, mas Tayara tem departamentos atribuídos`);
          }
        }
      }
    }

    // 5. Buscar super admin para comparação
    const superAdmin = await prisma.user.findFirst({
      where: {
        companyId: contact.companyId,
        role: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (superAdmin) {
      console.log(`\n👑 Super Admin:`);
      console.log(`  • ${superAdmin.name} (${superAdmin.email})`);
      console.log(`  • ✅ Vê TODOS os tickets da empresa (sem filtro de visibilidade)`);
    }

  } catch (error: any) {
    console.error('\n❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicketVisibility()
  .then(() => {
    console.log('\n✅ Verificação concluída!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

