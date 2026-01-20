import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
  role?: string;
}

let socketIO: Server | null = null;

export function setupSocketHandlers(io: Server): void {
  socketIO = io;
  // Make io available globally for services
  (global as any).io = io;

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        companyId: string;
        role: string;
      };

      socket.userId = decoded.userId;
      socket.companyId = decoded.companyId;
      socket.role = decoded.role;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join company room
    socket.join(`company:${socket.companyId}`);

    // Join user room for notifications
    socket.join(`user:${socket.userId}`);

    // Update user online status
    await prisma.user.update({
      where: { id: socket.userId },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Notify others
    socket.to(`company:${socket.companyId}`).emit('user:online', {
      userId: socket.userId,
    });

    // Emit socket:ready event to notify client that socket is ready
    socket.emit('socket:ready');

    // Join ticket room
    socket.on('ticket:join', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      logger.info(`[Socket] User ${socket.userId} joined ticket room: ticket:${ticketId}`);
      // Verify room membership
      const rooms = Array.from(socket.rooms);
      logger.info(`[Socket] User ${socket.userId} is now in rooms: ${rooms.join(', ')}`);
    });

    // Leave ticket room
    socket.on('ticket:leave', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
      logger.info(`[Socket] User ${socket.userId} left ticket room: ticket:${ticketId}`);
    });

    // Typing indicator
    socket.on('typing:start', (ticketId: string) => {
      socket.to(`ticket:${ticketId}`).emit('user:typing', {
        ticketId,
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (ticketId: string) => {
      socket.to(`ticket:${ticketId}`).emit('user:typing', {
        ticketId,
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      // Update user online status
      await prisma.user.update({
        where: { id: socket.userId },
        data: { isOnline: false, lastSeen: new Date() },
      });

      // Notify others
      socket.to(`company:${socket.companyId}`).emit('user:offline', {
        userId: socket.userId,
      });
    });
  });
}

export function getIO(): Server | null {
  return socketIO;
}

export { socketIO as io };
