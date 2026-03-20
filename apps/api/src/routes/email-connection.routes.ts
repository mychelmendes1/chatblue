import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { ensureTenant } from '../middlewares/tenant.middleware.js';
import { NotFoundError } from '../middlewares/error.middleware.js';
import { encrypt } from '../services/email-channel/crypto.util.js';
import { SmtpService } from '../services/email-channel/smtp.service.js';
import { ImapService } from '../services/email-channel/imap.service.js';
import { GoogleOAuthService } from '../services/email-channel/google-oauth.service.js';
import { logger } from '../config/logger.js';
import jwt from 'jsonwebtoken';

const router = Router();

// ========================
// Google OAuth2 Flow
// ========================

// Step 1: Start OAuth flow - redirects to Google consent screen
router.get('/oauth/google/start', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const { name, fromName } = z.object({
      name: z.string().min(1),
      fromName: z.string().optional(),
    }).parse(req.query);

    // Encode state as JWT so callback can trust it
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const state = jwt.sign(
      { companyId: req.user!.companyId, userId: req.user!.userId, name, fromName: fromName || '' },
      secret,
      { expiresIn: '10m' },
    );

    const url = GoogleOAuthService.generateAuthUrl(state);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// Step 2: Google redirects back here with authorization code
router.get('/oauth/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) {
      return res.status(400).send('Parâmetros inválidos');
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret';
    let payload: any;
    try {
      payload = jwt.verify(state, secret);
    } catch {
      return res.status(400).send('State inválido ou expirado. Tente novamente.');
    }

    const { companyId, userId, name, fromName } = payload;

    const tokens = await GoogleOAuthService.exchangeCode(code);

    // Upsert: if connection with this email already exists for company, update it
    const existing = await prisma.emailConnection.findFirst({
      where: { email: tokens.email, companyId },
    });

    if (existing) {
      await prisma.emailConnection.update({
        where: { id: existing.id },
        data: {
          authType: 'OAUTH2',
          oauthProvider: 'google',
          oauthRefreshToken: tokens.refreshToken,
          oauthAccessToken: tokens.accessToken,
          oauthTokenExpiry: tokens.expiry,
          imapHost: GoogleOAuthService.gmailImap.host,
          imapPort: GoogleOAuthService.gmailImap.port,
          imapUser: tokens.email,
          imapTls: GoogleOAuthService.gmailImap.tls,
          smtpHost: GoogleOAuthService.gmailSmtp.host,
          smtpPort: GoogleOAuthService.gmailSmtp.port,
          smtpUser: tokens.email,
          smtpTls: GoogleOAuthService.gmailSmtp.tls,
          status: 'CONNECTED',
          isActive: true,
          lastError: null,
        },
      });
    } else {
      await prisma.emailConnection.create({
        data: {
          name: name || 'Gmail',
          email: tokens.email,
          authType: 'OAUTH2',
          oauthProvider: 'google',
          oauthRefreshToken: tokens.refreshToken,
          oauthAccessToken: tokens.accessToken,
          oauthTokenExpiry: tokens.expiry,
          imapHost: GoogleOAuthService.gmailImap.host,
          imapPort: GoogleOAuthService.gmailImap.port,
          imapUser: tokens.email,
          imapTls: GoogleOAuthService.gmailImap.tls,
          smtpHost: GoogleOAuthService.gmailSmtp.host,
          smtpPort: GoogleOAuthService.gmailSmtp.port,
          smtpUser: tokens.email,
          smtpTls: GoogleOAuthService.gmailSmtp.tls,
          fromName: fromName || name || '',
          status: 'CONNECTED',
          isActive: true,
          companyId,
        },
      });
    }

    // Redirect to frontend connections page with success indicator
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';
    res.redirect(`${frontendUrl}/connections?oauth=success&email=${encodeURIComponent(tokens.email)}`);
  } catch (error: any) {
    logger.error('Google OAuth callback error:', { error: error.message });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';
    res.redirect(`${frontendUrl}/connections?oauth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// ========================
// CRUD Routes
// ========================

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  imapHost: z.string().min(1),
  imapPort: z.number().int().default(993),
  imapUser: z.string().min(1),
  imapPassword: z.string().min(1),
  imapTls: z.boolean().default(true),
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().default(587),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpTls: z.boolean().default(true),
  fromName: z.string().optional(),
  pollIntervalSec: z.number().int().min(15).default(60),
});

const updateSchema = createSchema.partial();

// List email connections
router.get('/', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const connections = await prisma.emailConnection.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        authType: true,
        oauthProvider: true,
        status: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapTls: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpTls: true,
        fromName: true,
        pollIntervalSec: true,
        lastPollAt: true,
        lastError: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(connections);
  } catch (error) {
    next(error);
  }
});

// Get email connection detail
router.get('/:id', authenticate, ensureTenant, async (req, res, next) => {
  try {
    const conn = await prisma.emailConnection.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        authType: true,
        oauthProvider: true,
        status: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapTls: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpTls: true,
        fromName: true,
        pollIntervalSec: true,
        lastPollAt: true,
        lastError: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!conn) throw new NotFoundError('Email connection not found');
    res.json(conn);
  } catch (error) {
    next(error);
  }
});

// Create email connection
router.post('/', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const conn = await prisma.emailConnection.create({
      data: {
        name: data.name,
        email: data.email,
        imapHost: data.imapHost,
        imapPort: data.imapPort,
        imapUser: data.imapUser,
        imapPassword: encrypt(data.imapPassword),
        imapTls: data.imapTls,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUser: data.smtpUser,
        smtpPassword: encrypt(data.smtpPassword),
        smtpTls: data.smtpTls,
        fromName: data.fromName,
        pollIntervalSec: data.pollIntervalSec,
        companyId: req.user!.companyId,
      },
    });
    res.status(201).json(conn);
  } catch (error) {
    next(error);
  }
});

// Update email connection
router.put('/:id', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.emailConnection.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Email connection not found');

    const updateData: Record<string, unknown> = { ...data };
    if (data.imapPassword) updateData.imapPassword = encrypt(data.imapPassword);
    if (data.smtpPassword) updateData.smtpPassword = encrypt(data.smtpPassword);

    const conn = await prisma.emailConnection.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(conn);
  } catch (error) {
    next(error);
  }
});

// Delete email connection
router.delete('/:id', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.emailConnection.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Email connection not found');

    await prisma.emailConnection.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Test connection (IMAP + SMTP)
router.post('/:id/test', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.emailConnection.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Email connection not found');

    const [imapOk, smtpResult] = await Promise.all([
      ImapService.testConnection(req.params.id),
      SmtpService.testConnection(req.params.id),
    ]);

    const errors = [...smtpResult.errors];
    if (!imapOk) errors.push('IMAP: Falha ao conectar');

    res.json({ imap: imapOk, smtp: smtpResult.smtp, errors });
  } catch (error) {
    next(error);
  }
});

// Activate polling
router.post('/:id/connect', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.emailConnection.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Email connection not found');

    const conn = await prisma.emailConnection.update({
      where: { id: req.params.id },
      data: { isActive: true, status: 'CONNECTING' },
    });

    // Trigger initial poll
    try {
      await ImapService.poll(conn.id);
    } catch (err: any) {
      logger.warn(`Initial poll failed for email connection ${conn.id}`, { error: err.message });
    }

    const updated = await prisma.emailConnection.findUnique({ where: { id: conn.id } });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Deactivate polling
router.post('/:id/disconnect', authenticate, ensureTenant, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.emailConnection.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new NotFoundError('Email connection not found');

    const conn = await prisma.emailConnection.update({
      where: { id: req.params.id },
      data: { isActive: false, status: 'DISCONNECTED' },
    });
    res.json(conn);
  } catch (error) {
    next(error);
  }
});

export { router as emailConnectionRouter };
