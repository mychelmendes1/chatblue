import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadService } from "./upload.service";
import fs from "fs";

// Mock fs
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("UploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFileUrl", () => {
    it("should generate correct URL for media files", () => {
      const url = UploadService.getFileUrl("test-image.jpg", "media");
      expect(url).toContain("/uploads/media/test-image.jpg");
    });

    it("should generate correct URL for documents", () => {
      const url = UploadService.getFileUrl("document.pdf", "documents");
      expect(url).toContain("/uploads/documents/document.pdf");
    });

    it("should generate correct URL for avatars", () => {
      const url = UploadService.getFileUrl("avatar.png", "avatars");
      expect(url).toContain("/uploads/avatars/avatar.png");
    });
  });

  describe("getFileType", () => {
    it("should identify image types correctly", () => {
      expect(UploadService.getFileType("image/jpeg")).toBe("image");
      expect(UploadService.getFileType("image/png")).toBe("image");
      expect(UploadService.getFileType("image/gif")).toBe("image");
      expect(UploadService.getFileType("image/webp")).toBe("image");
    });

    it("should identify document types correctly", () => {
      expect(UploadService.getFileType("application/pdf")).toBe("document");
      expect(UploadService.getFileType("application/msword")).toBe("document");
      expect(UploadService.getFileType("text/plain")).toBe("document");
      expect(UploadService.getFileType("text/csv")).toBe("document");
    });

    it("should identify audio types correctly", () => {
      expect(UploadService.getFileType("audio/ogg")).toBe("audio");
      expect(UploadService.getFileType("audio/mpeg")).toBe("audio");
      expect(UploadService.getFileType("audio/wav")).toBe("audio");
    });

    it("should identify video types correctly", () => {
      expect(UploadService.getFileType("video/mp4")).toBe("video");
      expect(UploadService.getFileType("video/webm")).toBe("video");
    });

    it("should return unknown for unrecognized types", () => {
      expect(UploadService.getFileType("application/unknown")).toBe("unknown");
    });
  });

  describe("validateFileSize", () => {
    it("should validate image file size (max 5MB)", () => {
      const validFile = {
        mimetype: "image/jpeg",
        size: 4 * 1024 * 1024, // 4MB
      } as Express.Multer.File;

      const invalidFile = {
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      expect(UploadService.validateFileSize(validFile)).toBe(true);
      expect(UploadService.validateFileSize(invalidFile)).toBe(false);
    });

    it("should validate document file size (max 25MB)", () => {
      const validFile = {
        mimetype: "application/pdf",
        size: 20 * 1024 * 1024, // 20MB
      } as Express.Multer.File;

      const invalidFile = {
        mimetype: "application/pdf",
        size: 30 * 1024 * 1024, // 30MB
      } as Express.Multer.File;

      expect(UploadService.validateFileSize(validFile)).toBe(true);
      expect(UploadService.validateFileSize(invalidFile)).toBe(false);
    });

    it("should validate audio file size (max 16MB)", () => {
      const validFile = {
        mimetype: "audio/mpeg",
        size: 10 * 1024 * 1024, // 10MB
      } as Express.Multer.File;

      const invalidFile = {
        mimetype: "audio/mpeg",
        size: 20 * 1024 * 1024, // 20MB
      } as Express.Multer.File;

      expect(UploadService.validateFileSize(validFile)).toBe(true);
      expect(UploadService.validateFileSize(invalidFile)).toBe(false);
    });

    it("should validate video file size (max 100MB)", () => {
      const validFile = {
        mimetype: "video/mp4",
        size: 50 * 1024 * 1024, // 50MB
      } as Express.Multer.File;

      const invalidFile = {
        mimetype: "video/mp4",
        size: 150 * 1024 * 1024, // 150MB
      } as Express.Multer.File;

      expect(UploadService.validateFileSize(validFile)).toBe(true);
      expect(UploadService.validateFileSize(invalidFile)).toBe(false);
    });
  });

  describe("deleteFile", () => {
    it("should delete existing file and return true", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await UploadService.deleteFile("/path/to/file.jpg");

      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/file.jpg");
      expect(fs.unlinkSync).toHaveBeenCalledWith("/path/to/file.jpg");
      expect(result).toBe(true);
    });

    it("should return false for non-existing file", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await UploadService.deleteFile("/path/to/nonexistent.jpg");

      expect(fs.existsSync).toHaveBeenCalledWith("/path/to/nonexistent.jpg");
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = await UploadService.deleteFile("/path/to/file.jpg");

      expect(result).toBe(false);
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(UploadService.formatBytes(0)).toBe("0 Bytes");
      expect(UploadService.formatBytes(1024)).toBe("1 KB");
      expect(UploadService.formatBytes(1024 * 1024)).toBe("1 MB");
      expect(UploadService.formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
      expect(UploadService.formatBytes(1536)).toBe("1.5 KB");
    });
  });

  describe("getMaxFileSize", () => {
    it("should return correct max size for each type", () => {
      expect(UploadService.getMaxFileSize("image")).toBe(5 * 1024 * 1024);
      expect(UploadService.getMaxFileSize("document")).toBe(25 * 1024 * 1024);
      expect(UploadService.getMaxFileSize("audio")).toBe(16 * 1024 * 1024);
      expect(UploadService.getMaxFileSize("video")).toBe(100 * 1024 * 1024);
    });
  });
});
