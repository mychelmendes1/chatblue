import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotionService } from '../services/notion/notion.service.js';

const router = Router();

// Get settings
router.get('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { companyId: req.user!.companyId },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: { companyId: req.user!.companyId },
      });
    }

    // Hide sensitive data
    const safeSettings = {
      ...settings,
      notionApiKey: settings.notionApiKey ? '••••••••' : null,
      aiApiKey: settings.aiApiKey ? '••••••••' : null,
      whisperApiKey: settings.whisperApiKey ? '••••••••' : null,
    };

    res.json(safeSettings);
  } catch (error) {
    next(error);
  }
});

// Update general settings
router.put('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      autoAssign: z.boolean().optional(),
      maxTicketsPerAgent: z.number().int().min(1).max(100).optional(),
      welcomeMessage: z.string().optional(),
      awayMessage: z.string().optional(),
      defaultTransferDepartmentId: z.string().nullable().optional(),
    }).parse(req.body);

    const settings = await prisma.companySettings.upsert({
      where: { companyId: req.user!.companyId },
      update: data,
      create: { ...data, companyId: req.user!.companyId },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update Notion settings
router.put('/notion', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      notionApiKey: z.string().min(1),
      notionDatabaseId: z.string().min(1),
      notionSyncEnabled: z.boolean().optional(),
    }).parse(req.body);

    const settings = await prisma.companySettings.upsert({
      where: { companyId: req.user!.companyId },
      update: data,
      create: { ...data, companyId: req.user!.companyId },
    });

    res.json({
      ...settings,
      notionApiKey: '••••••••',
    });
  } catch (error) {
    next(error);
  }
});

// Test Notion connection
router.post('/notion/test', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { notionApiKey, notionDatabaseId } = z.object({
      notionApiKey: z.string().min(1),
      notionDatabaseId: z.string().min(1),
    }).parse(req.body);

    const notionService = new NotionService(notionApiKey);
    const isValid = await notionService.testConnection(notionDatabaseId);

    res.json({ success: isValid });
  } catch (error) {
    next(error);
  }
});

// Update AI settings
router.put('/ai', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      aiEnabled: z.boolean(),
      aiProvider: z.string().optional(),
      aiApiKey: z.string().optional(),
      aiDefaultModel: z.string().optional(),
      aiSystemPrompt: z.string().optional(),
      // Whisper (Audio Transcription)
      whisperApiKey: z.string().optional(),
      // Personality settings
      aiPersonalityTone: z.enum(['friendly', 'formal', 'technical', 'empathetic']).optional(),
      aiPersonalityStyle: z.enum(['concise', 'detailed', 'conversational']).optional(),
      aiUseEmojis: z.boolean().optional(),
      aiUseClientName: z.boolean().optional(),
      aiGuardrailsEnabled: z.boolean().optional(),
    }).parse(req.body);

    const settings = await prisma.companySettings.upsert({
      where: { companyId: req.user!.companyId },
      update: data,
      create: { ...data, companyId: req.user!.companyId },
    });

    res.json({
      ...settings,
      aiApiKey: settings.aiApiKey ? '••••••••' : null,
      whisperApiKey: settings.whisperApiKey ? '••••••••' : null,
      notionApiKey: settings.notionApiKey ? '••••••••' : null,
    });
  } catch (error) {
    next(error);
  }
});

// Get SLA configs
router.get('/sla', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const configs = await prisma.sLAConfig.findMany({
      where: { companyId: req.user!.companyId },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(configs);
  } catch (error) {
    next(error);
  }
});

// Create/Update SLA config
router.post('/sla', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      firstResponseTime: z.number().int().min(1),
      resolutionTime: z.number().int().min(1),
      businessHours: z.object({
        start: z.string(),
        end: z.string(),
        days: z.array(z.number().int().min(0).max(6)),
      }).optional(),
      isDefault: z.boolean().optional(),
      departmentId: z.string().cuid().nullable().optional(),
    }).parse(req.body);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.sLAConfig.updateMany({
        where: { companyId: req.user!.companyId },
        data: { isDefault: false },
      });
    }

    const config = await prisma.sLAConfig.create({
      data: {
        ...data,
        companyId: req.user!.companyId,
      },
    });

    res.status(201).json(config);
  } catch (error) {
    next(error);
  }
});

// Update SLA config
router.put('/sla/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      firstResponseTime: z.number().int().min(1).optional(),
      resolutionTime: z.number().int().min(1).optional(),
      businessHours: z.object({
        start: z.string(),
        end: z.string(),
        days: z.array(z.number().int().min(0).max(6)),
      }).optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);

    const config = await prisma.sLAConfig.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data,
    });

    res.json(config);
  } catch (error) {
    next(error);
  }
});

// Delete SLA config
router.delete('/sla/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    await prisma.sLAConfig.delete({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    res.json({ message: 'SLA config deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as settingsRouter };
