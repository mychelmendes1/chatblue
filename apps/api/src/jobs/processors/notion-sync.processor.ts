import { Job } from "bullmq";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { NotionService } from "../../services/notion/notion.service";

interface NotionSyncData {
  companyId: string;
  contactPhone: string;
  contactId: string;
}

export async function notionSyncProcessor(job: Job<NotionSyncData>) {
  const { companyId, contactPhone, contactId } = job.data;

  logger.info(`Syncing contact ${contactId} with Notion for company ${companyId}`);

  try {
    // Get company settings
    const companySettings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!companySettings?.notionSyncEnabled) {
      logger.info(`Notion sync disabled for company ${companyId}`);
      return { success: false, reason: "sync_disabled" };
    }

    if (!companySettings.notionApiKey || !companySettings.notionDatabaseId) {
      logger.warn(`Notion credentials not configured for company ${companyId}`);
      return { success: false, reason: "credentials_missing" };
    }

    // Initialize Notion service
    const notionService = new NotionService(
      companySettings.notionApiKey,
      companySettings.notionDatabaseId
    );

    // Search for client in Notion
    const clientInfo = await notionService.searchClient(contactPhone);

    if (!clientInfo) {
      logger.info(`Contact ${contactPhone} not found in Notion`);

      // Update contact with "not found" status
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          metadata: {
            notionSync: {
              lastSyncAt: new Date().toISOString(),
              found: false,
            },
          },
        },
      });

      return { success: true, found: false };
    }

    // Update contact with Notion data
    const updateData: any = {
      metadata: {
        notionSync: {
          lastSyncAt: new Date().toISOString(),
          found: true,
          notionPageId: clientInfo.pageId,
          status: clientInfo.status,
        },
        notion: clientInfo,
      },
    };

    // Update name and email if available and not already set
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (contact) {
      if (!contact.name && clientInfo.name) {
        updateData.name = clientInfo.name;
      }
      if (!contact.email && clientInfo.email) {
        updateData.email = clientInfo.email;
      }
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: "notion_sync",
        description: `Contato sincronizado com Notion: ${clientInfo.status || "cliente"}`,
        companyId,
        contactId,
        metadata: {
          notionPageId: clientInfo.pageId,
          clientStatus: clientInfo.status,
        },
      },
    });

    logger.info(`Contact ${contactId} synced with Notion successfully`);
    return {
      success: true,
      found: true,
      clientStatus: clientInfo.status,
    };
  } catch (error) {
    logger.error("Error in Notion sync processor:", error);
    throw error;
  }
}
