import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { UnauthorizedError, ValidationError } from '../middlewares/error.middleware.js';
import { emailService } from '../services/email/email.service.js';
import { logger } from '../config/logger.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  companyId: z.string().cuid(),
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      logger.error('Login failed: JWT_SECRET or JWT_REFRESH_SECRET not set in .env');
      return res.status(500).json({
        error: 'Server misconfiguration',
        message: 'JWT secrets not configured. Add JWT_SECRET and JWT_REFRESH_SECRET to .env',
      });
    }

    const raw = req.body || {};
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      companyId: z
        .string()
        .optional()
        .transform((v) => (v && String(v).trim() ? String(v).trim() : undefined)),
    }).parse(raw);
    const { email, password } = body;
    const requestedCompanyId = body.companyId && body.companyId.length > 0 ? body.companyId : undefined;

    let user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          avatar: true,
          role: true,
          isAI: true,
          companyId: true,
          isActive: true,
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
    } catch (prismaErr: any) {
      logger.error('Login findUnique failed', { err: prismaErr?.message || prismaErr, code: prismaErr?.code });
      throw prismaErr;
    }

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User is inactive');
    }

    if (!user.company) {
      throw new UnauthorizedError('User company not found');
    }

    if (!user.password || typeof user.password !== 'string') {
      logger.error('Login: user has invalid password field', { userId: user.id, email: user.email });
      throw new UnauthorizedError('Invalid credentials');
    }

    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, user.password);
    } catch (bcryptErr) {
      logger.error('Login: bcrypt.compare failed (invalid hash in DB?)', { email: user.email, err: bcryptErr });
      throw new UnauthorizedError('Invalid credentials');
    }
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Get all companies user has access to (approved)
    const additionalCompanies = await prisma.userCompany.findMany({
      where: {
        userId: user.id,
        status: 'APPROVED',
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

    // Build list of all available companies
    const allCompanies = [
      {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        logo: user.company.logo,
        isActive: user.company.isActive,
        role: user.role, // Main company uses user's main role
        isPrimary: true,
      },
      ...additionalCompanies
        .filter(ac => ac.company.isActive && ac.company.id !== user.companyId)
        .map(ac => ({
          id: ac.company.id,
          name: ac.company.name,
          slug: ac.company.slug,
          logo: ac.company.logo,
          isActive: ac.company.isActive,
          role: ac.role,
          isPrimary: false,
        })),
    ];

    // Determine which company to use for this session
    let activeCompanyId = user.companyId;
    let activeRole: string = user.role; // Allow both UserRole and UserCompanyRole

    if (requestedCompanyId && requestedCompanyId !== user.companyId) {
      // Check if user has access to requested company
      const requestedAccess = additionalCompanies.find(
        ac => ac.companyId === requestedCompanyId && ac.company.isActive
      );
      if (requestedAccess) {
        activeCompanyId = requestedCompanyId;
        activeRole = requestedAccess.role;
      }
    }

    // Check if active company is active
    const activeCompany = allCompanies.find(c => c.id === activeCompanyId);
    if (!activeCompany || !activeCompany.isActive) {
      throw new UnauthorizedError('Company is inactive');
    }

    // Update online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Generate tokens with active company
    const payload = {
      userId: user.id,
      companyId: activeCompanyId,
      role: activeRole,
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
    );

    // Store refresh token in Redis (keyed by user + company for multi-company support)
    try {
      await redis.setex(
        `refresh:${user.id}:${activeCompanyId}`,
        7 * 24 * 60 * 60, // 7 days
        refreshToken
      );
    } catch (redisErr) {
      logger.error('Redis failed during login (refresh token not stored):', redisErr);
      // Continue: login succeeds but refresh may fail until Redis is available
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: activeRole,
        isAI: user.isAI,
        company: activeCompany,
      },
      companies: allCompanies.filter(c => c.isActive), // All available companies
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // Log detalhado em dev para diagnosticar 500
    if (process.env.NODE_ENV !== 'production') {
      logger.error('Login error (full)', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
    }
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token required');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as { userId: string; companyId: string; role: string };

    // Verify token in Redis (check both old format and new format for backwards compatibility)
    let storedToken = await redis.get(`refresh:${decoded.userId}:${decoded.companyId}`);
    if (!storedToken) {
      // Try old format for backwards compatibility
      storedToken = await redis.get(`refresh:${decoded.userId}`);
    }
    
    if (storedToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        companyId: decoded.companyId,
        role: decoded.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // Remove refresh token
    await redis.del(`refresh:${userId}`);

    // Update online status
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        companyId: true,
        isAI: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
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
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Get all companies user has access to
    const additionalCompanies = await prisma.userCompany.findMany({
      where: {
        userId: user.id,
        status: 'APPROVED',
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

    // Build list of all available companies
    const companies = [
      {
        id: user.company.id,
        name: user.company.name,
        slug: user.company.slug,
        logo: user.company.logo,
        role: user.role,
        isPrimary: true,
      },
      ...additionalCompanies
        .filter(ac => ac.company.isActive && ac.company.id !== user.companyId)
        .map(ac => ({
          id: ac.company.id,
          name: ac.company.name,
          slug: ac.company.slug,
          logo: ac.company.logo,
          role: ac.role,
          isPrimary: false,
        })),
    ];

    // Get current active company from token
    const activeCompanyId = req.user!.companyId;
    const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

    res.json({
      ...user,
      role: req.user!.role, // Role from token (may be different per company)
      activeCompany,
      companies,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PROFILE & PASSWORD
// ============================================================================

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

// Update current user profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const updates: Record<string, any> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.avatar !== undefined) updates.avatar = data.avatar || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Change password (authenticated)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Forgot password (public)
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const RESET_TOKEN_EXPIRES_MINUTES = 30;

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Always return success to avoid email enumeration
    const successResponse = {
      message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
    };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.json(successResponse);
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    try {
      await emailService.sendPasswordReset(user.email, {
        userName: user.name,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_EXPIRES_MINUTES,
      });
    } catch (emailError) {
      logger.error('Error sending password reset email:', emailError);
    }

    res.json(successResponse);
  } catch (error) {
    next(error);
  }
});

// Reset password (public, with token)
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    // Hash the token to compare with stored value
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido ou expirado. Solicite uma nova redefinição de senha.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
