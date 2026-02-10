import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { UnauthorizedError } from './error.middleware.js';
import { logger } from '../config/logger.js';

export interface ExternalAIUser {
  id: string;
  name: string;
  companyId: string;
  aiConfig: any;
}

declare global {
  namespace Express {
    interface Request {
      aiUser?: ExternalAIUser;
    }
  }
}

/**
 * Middleware to authenticate external AI users via API key.
 * Expects the API key in the X-API-Key header.
 * Looks up the user where isAI=true and aiConfig.externalApiKey matches.
 */
export const authenticateExternalAI = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedError('API key is required. Provide it via X-API-Key header.');
    }

    // Find AI user with matching externalApiKey
    // Since aiConfig is a JSON field, we need to find all external AI users and check
    const aiUsers = await prisma.user.findMany({
      where: {
        isAI: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        aiConfig: true,
      },
    });

    const matchingUser = aiUsers.find((user) => {
      const config = user.aiConfig as any;
      return (
        config &&
        config.type === 'external' &&
        config.externalApiKey === apiKey
      );
    });

    if (!matchingUser) {
      logger.warn('[ExternalAI Auth] Invalid API key attempt');
      throw new UnauthorizedError('Invalid API key');
    }

    req.aiUser = {
      id: matchingUser.id,
      name: matchingUser.name,
      companyId: matchingUser.companyId,
      aiConfig: matchingUser.aiConfig,
    };

    logger.debug(`[ExternalAI Auth] Authenticated as ${matchingUser.name} (${matchingUser.id})`);
    next();
  } catch (error) {
    next(error);
  }
};
