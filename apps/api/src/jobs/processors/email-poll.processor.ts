import { Job } from 'bullmq';
import { prisma } from '../../config/database';
import { ImapService } from '../../services/email-channel/imap.service';
import { logger } from '../../config/logger';

export async function emailPollProcessor(job: Job) {
  logger.debug('Running email poll job');

  const connections = await prisma.emailConnection.findMany({
    where: { isActive: true, status: { not: 'ERROR' } },
    select: { id: true, pollIntervalSec: true, lastPollAt: true },
  });

  for (const conn of connections) {
    const now = Date.now();
    const lastPoll = conn.lastPollAt ? conn.lastPollAt.getTime() : 0;
    const intervalMs = (conn.pollIntervalSec || 60) * 1000;

    if (now - lastPoll < intervalMs) continue;

    try {
      const count = await ImapService.poll(conn.id);
      if (count > 0) {
        logger.info(`Email poll: ${count} email(s) processed for connection ${conn.id}`);
      }
    } catch (err: any) {
      logger.error(`Email poll failed for connection ${conn.id}`, { error: err.message });
    }
  }
}
