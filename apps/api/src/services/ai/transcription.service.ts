import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../config/logger.js';

export class TranscriptionService {
  private client: OpenAI;

  constructor(apiKey: string) {
    // Whisper API is only available through OpenAI
    // Even if using Anthropic for chat, we need OpenAI for transcription
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Transcribe an audio file to text using OpenAI Whisper
   * @param audioPath - Path to the audio file (local file path or URL)
   * @param language - Optional language code (e.g., 'pt' for Portuguese)
   * @returns Transcribed text
   */
  async transcribe(audioPath: string, language?: string): Promise<string> {
    try {
      logger.info(`Starting transcription for: ${audioPath}`);

      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Get file stats
      const stats = fs.statSync(audioPath);
      logger.info(`Audio file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Whisper has a 25MB limit
      if (stats.size > 25 * 1024 * 1024) {
        throw new Error('Audio file too large. Maximum size is 25MB.');
      }

      // Create a readable stream
      const audioFile = fs.createReadStream(audioPath);

      // Call Whisper API
      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language || 'pt', // Default to Portuguese
        response_format: 'text',
      });

      logger.info(`Transcription completed: ${transcription.substring(0, 100)}...`);

      return transcription;
    } catch (error: any) {
      logger.error('Transcription error:', error);
      
      // Handle specific errors
      if (error.code === 'ENOENT') {
        throw new Error('Audio file not found');
      }
      
      if (error.status === 400) {
        throw new Error('Invalid audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg');
      }

      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Transcribe audio from a URL by downloading it first
   * @param audioUrl - URL of the audio file
   * @param tempDir - Directory to store temporary files
   * @param language - Optional language code
   * @returns Transcribed text
   */
  async transcribeFromUrl(audioUrl: string, tempDir: string, language?: string): Promise<string> {
    const tempFile = path.join(tempDir, `temp_audio_${Date.now()}.ogg`);
    
    try {
      logger.info(`Downloading audio from URL: ${audioUrl}`);

      // Download the file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempFile, Buffer.from(buffer));

      // Transcribe
      const transcription = await this.transcribe(tempFile, language);

      return transcription;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Check if the audio format is supported by Whisper
   */
  static isSupportedFormat(mimetype: string): boolean {
    const supportedFormats = [
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/mpga',
      'audio/m4a',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/opus',
    ];
    return supportedFormats.includes(mimetype.toLowerCase());
  }
}














