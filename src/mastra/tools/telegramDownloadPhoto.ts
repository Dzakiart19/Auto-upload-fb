import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export const telegramDownloadPhoto = createTool({
  id: "telegram-download-photo",
  description: "Download photo file from Telegram using file_id",
  
  inputSchema: z.object({
    fileId: z.string().describe("Telegram file_id of the photo"),
    fileName: z.string().optional().describe("Custom file name for the downloaded photo"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string().optional(),
    fileSize: z.number().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [telegramDownloadPhoto] Starting execution with params:', context);
    
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      logger?.error('❌ [telegramDownloadPhoto] TELEGRAM_BOT_TOKEN not found');
      return {
        success: false,
        error: "TELEGRAM_BOT_TOKEN tidak ditemukan di environment variables",
      };
    }
    
    try {
      logger?.info('📝 [telegramDownloadPhoto] Getting file path from Telegram...');
      
      // Get file path from Telegram
      const fileInfoResponse = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${context.fileId}`
      );
      
      if (!fileInfoResponse.ok) {
        const errorData = await fileInfoResponse.json();
        logger?.error('❌ [telegramDownloadPhoto] Failed to get file info:', errorData);
        return {
          success: false,
          error: `Gagal mendapatkan info file: ${JSON.stringify(errorData)}`,
        };
      }
      
      const fileInfo = await fileInfoResponse.json();
      
      if (!fileInfo.ok || !fileInfo.result.file_path) {
        logger?.error('❌ [telegramDownloadPhoto] Invalid file info response:', fileInfo);
        return {
          success: false,
          error: "File path tidak ditemukan dalam response Telegram",
        };
      }
      
      const filePath = fileInfo.result.file_path;
      const fileSize = fileInfo.result.file_size || 0;
      
      // Extract file extension from Telegram file path
      const fileExtension = filePath.split('.').pop() || 'jpg';
      
      logger?.info('📝 [telegramDownloadPhoto] Downloading file from Telegram...', { 
        filePath, 
        fileSize,
        fileExtension,
      });
      
      // Download the file
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
      const downloadResponse = await fetch(downloadUrl);
      
      if (!downloadResponse.ok) {
        logger?.error('❌ [telegramDownloadPhoto] Failed to download file');
        return {
          success: false,
          error: `Gagal mendownload file: ${downloadResponse.statusText}`,
        };
      }
      
      // Save file to temporary directory
      const buffer = await downloadResponse.arrayBuffer();
      const bufferData = Buffer.from(buffer);
      
      logger?.info('📊 [telegramDownloadPhoto] Downloaded buffer info:', {
        byteLength: buffer.byteLength,
        bufferLength: bufferData.length,
        expectedSize: fileSize
      });
      
      // Validate buffer size
      if (bufferData.length === 0) {
        logger?.error('❌ [telegramDownloadPhoto] Downloaded buffer is empty!');
        return {
          success: false,
          error: 'File yang di-download kosong (0 bytes)',
        };
      }
      
      // Check if buffer size matches expected size (with some tolerance)
      if (fileSize > 0 && Math.abs(bufferData.length - fileSize) > 1000) {
        logger?.warn('⚠️ [telegramDownloadPhoto] Size mismatch:', {
          expected: fileSize,
          actual: bufferData.length,
          difference: Math.abs(bufferData.length - fileSize)
        });
      }
      
      // Use original file extension from Telegram, fallback to jpg
      const baseFileName = context.fileName || `photo_${Date.now()}`;
      const fileName = baseFileName.includes('.') ? baseFileName : `${baseFileName}.${fileExtension}`;
      const tmpDir = '/tmp/telegram_photos';
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const localFilePath = path.join(tmpDir, fileName);
      fs.writeFileSync(localFilePath, bufferData);
      
      // Verify file was written correctly
      const stats = fs.statSync(localFilePath);
      logger?.info('✅ [telegramDownloadPhoto] Photo downloaded successfully:', { 
        localFilePath, 
        fileSize: stats.size,
        expectedSize: fileSize,
        bufferSize: bufferData.length,
        fileExtension,
      });
      
      if (stats.size === 0) {
        logger?.error('❌ [telegramDownloadPhoto] Written file is empty!');
        return {
          success: false,
          error: 'File tersimpan dengan ukuran 0 bytes',
        };
      }
      
      // Additional validation: check if file size is suspiciously small
      if (stats.size < 1024) { // Less than 1KB is likely invalid for a photo
        logger?.warn('⚠️ [telegramDownloadPhoto] File size is very small (< 1KB), might be corrupt:', stats.size);
      }
      
      return {
        success: true,
        filePath: localFilePath,
        fileSize: stats.size,
      };
      
    } catch (error: any) {
      logger?.error('❌ [telegramDownloadPhoto] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
