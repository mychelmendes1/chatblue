import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';
import { upload } from '../services/upload/upload.service.js';
// @ts-ignore - pdf-parse types issue
import pdf from 'pdf-parse';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';
import { AIService } from '../services/ai/ai.service.js';

const router: RouterType = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
  isAI: z.boolean().optional(),
  isActive: z.boolean().optional(), // Allow setting active status
  companyId: z.string().cuid().optional(), // Allow SUPER_ADMIN to specify company
  aiConfig: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    systemPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().optional(),
    trainingData: z.string().optional(), // PDF extracted text for training
    triggerKeywords: z.array(z.string()).optional(),
    personalityTone: z.string().optional(),
    personalityStyle: z.string().optional(),
    useEmojis: z.boolean().optional(),
    useClientName: z.boolean().optional(),
    guardrailsEnabled: z.boolean().optional(),
  }).optional(),
  // Accept any array of strings and filter empty values, then validate CUIDs
  departmentIds: z.array(z.string()).optional().transform((val) => 
    val?.filter((id) => id && id.trim().length > 0) || []
  ),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true });

// List users
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { departmentId, isAI, isActive } = req.query;

    const users = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(departmentId && {
          departments: {
            some: { departmentId: departmentId as string },
          },
        }),
        ...(isAI !== undefined && { isAI: isAI === 'true' }),
        // Por padrão, mostrar apenas usuários ativos, a menos que seja explicitamente solicitado
        ...(isActive !== undefined 
          ? { isActive: isActive === 'true' } 
          : { isActive: true }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isAI: true,
        isActive: true,
        isOnline: true,
        lastSeen: true,
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// List AI agents
router.get('/ai-agents', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const agents = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        isAI: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isAI: true,
        isActive: true,
        aiConfig: true,
        departments: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform aiConfig to flat fields for frontend
    const transformedAgents = agents.map((agent) => {
      const config = agent.aiConfig as any || {};
      return {
        ...agent,
        aiModel: config.model || 'gpt-4-turbo-preview',
        aiTemperature: config.temperature || 0.7,
        aiMaxTokens: config.maxTokens || 1000,
        aiSystemPrompt: config.systemPrompt || '',
        transferKeywords: config.transferKeywords || [],
        trainingData: config.trainingData || '',
        // Personality settings
        aiPersonalityTone: config.personalityTone || 'friendly',
        aiPersonalityStyle: config.personalityStyle || 'conversational',
        aiUseEmojis: config.useEmojis ?? true,
        aiUseClientName: config.useClientName ?? true,
        aiGuardrailsEnabled: config.guardrailsEnabled ?? true,
        _count: {
          assignedTickets: agent._count.tickets, // Map to expected field name
        },
      };
    });

    res.json(transformedAgents);
  } catch (error) {
    next(error);
  }
});

// Get user
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isAI: true,
        aiConfig: true,
        isActive: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        departments: {
          include: {
            department: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING'] } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user's access to other companies
    const userCompanies = await prisma.userCompany.findMany({
      where: {
        userId: user.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isActive: true,
          },
        },
      },
    });

    res.json({
      ...user,
      companyAccess: userCompanies,
    });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError('Email already exists');
    }

    // Determine companyId: use provided companyId if SUPER_ADMIN, otherwise use current user's company
    let targetCompanyId = req.user!.companyId;
    if (data.companyId && req.user!.role === 'SUPER_ADMIN') {
      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
      });
      if (!company) {
        throw new NotFoundError('Company not found');
      }
      targetCompanyId = data.companyId;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    logger.info('Creating user', { 
      email: data.email, 
      name: data.name, 
      role: data.role || 'AGENT',
      companyId: targetCompanyId 
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'AGENT',
        isAI: data.isAI || false,
        isActive: data.isActive !== undefined ? data.isActive : true, // Explicitly set isActive
        aiConfig: data.aiConfig,
        companyId: targetCompanyId,
        departments: data.departmentIds
          ? {
              create: data.departmentIds.map((deptId) => ({
                departmentId: deptId,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAI: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
    });

    logger.info('User created successfully', { userId: user.id, email: user.email });
    res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user', { error, email: req.body.email });
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    // Get current user to check if it's an AI agent
    const currentUser = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: { aiConfig: true, isAI: true },
    });

    // Build aiConfig if this is an AI agent being updated
    let aiConfigUpdate = data.aiConfig;
    const isAIAgent = data.isAI || currentUser?.isAI;
    
    if (isAIAgent && (req.body.aiModel || req.body.aiSystemPrompt || req.body.trainingData || currentUser?.aiConfig)) {
      // Build aiConfig from flat fields for AI agents
      const currentConfig = (currentUser?.aiConfig as any) || {};
      
      // Get the base system prompt (without training data appendix)
      let baseSystemPrompt = req.body.aiSystemPrompt ?? currentConfig.systemPrompt ?? '';
      // Remove old training data appendix if present
      const trainingDataMarker = '\n\n---\n\nInformações da Empresa (Contexto para Treinamento):';
      if (baseSystemPrompt.includes(trainingDataMarker)) {
        baseSystemPrompt = baseSystemPrompt.split(trainingDataMarker)[0];
      }
      
      aiConfigUpdate = {
        provider: currentConfig.provider || 'openai',
        model: req.body.aiModel ?? currentConfig.model ?? 'gpt-4-turbo-preview',
        systemPrompt: baseSystemPrompt,
        temperature: req.body.aiTemperature ?? currentConfig.temperature ?? 0.7,
        maxTokens: req.body.aiMaxTokens ?? currentConfig.maxTokens ?? 1000,
        triggerKeywords: req.body.transferKeywords ?? currentConfig.triggerKeywords ?? [],
        trainingData: req.body.trainingData ?? currentConfig.trainingData ?? '',
        // Personality settings
        personalityTone: req.body.aiPersonalityTone ?? currentConfig.personalityTone ?? 'friendly',
        personalityStyle: req.body.aiPersonalityStyle ?? currentConfig.personalityStyle ?? 'conversational',
        useEmojis: req.body.aiUseEmojis ?? currentConfig.useEmojis ?? true,
        useClientName: req.body.aiUseClientName ?? currentConfig.useClientName ?? true,
        guardrailsEnabled: req.body.aiGuardrailsEnabled ?? currentConfig.guardrailsEnabled ?? true,
      };

      // If trainingData exists, append it to systemPrompt
      if (aiConfigUpdate && aiConfigUpdate.trainingData && aiConfigUpdate.systemPrompt) {
        (aiConfigUpdate as any).systemPrompt = `${aiConfigUpdate.systemPrompt}\n\n---\n\nInformações da Empresa (Contexto para Treinamento):\n\n${aiConfigUpdate.trainingData}`;
      }
    }

    // Extract departmentIds from data to avoid passing it to Prisma
    const { departmentIds, ...updateData } = data;

    const user = await prisma.user.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: {
        ...updateData,
        aiConfig: aiConfigUpdate || data.aiConfig,
        departments: departmentIds
          ? {
              deleteMany: {},
              create: departmentIds.map((deptId) => ({
                departmentId: deptId,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAI: true,
        isActive: true, // Include isActive in response
        aiConfig: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update AI config
router.put('/:id/ai-config', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const aiConfigSchema = z.object({
      provider: z.string(),
      model: z.string(),
      systemPrompt: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number(),
      triggerKeywords: z.array(z.string()).optional(),
      maxInteractionsBeforeTransfer: z.number().optional(),
      trainingData: z.string().optional(), // PDF extracted text for training
    });

    const aiConfig = aiConfigSchema.parse(req.body);

    const user = await prisma.user.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        isAI: true,
      },
      data: { aiConfig },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Add company access to user
router.post('/:id/company-access', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { companyId, role = 'USER' } = z.object({
      companyId: z.string().cuid(),
      role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
    }).parse(req.body);

    // Verify user exists and belongs to admin's company
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify target company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Check if access already exists
    const existing = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (existing) {
      // Update existing access
      const updated = await prisma.userCompany.update({
        where: { id: existing.id },
        data: {
          status: 'APPROVED',
          role,
          approvedById: req.user!.userId,
          approvedAt: new Date(),
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      });

      return res.json(updated);
    }

    // Create new access
    const access = await prisma.userCompany.create({
      data: {
        userId: user.id,
        companyId,
        role,
        status: 'APPROVED',
        approvedById: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    res.status(201).json(access);
  } catch (error) {
    next(error);
  }
});

// Remove company access from user
router.delete('/:id/company-access/:companyId', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Verify user exists and belongs to admin's company
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Find and delete access
    const access = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: req.params.companyId,
        },
      },
    });

    if (!access) {
      throw new NotFoundError('Company access not found');
    }

    await prisma.userCompany.delete({
      where: { id: access.id },
    });

    res.json({ message: 'Company access removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Deactivate user
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    logger.info('Deactivating user', { userId: req.params.id, companyId: req.user!.companyId });
    
    const user = await prisma.user.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: { isActive: false },
    });

    logger.info('User deactivated successfully', { userId: user.id, email: user.email });
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating user', { error, userId: req.params.id });
    next(error);
  }
});

// Create AI agent (convenience endpoint)
router.post('/ai-agent', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createUserSchema.parse({
      ...req.body,
      isAI: true,
      role: 'AGENT',
      password: req.body.password || 'ai-agent-default-password-' + Date.now(), // Generate default password for AI agents
    });

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError('Email already exists');
    }

    // Determine companyId: use provided companyId if SUPER_ADMIN, otherwise use current user's company
    let targetCompanyId = req.user!.companyId;
    if (data.companyId && req.user!.role === 'SUPER_ADMIN') {
      // Verify company exists
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
      });
      if (!company) {
        throw new NotFoundError('Company not found');
      }
      targetCompanyId = data.companyId;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Build aiConfig from flat fields
    let systemPrompt = req.body.aiSystemPrompt || '';
    // If trainingData is provided, append it to systemPrompt
    if (req.body.trainingData && systemPrompt) {
      systemPrompt = `${systemPrompt}\n\n---\n\nInformações da Empresa (Contexto para Treinamento):\n\n${req.body.trainingData}`;
    }

    const aiConfig = {
      provider: 'openai',
      model: req.body.aiModel || 'gpt-4-turbo-preview',
      systemPrompt,
      temperature: req.body.aiTemperature || 0.7,
      maxTokens: req.body.aiMaxTokens || 1000,
      triggerKeywords: req.body.transferKeywords || [],
      trainingData: req.body.trainingData || '', // PDF extracted text
      // Personality settings
      personalityTone: req.body.aiPersonalityTone || 'friendly',
      personalityStyle: req.body.aiPersonalityStyle || 'conversational',
      useEmojis: req.body.aiUseEmojis ?? true,
      useClientName: req.body.aiUseClientName ?? true,
      guardrailsEnabled: req.body.aiGuardrailsEnabled ?? true,
    };

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'AGENT',
        isAI: true,
        aiConfig,
        companyId: targetCompanyId,
        departments: data.departmentIds
          ? {
              create: data.departmentIds.map((deptId) => ({
                departmentId: deptId,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAI: true,
        departments: {
          include: {
            department: true,
          },
        },
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Process PDF for AI agent training
router.post('/process-training-pdf', authenticate, requireAdmin, ensureTenant, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      logger.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 25MB' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('PDF upload received:', { 
      filename: req.file.originalname, 
      size: req.file.size, 
      mimetype: req.file.mimetype 
    });

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (req.file.size > maxSize) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'File too large. Maximum size is 25MB' });
    }

    try {
        // Get company settings to check if AI is configured
      const settings = await prisma.companySettings.findUnique({
        where: { companyId: req.user!.companyId },
        select: { aiEnabled: true, aiApiKey: true, aiProvider: true },
      });

        // If AI is not configured, return error
      if (!settings?.aiEnabled || !settings?.aiApiKey) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ 
          error: 'A chave de IA precisa estar configurada para processar PDFs. Configure a chave de IA nas Configurações do sistema.' 
        });
      }

      // Read PDF file
      const dataBuffer = await fs.readFile(req.file.path);
      
      let extractedText = '';
      let pdfPages = 0;

      // Try to extract basic info with pdf-parse first (just for page count)
      try {
        // @ts-ignore - pdf-parse types issue
        const pdfData = await pdf(dataBuffer, { max: 0 });
        pdfPages = pdfData.numpages;
        logger.info(`PDF has ${pdfPages} pages`);
      } catch (parseError: any) {
        logger.warn('Could not get page count from PDF:', parseError?.message);
      }

      // Process PDF with OpenAI Assistants API
      try {
        logger.info('Processing PDF with OpenAI using Assistants API...');
        
        const aiService = new AIService(settings.aiProvider || 'openai', settings.aiApiKey);
        const openai = (aiService as any).client;

        // Upload PDF to OpenAI File API
        const file = await openai.files.create({
          file: fsSync.createReadStream(req.file.path),
          purpose: 'assistants',
        });

        logger.info(`PDF uploaded to OpenAI File API: ${file.id}`);

        // Wait for file to be processed
        let fileStatus = 'uploaded';
        let attempts = 0;
        while (fileStatus !== 'processed' && attempts < 60) {
          const fileInfo = await openai.files.retrieve(file.id);
          fileStatus = fileInfo.status;
          if (fileStatus === 'error') {
            throw new Error('File processing failed');
          }
          if (fileStatus !== 'processed') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            attempts++;
          }
        }

        if (fileStatus !== 'processed') {
          throw new Error('File processing timeout');
        }

        // Create an assistant with the file
        const assistant = await openai.beta.assistants.create({
          name: 'PDF Analyzer',
          instructions: `Você é um especialista em análise de documentos empresariais. Analise o documento PDF fornecido e extraia TODAS as informações relevantes sobre a empresa de forma estruturada e completa.

Crie uma explicação estruturada que inclua:
1. Informações gerais da empresa (nome, área de atuação, produtos/serviços principais)
2. Departamentos e suas responsabilidades (se mencionados)
3. Como a empresa se comporta, seus valores e cultura
4. Processos e procedimentos relevantes para atendimento
5. Informações importantes para o atendimento ao cliente
6. Formas de comunicação e padrões da empresa

Seja detalhado, objetivo e estruturado. Use tópicos e formatação clara. Extraia TODO o texto visível no documento, incluindo texto em imagens (OCR).`,
          model: 'gpt-4o',
          tools: [{ type: 'file_search' }],
        });

        // Create a thread and attach the file
        const thread = await openai.beta.threads.create({
          messages: [
            {
              role: 'user',
              content: 'Analise este documento PDF e extraia todas as informações relevantes sobre a empresa de forma estruturada e completa, incluindo informações de texto e de imagens (OCR).',
              attachments: [
                {
                  file_id: file.id,
                  tools: [{ type: 'file_search' }],
                },
              ],
            },
          ],
        });

        // Run the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        });

        // Wait for completion
        let runStatus = run.status;
        attempts = 0;
        while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < 120) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          const runInfo = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          runStatus = runInfo.status;
          if (runStatus === 'failed' || runStatus === 'cancelled') {
            throw new Error(`Run ${runStatus}: ${(runInfo as any).last_error?.message || ''}`);
          }
          attempts++;
        }

        if (runStatus !== 'completed') {
          throw new Error(`Run did not complete. Status: ${runStatus}`);
        }

        // Get messages
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        extractedText = lastMessage.content[0].type === 'text' 
          ? lastMessage.content[0].text.value 
          : '';

        // Clean up
        try {
          await openai.beta.assistants.del(assistant.id);
          await openai.files.del(file.id);
        } catch (e) {
          logger.warn('Error cleaning up OpenAI resources:', e);
        }

        if (extractedText) {
          logger.info(`AI extracted ${extractedText.length} characters from PDF`);
        } else {
          throw new Error('No text extracted from PDF');
        }
      } catch (aiError: any) {
        logger.error('Error processing PDF with OpenAI Assistants API:', aiError);
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ 
          error: `Erro ao processar PDF com IA: ${aiError?.message || 'Falha desconhecida'}. Verifique sua chave de IA e tente novamente.` 
        });
      }

      // The text is already processed and structured by the AI assistant
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});

      res.json({
        success: true,
        text: extractedText,
        pages: pdfPages,
        processedWithAI: true,
      });
    } catch (error: any) {
      // Ensure file is cleaned up on error
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      
      if (error.statusCode || error.response?.status) {
        return res.status(error.statusCode || error.response?.status).json({ 
          error: error.message || 'Error processing PDF' 
        });
      }
      
      logger.error('Error processing training PDF:', error);
      next(error);
    }
  } catch (error) {
    logger.error('Error in PDF processing route:', error);
    next(error);
  }
});

export { router as userRouter };
