import { Router, Request, Response } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { tenantMiddleware } from "../middlewares/tenant.middleware";
import {
  upload,
  avatarUpload,
  UploadService,
  mediaDir,
  documentsDir,
  avatarsDir,
} from "../services/upload/upload.service";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import path from "path";
import fs from "fs";

const router = Router();

// Upload media file (images, audio, video)
router.post(
  "/media",
  authenticate,
  tenantMiddleware,
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
  tenantMiddleware,
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
  tenantMiddleware,
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
  tenantMiddleware,
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

// Delete file
router.delete("/:type/:filename", authenticate, tenantMiddleware, async (req, res) => {
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
