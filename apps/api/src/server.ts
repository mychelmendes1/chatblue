import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { authRouter } from './routes/auth.routes';
import { companyRouter } from './routes/company.routes';
import { userRouter } from './routes/user.routes';
import { userAccessRouter } from './routes/user-access.routes';
import { departmentRouter } from './routes/department.routes';
import { connectionRouter } from './routes/connection.routes';
import { ticketRouter } from './routes/ticket.routes';
import { messageRouter } from './routes/message.routes';
import { contactRouter } from './routes/contact.routes';
import { metricsRouter } from './routes/metrics.routes';
import { settingsRouter } from './routes/settings.routes';
import { webhookRouter } from './routes/webhook.routes';
import { uploadRouter } from './routes/upload.routes';
import { pushRouter } from './routes/push.routes';
import { knowledgeRouter } from './routes/knowledge.routes';
import { faqRouter } from './routes/faq.routes';
import { publicRouter } from './routes/public.routes';
import aiAssistantRouter from './routes/ai-assistant.routes';
import { blueRouter } from './routes/blue.routes';
import notificationRouter from './routes/notification.routes';
import { setupSocketHandlers } from './sockets/index';
import { startWorkers, stopWorkers } from './jobs/index';
import { prisma } from './config/database';
import { BaileysService } from './services/whatsapp/baileys.service';
import path from 'path';
import fs from 'fs';

// =========================================
// Global Error Handlers - Prevent Server Crashes
// =========================================

// Handle uncaught exceptions - log and continue (don't exit)
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception (server will continue):', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  // Don't exit - let the server continue running
  // Critical errors should be handled where they occur
});

// Handle unhandled promise rejections - log and continue
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection (server will continue):', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  // Don't exit - let the server continue running
});

// Handle warnings
process.on('warning', (warning: Error) => {
  logger.warn('Node.js Warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://84.247.191.105:3000', 'https://chat.grupoblue.com.br'];

const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available in routes
app.set('io', io);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now, adjust if needed
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companyRouter);
app.use('/api/users', userRouter);
app.use('/api/user-access', userAccessRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/connections', connectionRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/messages', messageRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/push', pushRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/faq', faqRouter);
app.use('/api/public', publicRouter);
app.use('/api/ai-assistant', aiAssistantRouter);
app.use('/api/blue', blueRouter);
app.use('/api/notifications', notificationRouter);
app.use('/webhooks', webhookRouter);

// Serve uploaded files statically
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'apps', 'api', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Error handler
app.use(errorHandler);

// Socket handlers
setupSocketHandlers(io);

// Reconnect all active Baileys connections on startup
async function reconnectBaileysConnections() {
  try {
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        type: 'BAILEYS',
        isActive: true,
      },
    });

    logger.info(`Found ${connections.length} Baileys connections to reconnect`);

    for (const connection of connections) {
      try {
        logger.info(`Reconnecting Baileys connection: ${connection.id} (${connection.name})`);
        const baileysService = BaileysService.getInstance(connection.id);
        
        // Start connection in background (don't await to avoid blocking startup)
        baileysService.connect().catch((err) => {
          logger.error(`Failed to reconnect ${connection.id}:`, err);
        });
        
        // Small delay between connections to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error reconnecting ${connection.id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Failed to reconnect Baileys connections:', error);
  }
}

// Health check and auto-reconnect for Baileys connections (runs every 30 seconds)
async function healthCheckBaileysConnections() {
  try {
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        type: 'BAILEYS',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    for (const connection of connections) {
      try {
        const baileysService = BaileysService.getInstance(connection.id);
        
        // Check if connected, if not try to reconnect
        // Only try to reconnect if the connection status is not already CONNECTING
        if (!baileysService.isSocketConnected() && connection.status !== 'CONNECTING') {
          logger.debug(`Connection ${connection.id} (${connection.name}) is not connected, status: ${connection.status}`);
          
          // Only attempt reconnect if status indicates it should be connected
          if (connection.status === 'CONNECTED' || connection.status === 'DISCONNECTED') {
            baileysService.connect().catch((err) => {
              // Silently log - don't spam console
              logger.debug(`Health check reconnect attempt for ${connection.id}: ${err?.message || err}`);
            });
          }
        }
      } catch (error: any) {
        // Don't log P2025 errors (record not found) - connection may have been deleted
        if (error?.code !== 'P2025') {
          logger.error(`Health check error for ${connection.id}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Health check failed:', error);
  }
}

// Start server
const PORT = process.env.API_PORT || 3001;

httpServer.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start background job workers
  try {
    await startWorkers();
    logger.info('Background job workers started');
  } catch (error) {
    logger.error('Failed to start background workers:', error);
  }

  // Reconnect Baileys connections after a short delay
  setTimeout(() => {
    reconnectBaileysConnections();
  }, 3000);

  // Start health check interval (every 30 seconds)
  setInterval(() => {
    healthCheckBaileysConnections();
  }, 30000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');

  // Stop background workers first
  try {
    await stopWorkers();
    logger.info('Background workers stopped');
  } catch (error) {
    logger.error('Error stopping workers:', error);
  }

  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Global io getter for use in background jobs
let globalIo: SocketServer | null = null;

export function setGlobalIo(socketIo: SocketServer) {
  globalIo = socketIo;
}

export function getGlobalIo(): SocketServer | null {
  return globalIo;
}

// Set the io globally
setGlobalIo(io);

export { app, io };
