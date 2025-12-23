import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default company
  const company = await prisma.company.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      plan: 'PRO',
      settings: {
        create: {
          aiEnabled: true,
          autoAssign: true,
          maxTicketsPerAgent: 10,
          welcomeMessage: 'Olá! Bem-vindo ao atendimento. Como posso ajudar?',
          awayMessage: 'No momento estamos fora do horário de atendimento. Retornaremos em breve!',
        },
      },
    },
  });

  console.log(`Created company: ${company.name}`);

  // Create super admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@chatblue.com' },
    update: {},
    create: {
      email: 'admin@chatblue.com',
      password: adminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      companyId: company.id,
    },
  });

  console.log(`Created admin: ${admin.email}`);

  // Create departments
  const triagem = await prisma.department.upsert({
    where: { id: 'triagem-dept' },
    update: {},
    create: {
      id: 'triagem-dept',
      name: 'Triagem',
      description: 'Departamento inicial de atendimento',
      color: '#6366f1',
      order: 0,
      companyId: company.id,
    },
  });

  const comercial = await prisma.department.upsert({
    where: { id: 'comercial-dept' },
    update: {},
    create: {
      id: 'comercial-dept',
      name: 'Comercial',
      description: 'Departamento comercial',
      color: '#22c55e',
      order: 1,
      parentId: triagem.id,
      companyId: company.id,
    },
  });

  const suporte = await prisma.department.upsert({
    where: { id: 'suporte-dept' },
    update: {},
    create: {
      id: 'suporte-dept',
      name: 'Suporte',
      description: 'Departamento de suporte técnico',
      color: '#f59e0b',
      order: 2,
      parentId: triagem.id,
      companyId: company.id,
    },
  });

  const financeiro = await prisma.department.upsert({
    where: { id: 'financeiro-dept' },
    update: {},
    create: {
      id: 'financeiro-dept',
      name: 'Financeiro',
      description: 'Departamento financeiro',
      color: '#ef4444',
      order: 3,
      parentId: triagem.id,
      companyId: company.id,
    },
  });

  console.log('Created departments');

  // Create AI user
  const aiUser = await prisma.user.upsert({
    where: { email: 'maria@chatblue.ai' },
    update: {},
    create: {
      email: 'maria@chatblue.ai',
      password: await bcrypt.hash('ai123456', 10),
      name: 'Maria (IA)',
      role: 'AGENT',
      isAI: true,
      aiConfig: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 500,
        systemPrompt: `Você é Maria, assistente virtual da Demo Company.
Seja educada, prestativa e profissional.
Responda sempre em português brasileiro.
Se não souber responder algo, diga que vai transferir para um atendente humano.
Se o cliente pedir para falar com um humano, transfira imediatamente.`,
        triggerKeywords: ['humano', 'atendente', 'pessoa', 'reclamação', 'falar com alguém'],
        maxInteractionsBeforeTransfer: 10,
      },
      companyId: company.id,
    },
  });

  // Assign AI to triagem
  await prisma.userDepartment.upsert({
    where: { userId_departmentId: { userId: aiUser.id, departmentId: triagem.id } },
    update: {},
    create: {
      userId: aiUser.id,
      departmentId: triagem.id,
    },
  });

  console.log(`Created AI user: ${aiUser.name}`);

  // Create agent users
  const agents = [
    { email: 'joao@demo.com', name: 'João Silva', dept: comercial },
    { email: 'ana@demo.com', name: 'Ana Santos', dept: suporte },
    { email: 'pedro@demo.com', name: 'Pedro Costa', dept: financeiro },
  ];

  for (const agent of agents) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        email: agent.email,
        password: await bcrypt.hash('agent123', 10),
        name: agent.name,
        role: 'AGENT',
        companyId: company.id,
      },
    });

    await prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId: user.id, departmentId: agent.dept.id } },
      update: {},
      create: {
        userId: user.id,
        departmentId: agent.dept.id,
      },
    });

    console.log(`Created agent: ${user.name}`);
  }

  // Create SLA configs
  await prisma.sLAConfig.upsert({
    where: { id: 'default-sla' },
    update: {},
    create: {
      id: 'default-sla',
      name: 'SLA Padrão',
      firstResponseTime: 15,
      resolutionTime: 240,
      businessHours: {
        start: '09:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5], // Monday to Friday
      },
      isDefault: true,
      companyId: company.id,
    },
  });

  console.log('Created SLA config');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
