import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { AdminAssistantService } from '../services/admin-assistant/admin-assistant.service.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

router.post('/chat', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = chatSchema.parse(req.body);

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      include: { settings: true },
    });

    if (!company?.settings?.whisperApiKey) {
      return res.status(403).json({
        error:
          'A chave da API OpenAI (Whisper) não está configurada. Configure em Configurações da empresa para usar o assistente de monitoramento.',
      });
    }

    const service = new AdminAssistantService(company.settings.whisperApiKey, company.id);
    const history = (data.history || []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const response = await service.chat(data.message, history);

    res.json({ response });
  } catch (error) {
    next(error);
  }
});

export { router as adminAssistantRouter };
