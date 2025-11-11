import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export const telegramDownloadVideo = createTool({
  id: "telegram-download-video",
  description: "Download video file from Telegram using file_id",
  
  inputSchema: z.object({
    fileId: z.string().describe("Telegram file_id of the video"),
    fileName: z.string().optional().describe("Custom file name for the downloaded video"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string().optional(),
    fileSize: z.number().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [telegramDownloadVideo] Starting execution with params:', context);
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger?.error('❌ [telegramDownloadVideo] TELEGRAM_BOT_TOKEN not found');
      return {
        success: false,
        error: "TELEGRAM_BOT_TOKEN tidak ditemukan di environment variables",
      };
    }
    
    try {
      logger?.info('📝 [telegramDownloadVideo] Getting file path from Telegram...');
      
      // Get file path from Telegram
      const fileInfoResponse = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${context.fileId}`
      );
      
      if (!fileInfoResponse.ok) {
        const errorData = await fileInfoResponse.json();
        logger?.error('❌ [telegramDownloadVideo] Failed to get file info:', errorData);
        return {
          success: false,
          error: `Gagal mendapatkan info file: ${JSON.stringify(errorData)}`,
        };
      }
      
      const fileInfo = await fileInfoResponse.json();
      
      if (!fileInfo.ok || !fileInfo.result.file_path) {
        logger?.error('❌ [telegramDownloadVideo] Invalid file info response:', fileInfo);
        return {
          success: false,
          error: "File path tidak ditemukan dalam response Telegram",
        };
      }
      
      const filePath = fileInfo.result.file_path;
      const fileSize = fileInfo.result.file_size || 0;
      
      // Extract file extension from Telegram file path
      const fileExtension = filePath.split('.').pop() || 'mp4';
      
      logger?.info('📝 [telegramDownloadVideo] Downloading file from Telegram...', { 
        filePath, 
        fileSize,
        fileExtension,
      });
      
      // Download the file
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const downloadResponse = await fetch(downloadUrl);
      
      if (!downloadResponse.ok) {
        logger?.error('❌ [telegramDownloadVideo] Failed to download file');
        return {
          success: false,
          error: `Gagal mendownload file: ${downloadResponse.statusText}`,
        };
      }
      
      // Save file to temporary directory
      const buffer = await downloadResponse.arrayBuffer();
      const bufferData = Buffer.from(buffer);
      
      logger?.info('📊 [telegramDownloadVideo] Downloaded buffer info:', {
        byteLength: buffer.byteLength,
        bufferLength: bufferData.length,
        expectedSize: fileSize
      });
      
      // Validate buffer size
      if (bufferData.length === 0) {
        logger?.error('❌ [telegramDownloadVideo] Downloaded buffer is empty!');
        return {
          success: false,
          error: 'File yang di-download kosong (0 bytes)',
        };
      }
      
      // Check if buffer size matches expected size (with some tolerance)
      if (fileSize > 0 && Math.abs(bufferData.length - fileSize) > 1000) {
        logger?.warn('⚠️ [telegramDownloadVideo] Size mismatch:', {
          expected: fileSize,
          actual: bufferData.length,
          difference: Math.abs(bufferData.length - fileSize)
        });
      }
      
      // Use original file extension from Telegram, fallback to mp4
      const baseFileName = context.fileName || `video_${Date.now()}`;
      const fileName = baseFileName.includes('.') ? baseFileName : `${baseFileName}.${fileExtension}`;
      const tmpDir = '/tmp/telegram_videos';
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const localFilePath = path.join(tmpDir, fileName);
      fs.writeFileSync(localFilePath, bufferData);
      
      // Verify file was written correctly
      const stats = fs.statSync(localFilePath);
      logger?.info('✅ [telegramDownloadVideo] Video downloaded successfully:', { 
        localFilePath, 
        fileSize: stats.size,
        expectedSize: fileSize,
        bufferSize: bufferData.length,
        fileExtension,
      });
      
      if (stats.size === 0) {
        logger?.error('❌ [telegramDownloadVideo] Written file is empty!');
        return {
          success: false,
          error: 'File tersimpan dengan ukuran 0 bytes',
        };
      }
      
      // Additional validation: check if file size is suspiciously small
      if (stats.size < 10240) { // Less than 10KB is likely invalid for a video
        logger?.warn('⚠️ [telegramDownloadVideo] File size is very small (< 10KB), might be corrupt:', stats.size);
      }
      
      return {
        success: true,
        filePath: localFilePath,
        fileSize: stats.size,
      };
      
    } catch (error: any) {
      logger?.error('❌ [telegramDownloadVideo] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
