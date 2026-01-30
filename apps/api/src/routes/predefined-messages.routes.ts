import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';

const router = Router();

const createSchema = z.object({
  shortcut: z.string().min(1, 'Atalho é obrigatório').max(50).regex(/^[a-z0-9_-]+$/i, 'Atalho só pode conter letras, números, _ e -'),
  name: z.string().max(100).optional().nullable(),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
});

const updateSchema = createSchema.partial();

// Listar mensagens pré-definidas (qualquer usuário autenticado - para o autocomplete no chat)
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const list = await prisma.predefinedMessage.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { shortcut: 'asc' },
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// Criar (apenas admin)
router.post('/', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const shortcut = data.shortcut.trim().toLowerCase();
    const existing = await prisma.predefinedMessage.findFirst({
      where: { companyId: req.user!.companyId, shortcut },
    });
    if (existing) {
      throw new ValidationError(`Já existe uma mensagem com o atalho /${shortcut}`);
    }
    const created = await prisma.predefinedMessage.create({
      data: {
        companyId: req.user!.companyId,
        shortcut,
        name: data.name?.trim() || null,
        content: data.content.trim(),
      },
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// Atualizar (apenas admin)
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.predefinedMessage.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) {
      throw new NotFoundError('Mensagem pré-definida não encontrada');
    }
    const updateData: { shortcut?: string; name?: string | null; content?: string } = {};
    if (data.shortcut !== undefined) {
      updateData.shortcut = data.shortcut.trim().toLowerCase();
      if (updateData.shortcut !== existing.shortcut) {
        const conflict = await prisma.predefinedMessage.findFirst({
          where: { companyId: req.user!.companyId, shortcut: updateData.shortcut },
        });
        if (conflict) {
          throw new ValidationError(`Já existe uma mensagem com o atalho /${updateData.shortcut}`);
        }
      }
    }
    if (data.name !== undefined) updateData.name = data.name?.trim() || null;
    if (data.content !== undefined) updateData.content = data.content.trim();

    const updated = await prisma.predefinedMessage.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Deletar (apenas admin)
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const existing = await prisma.predefinedMessage.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) {
      throw new NotFoundError('Mensagem pré-definida não encontrada');
    }
    await prisma.predefinedMessage.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const predefinedMessagesRouter = router;
