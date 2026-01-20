import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { addNotificationJob } from '../jobs/index.js';

const router = Router();

// Get user notifications
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const { read, limit = '50' } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.userId,
        companyId: req.user!.companyId,
        ...(read !== undefined && { read: read === 'true' }),
      },
      include: {
        ticket: {
          select: {
            id: true,
            protocol: true,
            contact: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.userId,
        companyId: req.user!.companyId,
        read: false,
      },
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
        companyId: req.user!.companyId,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticate, ensureTenant, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.userId,
        companyId: req.user!.companyId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

