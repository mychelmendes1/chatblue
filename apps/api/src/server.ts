import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { companyRouter } from './routes/company.routes.js';
import { userRouter } from './routes/user.routes.js';
import { departmentRouter } from './routes/department.routes.js';
import { connectionRouter } from './routes/connection.routes.js';
import { ticketRouter } from './routes/ticket.routes.js';
import { messageRouter } from './routes/message.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import { metricsRouter } from './routes/metrics.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { pushRouter } from './routes/push.routes.js';
import { setupSocketHandlers } from './sockets/index.js';
import { startWorkers, stopWorkers } from './jobs/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available in routes
app.set('io', io);

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
app.use('/api/departments', departmentRouter);
app.use('/api/connections', connectionRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/messages', messageRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/push', pushRouter);
app.use('/webhook', webhookRouter);

// Serve uploaded files statically
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Error handler
app.use(errorHandler);

// Socket handlers
setupSocketHandlers(io);

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

export { app, io };
