import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../config/logger";

// Ensure upload directories exist
const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
const tempDir = path.join(uploadsDir, "temp");
const mediaDir = path.join(uploadsDir, "media");
const documentsDir = path.join(uploadsDir, "documents");
const avatarsDir = path.join(uploadsDir, "avatars");

[uploadsDir, tempDir, mediaDir, documentsDir, avatarsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed MIME types
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_DOCUMENTS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];
const ALLOWED_AUDIO = ["audio/ogg", "audio/mpeg", "audio/wav", "audio/webm"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

const ALL_ALLOWED = [
  ...ALLOWED_IMAGES,
  ...ALLOWED_DOCUMENTS,
  ...ALLOWED_AUDIO,
  ...ALLOWED_VIDEO,
];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_AUDIO_SIZE = 16 * 1024 * 1024; // 16MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = mediaDir;

    if (ALLOWED_DOCUMENTS.includes(file.mimetype)) {
      dest = documentsDir;
    } else if (file.fieldname === "avatar") {
      dest = avatarsDir;
    }

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 50);
    cb(null, `${uniqueId}-${safeName}`);
  },
});

// File filter
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALL_ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Multer instance for general uploads
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Use the largest limit, validate per type below
  },
});

// Multer instance for avatars
export const avatarUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for avatars"));
    }
  },
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

// Helper class for file operations
export class UploadService {
  static getFileUrl(filename: string, type: "media" | "documents" | "avatars"): string {
    const baseUrl = process.env.API_URL || "http://localhost:3001";
    return `${baseUrl}/uploads/${type}/${filename}`;
  }

  static async deleteFile(filepath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info(`Deleted file: ${filepath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting file ${filepath}:`, error);
      return false;
    }
  }

  static getFileType(
    mimetype: string
  ): "image" | "document" | "audio" | "video" | "unknown" {
    if (ALLOWED_IMAGES.includes(mimetype)) return "image";
    if (ALLOWED_DOCUMENTS.includes(mimetype)) return "document";
    if (ALLOWED_AUDIO.includes(mimetype)) return "audio";
    if (ALLOWED_VIDEO.includes(mimetype)) return "video";
    return "unknown";
  }

  static validateFileSize(file: Express.Multer.File): boolean {
    const type = this.getFileType(file.mimetype);

    switch (type) {
      case "image":
        return file.size <= MAX_IMAGE_SIZE;
      case "document":
        return file.size <= MAX_DOCUMENT_SIZE;
      case "audio":
        return file.size <= MAX_AUDIO_SIZE;
      case "video":
        return file.size <= MAX_VIDEO_SIZE;
      default:
        return false;
    }
  }

  static getMaxFileSize(type: "image" | "document" | "audio" | "video"): number {
    switch (type) {
      case "image":
        return MAX_IMAGE_SIZE;
      case "document":
        return MAX_DOCUMENT_SIZE;
      case "audio":
        return MAX_AUDIO_SIZE;
      case "video":
        return MAX_VIDEO_SIZE;
      default:
        return 0;
    }
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export {
  uploadsDir,
  mediaDir,
  documentsDir,
  avatarsDir,
  ALLOWED_IMAGES,
  ALLOWED_DOCUMENTS,
  ALLOWED_AUDIO,
  ALLOWED_VIDEO,
};
