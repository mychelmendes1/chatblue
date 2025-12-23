import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
import { BaileysService } from '../services/whatsapp/baileys.service.js';
import { MetaCloudService } from '../services/whatsapp/meta-cloud.service.js';

const router = Router();

const createBaileysSchema = z.object({
  name: z.string().min(2),
  type: z.literal('BAILEYS'),
});

const createMetaCloudSchema = z.object({
  name: z.string().min(2),
  type: z.literal('META_CLOUD'),
  accessToken: z.string(),
  phoneNumberId: z.string(),
  businessId: z.string(),
  webhookToken: z.string(),
});

// List connections
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        companyId: req.user!.companyId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        phone: true,
        status: true,
        isDefault: true,
        isActive: true,
        lastConnected: true,
        createdAt: true,
        _count: {
          select: {
            tickets: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(connections);
  } catch (error) {
    next(error);
  }
});

// Get connection
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Don't expose sensitive data
    const { accessToken, sessionData, ...safeConnection } = connection;

    res.json(safeConnection);
  } catch (error) {
    next(error);
  }
});

// Create Baileys connection
router.post('/baileys', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createBaileysSchema.parse(req.body);

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name: data.name,
        type: 'BAILEYS',
        status: 'DISCONNECTED',
        companyId: req.user!.companyId,
      },
    });

    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
});

// Create Meta Cloud connection
router.post('/meta-cloud', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createMetaCloudSchema.parse(req.body);

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name: data.name,
        type: 'META_CLOUD',
        accessToken: data.accessToken,
        phoneNumberId: data.phoneNumberId,
        businessId: data.businessId,
        webhookToken: data.webhookToken,
        status: 'DISCONNECTED',
        companyId: req.user!.companyId,
      },
    });

    // Test connection
    const metaService = new MetaCloudService(connection);
    const isValid = await metaService.testConnection();

    if (isValid) {
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { status: 'CONNECTED', lastConnected: new Date() },
      });
    }

    res.status(201).json({
      ...connection,
      status: isValid ? 'CONNECTED' : 'DISCONNECTED',
    });
  } catch (error) {
    next(error);
  }
});

// Get QR Code for Baileys connection
router.get('/:id/qr', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
        type: 'BAILEYS',
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    const baileysService = BaileysService.getInstance(connection.id);
    const qrCode = await baileysService.getQRCode();

    res.json({ qrCode });
  } catch (error) {
    next(error);
  }
});

// Connect
router.post('/:id/connect', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    if (connection.type === 'BAILEYS') {
      const baileysService = BaileysService.getInstance(connection.id);
      await baileysService.connect();
    } else {
      const metaService = new MetaCloudService(connection);
      await metaService.testConnection();
    }

    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: { status: 'CONNECTING' },
    });

    res.json({ message: 'Connecting...' });
  } catch (error) {
    next(error);
  }
});

// Disconnect
router.post('/:id/disconnect', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    if (connection.type === 'BAILEYS') {
      const baileysService = BaileysService.getInstance(connection.id);
      await baileysService.disconnect();
    }

    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: { status: 'DISCONNECTED' },
    });

    res.json({ message: 'Disconnected' });
  } catch (error) {
    next(error);
  }
});

// Set as default
router.post('/:id/default', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Remove default from all connections
    await prisma.whatsAppConnection.updateMany({
      where: { companyId: req.user!.companyId },
      data: { isDefault: false },
    });

    // Set this connection as default
    await prisma.whatsAppConnection.update({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
      data: { isDefault: true },
    });

    res.json({ message: 'Default connection updated' });
  } catch (error) {
    next(error);
  }
});

// Delete connection
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Disconnect first if Baileys
    if (connection.type === 'BAILEYS') {
      const baileysService = BaileysService.getInstance(connection.id);
      await baileysService.disconnect();
    }

    await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: { isActive: false, status: 'DISCONNECTED' },
    });

    res.json({ message: 'Connection deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as connectionRouter };
