import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { ValidationError } from '../middlewares/error.middleware.js';
import { logger } from '../config/logger.js';
import { BlueService } from '../services/blue/blue.service.js';

const router = Router();

// Validation schemas
const contextTipSchema = z.object({
  context: z.object({
    route: z.string(),
    routeParams: z.record(z.string()).optional(),
    searchParams: z.record(z.string()).optional(),
    ticketId: z.string().optional(),
    contactId: z.string().optional(),
    departmentId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.object({
    route: z.string(),
    routeParams: z.record(z.string()).optional(),
    searchParams: z.record(z.string()).optional(),
    ticketId: z.string().optional(),
    contactId: z.string().optional(),
    departmentId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// Get contextual tip
router.post('/context-tip', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const data = contextTipSchema.parse(req.body);

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: { settings: true },
    });

    if (!company || !company.settings) {
      throw new ValidationError('Company settings not found');
    }

    // Check if Blue is enabled for this company
    if (company.settings.blueEnabled === false) {
      return res.status(403).json({ error: 'Blue assistant is disabled for this company' });
    }

    // Check if AI is enabled
    if (!company.settings.aiEnabled || !company.settings.aiApiKey || !company.settings.aiProvider) {
      return res.status(403).json({ error: 'AI is not enabled for this company' });
    }

    const blueService = new BlueService(
      company.settings.aiProvider,
      company.settings.aiApiKey,
      company.id
    );

    const tip = await blueService.getContextualTip(data.context || {});

    // Save interaction (optional, for analytics)
    try {
      await prisma.blueInteraction.create({
        data: {
          userId: req.user!.userId,
          companyId: company.id,
          type: 'tip',
          context: data.context || {},
          response: tip,
          page: data.context?.route || '/',
        },
      });
    } catch (error) {
      // Log but don't fail if interaction save fails
      logger.warn('Failed to save Blue interaction:', error);
    }

    res.json({ tip });
  } catch (error) {
    next(error);
  }
});

// Chat with Blue
router.post('/chat', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const data = chatSchema.parse(req.body);

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: { settings: true },
    });

    if (!company || !company.settings) {
      throw new ValidationError('Company settings not found');
    }

    // Check if Blue is enabled for this company
    if (company.settings.blueEnabled === false) {
      return res.status(403).json({ error: 'Blue assistant is disabled for this company' });
    }

    // Check if AI is enabled
    if (!company.settings.aiEnabled || !company.settings.aiApiKey || !company.settings.aiProvider) {
      return res.status(403).json({ error: 'AI is not enabled for this company' });
    }

    const blueService = new BlueService(
      company.settings.aiProvider,
      company.settings.aiApiKey,
      company.id
    );

    // Ensure history has required fields
    const history = (data.history || []).map((msg: any) => ({
      role: msg.role || 'user',
      content: msg.content || '',
    }));
    
    const response = await blueService.chatWithBlue(
      data.message,
      data.context || {},
      history
    );

    // Save interaction
    try {
      await prisma.blueInteraction.create({
        data: {
          userId: req.user!.userId,
          companyId: company.id,
          type: 'chat',
          context: data.context || {},
          message: data.message,
          response: response,
          page: data.context?.route || '/',
        },
      });
    } catch (error) {
      // Log but don't fail if interaction save fails
      logger.warn('Failed to save Blue interaction:', error);
    }

    res.json({ response });
  } catch (error) {
    next(error);
  }
});

export { router as blueRouter };

