import { Router, Request, Response } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { ensureTenant } from "../middlewares/tenant.middleware.js";
import {
  upload,
  avatarUpload,
  UploadService,
  mediaDir,
  documentsDir,
  avatarsDir,
} from "../services/upload/upload.service.js";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { normalizeMediaUrl } from "../utils/media-url.util.js";
import path from "path";
import fs from "fs";

const router = Router();

// Upload media file (images, audio, video)
router.post(
  "/media",
  authenticate,
  ensureTenant,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file size based on type
      if (!UploadService.validateFileSize(req.file)) {
        // Delete the uploaded file
        await UploadService.deleteFile(req.file.path);

        const fileType = UploadService.getFileType(req.file.mimetype);
        const maxSize = UploadService.getMaxFileSize(
          fileType as "image" | "document" | "audio" | "video"
        );

        return res.status(400).json({
          error: `File too large. Maximum size for ${fileType} is ${UploadService.formatBytes(maxSize)}`,
        });
      }

      const fileType = UploadService.getFileType(req.file.mimetype);
      const url = UploadService.getFileUrl(req.file.filename, "media");

      res.json({
        success: true,
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          type: fileType,
          url,
        },
      });
    } catch (error) {
      logger.error("Error uploading media:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

// Upload document
router.post(
  "/document",
  authenticate,
  ensureTenant,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!UploadService.validateFileSize(req.file)) {
        await UploadService.deleteFile(req.file.path);
        return res.status(400).json({
          error: `File too large. Maximum size is ${UploadService.formatBytes(25 * 1024 * 1024)}`,
        });
      }

      const url = UploadService.getFileUrl(req.file.filename, "documents");

      res.json({
        success: true,
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          type: "document",
          url,
        },
      });
    } catch (error) {
      logger.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

// Upload avatar
router.post(
  "/avatar",
  authenticate,
  ensureTenant,
  avatarUpload.single("avatar"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const url = UploadService.getFileUrl(req.file.filename, "avatars");

      // Update user avatar in database
      const userId = (req as any).user.id;
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: url },
      });

      res.json({
        success: true,
        file: {
          filename: req.file.filename,
          url,
        },
      });
    } catch (error) {
      logger.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  }
);

// Multiple files upload
router.post(
  "/multiple",
  authenticate,
  ensureTenant,
  upload.array("files", 10), // Max 10 files
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of files) {
        if (!UploadService.validateFileSize(file)) {
          await UploadService.deleteFile(file.path);
          errors.push({
            filename: file.originalname,
            error: "File too large",
          });
          continue;
        }

        const fileType = UploadService.getFileType(file.mimetype);
        const folder = fileType === "document" ? "documents" : "media";
        const url = UploadService.getFileUrl(file.filename, folder);

        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          type: fileType,
          url,
        });
      }

      res.json({
        success: true,
        files: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      logger.error("Error uploading multiple files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  }
);

// Upload and send message with media
router.post(
  "/message",
  authenticate,
  ensureTenant,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { ticketId, mediaType, caption } = req.body;
      const user = (req as any).user;

      if (!ticketId) {
        await UploadService.deleteFile(req.file.path);
        return res.status(400).json({ error: "Ticket ID is required" });
      }

      // Get ticket with connection and contact
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          companyId: user.companyId,
        },
        include: {
          contact: true,
          connection: true,
        },
      });

      if (!ticket) {
        await UploadService.deleteFile(req.file.path);
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Get file URL
      const fileType = UploadService.getFileType(req.file.mimetype);
      const url = UploadService.getFileUrl(req.file.filename, "media");

      // Determine message type
      let messageType = mediaType || fileType.toUpperCase();
      if (messageType === "IMAGE" || messageType === "VIDEO" || messageType === "AUDIO" || messageType === "DOCUMENT") {
        // Valid type
      } else {
        messageType = "DOCUMENT";
      }

      // Create message in database
      const message = await prisma.message.create({
        data: {
          type: messageType,
          content: caption || req.file.originalname,
          mediaUrl: url,
          isFromMe: true,
          isAIGenerated: false,
          status: "PENDING",
          ticketId: ticket.id,
          senderId: user.userId,
          connectionId: ticket.connectionId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isAI: true,
            },
          },
        },
      });

      // Send via WhatsApp
      try {
        const { WhatsAppService } = await import("../services/whatsapp/whatsapp.service.js");
        const whatsappService = new WhatsAppService(ticket.connection);
        
        // Get sender name
        const sender = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true },
        });
        const senderName = sender?.name || "Atendente";
        
        // Format caption with sender name
        const formattedCaption = caption ? `*${senderName}:*\n\n${caption}` : undefined;
        
        // Normalize URL to HTTPS before sending to WhatsApp
        // Baileys needs to download the file, so it must be accessible via HTTPS
        const normalizedUrl = normalizeMediaUrl(url) || url;
        
        const result = await whatsappService.sendMedia(
          ticket.contact.phone,
          normalizedUrl,
          messageType,
          formattedCaption
        );

        // Update message with WhatsApp ID and converted media URL (for audio)
        // result.finalMediaUrl contains the converted OGG URL if audio was converted
        const updateData: any = {
          wamid: result.messageId,
          status: "SENT",
          sentAt: new Date(),
        };
        
        // If audio was converted, update mediaUrl to the converted OGG file
        if (result.finalMediaUrl && result.finalMediaUrl.includes('audio-converted')) {
          updateData.mediaUrl = result.finalMediaUrl;
          logger.info(`[Upload Message] ✅ Updating audio mediaUrl to converted file: ${result.finalMediaUrl}`);
        }
        
        const updatedMessage = await prisma.message.update({
          where: { id: message.id },
          data: updateData,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isAI: true,
              },
            },
          },
        });

        // Update ticket
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            updatedAt: new Date(),
          },
        });

        // Log the response before sending
        logger.info(`[Upload Message] Returning message with mediaUrl: ${updatedMessage.mediaUrl}`);
        
        // Emit socket event with updated message (including converted OGG URL)
        const io = (req as any).app.get("io");
        if (io) {
          logger.info(`[Upload Message] Emitting message:sent with mediaUrl: ${updatedMessage.mediaUrl}`);
          io.to(`ticket:${ticket.id}`).emit("message:sent", updatedMessage);
        }

        res.json(updatedMessage);
      } catch (whatsappError) {
        logger.error("Error sending media via WhatsApp:", whatsappError);
        
        // Update message status to failed
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "FAILED" },
        });

        res.status(500).json({ error: "Failed to send media via WhatsApp" });
      }
    } catch (error) {
      logger.error("Error uploading message media:", error);
      res.status(500).json({ error: "Failed to upload and send message" });
    }
  }
);

// Delete file
router.delete("/:type/:filename", authenticate, ensureTenant, async (req, res) => {
  try {
    const { type, filename } = req.params;

    let basePath: string;
    switch (type) {
      case "media":
        basePath = mediaDir;
        break;
      case "documents":
        basePath = documentsDir;
        break;
      case "avatars":
        basePath = avatarsDir;
        break;
      default:
        return res.status(400).json({ error: "Invalid file type" });
    }

    const filepath = path.join(basePath, filename);

    // Security check: ensure the file is within the expected directory
    if (!filepath.startsWith(basePath)) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const deleted = await UploadService.deleteFile(filepath);

    if (deleted) {
      res.json({ success: true, message: "File deleted" });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    logger.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export { router as uploadRouter };
