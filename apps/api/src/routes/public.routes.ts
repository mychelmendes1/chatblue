import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { NotFoundError, ValidationError } from '../middlewares/error.middleware.js';

const router = Router();

// Get ticket info for rating page (public - no auth required)
router.get('/rate/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { ratingToken: token },
      select: {
        id: true,
        protocol: true,
        rating: true,
        ratedAt: true,
        status: true,
        resolvedAt: true,
        company: {
          select: {
            name: true,
            logo: true,
          },
        },
        contact: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Avaliação não encontrada');
    }

    // Check if already rated
    if (ticket.rating !== null) {
      return res.json({
        alreadyRated: true,
        rating: ticket.rating,
        protocol: ticket.protocol,
        companyName: ticket.company.name,
        companyLogo: ticket.company.logo,
        contactName: ticket.contact?.name,
      });
    }

    res.json({
      alreadyRated: false,
      protocol: ticket.protocol,
      companyName: ticket.company.name,
      companyLogo: ticket.company.logo,
      contactName: ticket.contact?.name,
    });
  } catch (error) {
    next(error);
  }
});

// Submit rating (public - no auth required)
router.post('/rate/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { rating, comment } = z.object({
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    }).parse(req.body);

    const ticket = await prisma.ticket.findUnique({
      where: { ratingToken: token },
      select: {
        id: true,
        rating: true,
        companyId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Avaliação não encontrada');
    }

    // Check if already rated
    if (ticket.rating !== null) {
      throw new ValidationError('Este atendimento já foi avaliado');
    }

    // Update ticket with rating
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        rating,
        ratingComment: comment || null,
        ratedAt: new Date(),
      },
      select: {
        protocol: true,
        rating: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Avaliação registrada com sucesso!',
      protocol: updatedTicket.protocol,
      rating: updatedTicket.rating,
    });
  } catch (error) {
    next(error);
  }
});

// Get NPS survey status (public - no auth required)
router.get('/nps/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { NPSService } = await import('../services/nps/nps.service.js');
    const status = await NPSService.getNPSStatus(token);
    
    if (!status.valid) {
      return res.status(404).json({ error: 'Pesquisa não encontrada' });
    }
    
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// Submit NPS response (public - no auth required)
router.post('/nps/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { score, comment } = z.object({
      score: z.number().min(0).max(10),
      comment: z.string().optional(),
    }).parse(req.body);

    const { NPSService } = await import('../services/nps/nps.service.js');
    const result = await NPSService.submitNPSResponse(token, score, comment);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as publicRouter };
