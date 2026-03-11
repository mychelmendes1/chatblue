import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
import { BaileysService } from '../services/whatsapp/baileys.service.js';
import { MetaCloudService } from '../services/whatsapp/meta-cloud.service.js';
import { InstagramService } from '../services/instagram/instagram.service.js';

const router = Router();

const createBaileysSchema = z.object({
  name: z.string().min(2),
  type: z.literal('BAILEYS'),
  companyId: z.string().cuid().optional(), // Allow admin to specify company
});

const createMetaCloudSchema = z.object({
  name: z.string().min(2),
  type: z.literal('META_CLOUD'),
  accessToken: z.string(),
  phoneNumberId: z.string(),
  businessId: z.string(),
  webhookToken: z.string(),
  companyId: z.string().cuid().optional(), // Allow admin to specify company
});

const createInstagramSchema = z.object({
  name: z.string().min(2),
  type: z.literal('INSTAGRAM'),
  accessToken: z.string(),
  instagramAccountId: z.string(),
  webhookToken: z.string(),
  companyId: z.string().cuid().optional(), // Allow admin to specify company
});

const updateInstagramSchema = z.object({
  name: z.string().min(2).optional(),
  accessToken: z.string().optional(),
  instagramAccountId: z.string().optional(),
  webhookToken: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

// Schema for updating AI settings per connection
const updateAISettingsSchema = z.object({
  aiEnabled: z.boolean(),
  defaultUserId: z.string().cuid().nullable().optional(),
});

// List connections
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    // Build where clause based on user role
    const whereClause: any = {
      isActive: true, // Only show active connections
    };
    
    console.log('[GET /connections] User role:', req.user!.role, 'companyId:', req.user!.companyId);
    
    if (req.user!.role === 'SUPER_ADMIN') {
      // Super admin can see all connections or filter by company
      if (req.query.companyId) {
        whereClause.companyId = req.query.companyId;
        console.log('[GET /connections] SUPER_ADMIN filtering by companyId:', req.query.companyId);
      } else {
        console.log('[GET /connections] SUPER_ADMIN - showing ALL connections');
      }
      // If no companyId specified, show ALL connections for super admin
    } else {
      // Regular users see only their company's connections
      whereClause.companyId = req.user!.companyId;
      console.log('[GET /connections] Non-admin - filtering by user company:', req.user!.companyId);
    }

    console.log('[GET /connections] Where clause:', JSON.stringify(whereClause));
    
    const connections = await prisma.whatsAppConnection.findMany({
      where: whereClause,
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
        companyId: true,
        instagramAccountId: true,
        instagramUsername: true,
        aiEnabled: true,
        defaultUserId: true,
        defaultUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
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

// Get connection (for Instagram + admin, includes accessToken and webhookToken for editing)
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const whereClause: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }

    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
      include: {
        defaultUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    const includeInstagramCredentials = connection.type === 'INSTAGRAM' && isAdmin;

    const { accessToken, sessionData, ...safeConnection } = connection;
    const payload = { ...safeConnection } as typeof safeConnection & { accessToken?: string; webhookToken?: string };

    if (includeInstagramCredentials) {
      payload.accessToken = connection.accessToken ?? undefined;
      payload.webhookToken = connection.webhookToken ?? undefined;
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

// Update Instagram connection (PUT same path as GET to avoid 404 with proxy/rewrite)
router.put('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const whereClause: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
      include: {
        defaultUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!connection) {
      throw new NotFoundError('Connection not found');
    }
    if (connection.type !== 'INSTAGRAM') {
      return res.status(400).json({
        message: 'Only Instagram connections can be updated with this endpoint',
      });
    }
    const data = updateInstagramSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.instagramAccountId !== undefined) updateData.instagramAccountId = data.instagramAccountId;
    if (data.webhookToken !== undefined) updateData.webhookToken = data.webhookToken;
    if (data.accessToken !== undefined && data.accessToken.trim() !== '') {
      updateData.accessToken = data.accessToken.trim();
    }
    const updated = await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: updateData,
    });
    if (updateData.accessToken !== undefined || data.instagramAccountId !== undefined) {
      const instagramService = new InstagramService(updated);
      const result = await instagramService.testConnection();
      let instagramUsername: string | undefined;
      if (result) {
        try {
          const accountInfo = await instagramService.getAccountInfo();
          instagramUsername = accountInfo?.username;
        } catch {
          // ignore
        }
        await prisma.whatsAppConnection.update({
          where: { id: updated.id },
          data: {
            status: 'CONNECTED',
            lastConnected: new Date(),
            ...(instagramUsername && { instagramUsername }),
          },
        });
      } else {
        await prisma.whatsAppConnection.update({
          where: { id: updated.id },
          data: { status: 'DISCONNECTED' },
        });
      }
    }
    const fresh = await prisma.whatsAppConnection.findUnique({
      where: { id: connection.id },
      include: {
        defaultUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    const { accessToken: _at, sessionData: _sd, ...safe } = fresh!;
    res.json(safe);
  } catch (error) {
    next(error);
  }
});

// Create Baileys connection
router.post('/baileys', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createBaileysSchema.parse(req.body);

    // Determine company ID: use provided one if super admin, otherwise use user's company
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

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name: data.name,
        type: 'BAILEYS',
        status: 'DISCONNECTED',
        companyId: targetCompanyId,
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

    // Determine company ID: use provided one if super admin, otherwise use user's company
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

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name: data.name,
        type: 'META_CLOUD',
        accessToken: data.accessToken,
        phoneNumberId: data.phoneNumberId,
        businessId: data.businessId,
        webhookToken: data.webhookToken,
        status: 'DISCONNECTED',
        companyId: targetCompanyId,
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

// Create Instagram connection
router.post('/instagram', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = createInstagramSchema.parse(req.body);

    // Determine company ID: use provided one if super admin, otherwise use user's company
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

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name: data.name,
        type: 'INSTAGRAM',
        accessToken: data.accessToken,
        instagramAccountId: data.instagramAccountId,
        webhookToken: data.webhookToken,
        status: 'DISCONNECTED',
        companyId: targetCompanyId,
      },
    });

    // Test connection and get account info
    const instagramService = new InstagramService(connection);
    const isValid = await instagramService.testConnection();
    logger.info(`[POST /connections/instagram] Connection ${connection.id} (${data.name}), testConnection: ${isValid}`);

    let instagramUsername: string | undefined;
    if (isValid) {
      const accountInfo = await instagramService.getAccountInfo();
      if (accountInfo) {
        instagramUsername = accountInfo.username;

        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'CONNECTED',
            lastConnected: new Date(),
            instagramUsername: accountInfo.username,
          },
        });
      }
    }

    res.status(201).json({
      ...connection,
      status: isValid ? 'CONNECTED' : 'DISCONNECTED',
      instagramUsername,
    });
  } catch (error) {
    next(error);
  }
});

// Get QR Code for Baileys connection
router.get('/:id/qr', authenticate, ensureTenant, async (req, res, next) => {
  try {
    // Build where clause - super admin can access any connection
    const whereClause: any = {
      id: req.params.id,
      type: 'BAILEYS',
    };
    
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    const baileysService = BaileysService.getInstance(connection.id);
    
    // Start connection if not already started. Do NOT await: when we only need the QR,
    // awaiting would hang if the connection is already in "connecting" state (connectionPromise
    // only resolves when connection opens, i.e. after the user scans the QR).
    void baileysService.connect();
    
    // Wait for QR via event first (up to 20s), then poll getQRCode as fallback (up to 5s)
    let qrCode = await baileysService.waitForQRCode(20000);
    if (!qrCode) {
      let attempts = 0;
      while (!qrCode && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        qrCode = await baileysService.getQRCode();
        attempts++;
      }
    }

    res.json({ qrCode });
  } catch (error) {
    next(error);
  }
});

// Connect
router.post('/:id/connect', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Build where clause - super admin can connect any connection
    const whereClause: any = {
      id: req.params.id,
    };
    
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    if (connection.type === 'BAILEYS') {
      const baileysService = BaileysService.getInstance(connection.id);
      await baileysService.connect();
    } else if (connection.type === 'META_CLOUD') {
      const metaService = new MetaCloudService(connection);
      const isValid = await metaService.testConnection();
      if (isValid) {
        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: { status: 'CONNECTED', lastConnected: new Date() },
        });
        return res.json({ message: 'Connected' });
      }
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { status: 'DISCONNECTED' },
      });
      return res.status(400).json({ message: 'Falha ao validar conexão com a Meta. Verifique o token e a configuração.' });
    } else if (connection.type === 'INSTAGRAM') {
      const instagramService = new InstagramService(connection);
      const result = await instagramService.testConnection();
      logger.info(`[POST /connections/:id/connect] Instagram ${connection.id} (${connection.name}), valid: ${result.valid}, error: ${result.error || 'none'}`);
      if (result.valid) {
        const accountInfo = await instagramService.getAccountInfo();
        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'CONNECTED',
            lastConnected: new Date(),
            ...(accountInfo?.username && { instagramUsername: accountInfo.username }),
          },
        });
        return res.json({ message: 'Connected', instagramUsername: accountInfo?.username });
      }
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { status: 'DISCONNECTED' },
      });
      return res.status(400).json({
        message: `Falha ao validar conexão com o Instagram: ${result.error || 'Verifique o token e o Instagram Account ID.'}`,
      });
    }

    // Apenas Baileys chega aqui: aguardando QR code (Instagram/Meta nunca devem ficar CONNECTING)
    if (connection.type === 'BAILEYS') {
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { status: 'CONNECTING' },
      });
      return res.json({ message: 'Connecting...' });
    }

    // Fallback: se não for Baileys e não entrou nos branches acima, manter estado e retornar erro
    return res.status(400).json({ message: 'Tipo de conexão não suportado para esta ação.' });
  } catch (error) {
    next(error);
  }
});

// Refresh status (corrige Instagram/Meta presos em CONNECTING)
router.post('/:id/refresh', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const whereClause: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    const connection = await prisma.whatsAppConnection.findFirst({ where: whereClause });
    if (!connection) {
      throw new NotFoundError('Connection not found');
    }
    if (connection.type === 'INSTAGRAM') {
      const instagramService = new InstagramService(connection);
      const result = await instagramService.testConnection();
      logger.info(`[POST /connections/:id/refresh] Instagram ${connection.id}, valid: ${result.valid}, error: ${result.error || 'none'}`);
      if (result.valid) {
        const accountInfo = await instagramService.getAccountInfo();
        await prisma.whatsAppConnection.update({
          where: { id: connection.id },
          data: {
            status: 'CONNECTED',
            lastConnected: new Date(),
            ...(accountInfo?.username && { instagramUsername: accountInfo.username }),
          },
        });
        return res.json({ status: 'CONNECTED', instagramUsername: accountInfo?.username });
      }
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { status: 'DISCONNECTED' },
      });
      return res.json({ status: 'DISCONNECTED', error: result.error });
    }
    if (connection.type === 'META_CLOUD') {
      const metaService = new MetaCloudService(connection);
      const isValid = await metaService.testConnection();
      await prisma.whatsAppConnection.update({
        where: { id: connection.id },
        data: { status: isValid ? 'CONNECTED' : 'DISCONNECTED', ...(isValid && { lastConnected: new Date() }) },
      });
      return res.json({ status: isValid ? 'CONNECTED' : 'DISCONNECTED' });
    }
    return res.status(400).json({ message: 'Tipo de conexão não suporta refresh.' });
  } catch (error) {
    next(error);
  }
});

// Disconnect
router.post('/:id/disconnect', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Build where clause - super admin can disconnect any connection
    const whereClause: any = {
      id: req.params.id,
    };
    
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
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

// Update connection company (Super Admin only)
router.put('/:id/company', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const { companyId } = z.object({
      companyId: z.string().cuid(),
    }).parse(req.body);

    // Only super admin can change company
    if (req.user!.role !== 'SUPER_ADMIN') {
      throw new NotFoundError('Connection not found');
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Find connection (super admin can access any connection)
    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: req.params.id },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Update company
    const updated = await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: { companyId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Get message templates for Meta Cloud connection
router.get('/:id/templates', authenticate, ensureTenant, async (req, res, next) => {
  try {
    // Build where clause - super admin can access any connection
    const whereClause: any = {
      id: req.params.id,
    };
    
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Templates are only available for Meta Cloud connections
    if (connection.type !== 'META_CLOUD') {
      return res.json({ 
        templates: [],
        message: 'Templates are only available for Meta Cloud API connections'
      });
    }

    const metaService = new MetaCloudService(connection);
    const templates = await metaService.getTemplates();

    // Filter only approved templates and format the response
    const approvedTemplates = templates
      .filter((t: any) => t.status === 'APPROVED')
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        components: t.components,
      }));

    res.json({ templates: approvedTemplates });
  } catch (error) {
    next(error);
  }
});

// Update AI settings for connection
router.patch('/:id/ai-settings', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    const data = updateAISettingsSchema.parse(req.body);

    // Build where clause - super admin can update any connection
    const whereClause: any = {
      id: req.params.id,
    };
    
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // If AI is being disabled, defaultUserId is required
    if (!data.aiEnabled && !data.defaultUserId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Quando a IA está desabilitada, você deve selecionar um usuário padrão para receber as mensagens.',
      });
    }

    // If defaultUserId is provided, verify user exists and belongs to the same company
    if (data.defaultUserId) {
      const user = await prisma.user.findFirst({
        where: {
          id: data.defaultUserId,
          companyId: connection.companyId,
          isActive: true,
          isAI: false, // Default user cannot be an AI user
        },
      });

      if (!user) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'O usuário selecionado não foi encontrado ou não está ativo.',
        });
      }
    }

    // Update connection
    const updated = await prisma.whatsAppConnection.update({
      where: { id: connection.id },
      data: {
        aiEnabled: data.aiEnabled,
        defaultUserId: data.defaultUserId,
      },
      include: {
        defaultUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Don't expose sensitive data
    const { accessToken, sessionData, ...safeConnection } = updated;

    res.json(safeConnection);
  } catch (error) {
    next(error);
  }
});

// Delete/Deactivate connection
// IMPORTANT: We do NOT delete messages and tickets - they are historical data that must be preserved
router.delete('/:id', authenticate, requireAdmin, ensureTenant, async (req, res, next) => {
  try {
    // Build where clause - super admin can delete any connection
    const whereClause: any = {
      id: req.params.id,
    };
    
    // Non-super admins can only delete their own company's connections
    if (req.user!.role !== 'SUPER_ADMIN') {
      whereClause.companyId = req.user!.companyId;
    }
    
    const connection = await prisma.whatsAppConnection.findFirst({
      where: whereClause,
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Disconnect first if Baileys and mark as deleted to prevent further updates
    if (connection.type === 'BAILEYS') {
      const baileysService = BaileysService.getInstance(connection.id);
      // Mark as deleted FIRST to prevent any further database operations
      baileysService.markAsDeleted();
      // Force logout to completely invalidate the session and prevent reconnection attempts
      await baileysService.disconnect(true);
      
      // Remove session files (only session files, NOT messages/tickets)
      const fs = await import('fs');
      const path = await import('path');
      
      // Try multiple possible session paths
      const possiblePaths = [
        path.join(process.cwd(), 'apps', 'api', 'sessions', connection.id),
        path.join(process.cwd(), 'sessions', connection.id),
      ];
      
      for (const sessionPath of possiblePaths) {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
    }

    // Orphan messages and tickets so we can delete the connection row (preserve conversations by company + contact)
    await prisma.message.updateMany({
      where: { connectionId: connection.id },
      data: { connectionId: null },
    });
    await prisma.ticket.updateMany({
      where: { connectionId: connection.id },
      data: { connectionId: null },
    });

    // Hard delete the connection so we don't accumulate old sessions
    await prisma.whatsAppConnection.delete({
      where: { id: connection.id },
    });

    res.json({ message: 'Sessão removida. Todas as conversas foram preservadas e continuarão disponíveis ao reconectar.' });
  } catch (error) {
    next(error);
  }
});

export { router as connectionRouter };
