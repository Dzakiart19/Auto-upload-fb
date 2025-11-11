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
      
      logger?.info('📝 [telegramDownloadVideo] Downloading file from Telegram...', { filePath, fileSize });
      
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
      const fileName = context.fileName || `video_${Date.now()}.mp4`;
      const tmpDir = '/tmp/telegram_videos';
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const localFilePath = path.join(tmpDir, fileName);
      fs.writeFileSync(localFilePath, Buffer.from(buffer));
      
      logger?.info('✅ [telegramDownloadVideo] Video downloaded successfully:', { 
        localFilePath, 
        fileSize: buffer.byteLength 
      });
      
      return {
        success: true,
        filePath: localFilePath,
        fileSize: buffer.byteLength,
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
