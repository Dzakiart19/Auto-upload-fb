import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import FormData from "form-data";
import { getFacebookCredentials } from "./facebookHelpers";

export const facebookUploadVideo = createTool({
  id: "facebook-upload-video",
  description: "Upload video to Facebook Page using Graph API",
  
  inputSchema: z.object({
    videoPath: z.string().describe("Local file path of the video to upload"),
    title: z.string().describe("Title for the video"),
    description: z.string().describe("Description/caption for the video (can include hashtags)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    videoId: z.string().optional(),
    postId: z.string().optional(),
    videoUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [facebookUploadVideo] Starting execution with params:', {
      videoPath: context.videoPath,
      title: context.title,
      descriptionLength: context.description.length,
    });
    
    let pageAccessToken: string;
    let pageId: string;
    
    try {
      const credentials = await getFacebookCredentials(logger);
      pageAccessToken = credentials.pageAccessToken;
      pageId = credentials.pageId;
    } catch (error: any) {
      logger?.error('❌ [facebookUploadVideo] Failed to get Facebook credentials:', error.message);
      return {
        success: false,
        error: `Kredensial Facebook tidak valid: ${error.message}`,
      };
    }
    
    try {
      // Check if file exists and validate
      if (!fs.existsSync(context.videoPath)) {
        logger?.error('❌ [facebookUploadVideo] File not found:', context.videoPath);
        return {
          success: false,
          error: `File tidak ditemukan: ${context.videoPath}`,
        };
      }
      
      // Check file size
      const fileStats = fs.statSync(context.videoPath);
      logger?.info('📊 [facebookUploadVideo] File info:', {
        path: context.videoPath,
        size: fileStats.size,
        sizeKB: (fileStats.size / 1024).toFixed(2) + ' KB',
        sizeMB: (fileStats.size / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      if (fileStats.size === 0) {
        logger?.error('❌ [facebookUploadVideo] File is empty (0 bytes)');
        return {
          success: false,
          error: 'File video kosong (0 bytes). Video gagal di-download dengan benar.',
        };
      }
      
      // Facebook minimum video size check (very small files are likely corrupt)
      if (fileStats.size < 1024) { // Less than 1KB is definitely invalid
        logger?.error('❌ [facebookUploadVideo] File too small (likely corrupt):', fileStats.size);
        return {
          success: false,
          error: `File video terlalu kecil (${fileStats.size} bytes), kemungkinan corrupt atau tidak lengkap.`,
        };
      }
      
      logger?.info('📝 [facebookUploadVideo] Uploading video to Facebook Page...');
      logger?.info('🔑 [facebookUploadVideo] Using credentials:', {
        pageId,
        tokenLength: pageAccessToken.length,
        tokenPrefix: pageAccessToken.substring(0, 20) + '...',
      });
      
      // Create form data for video upload
      const formData = new FormData();
      formData.append('source', fs.createReadStream(context.videoPath));
      formData.append('title', context.title);
      formData.append('description', context.description);
      
      // Upload video to Facebook Page
      // Note: access_token is passed in URL to avoid FormData compatibility issues
      const uploadUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos?access_token=${encodeURIComponent(pageAccessToken)}`;
      
      logger?.info('📤 [facebookUploadVideo] Sending request to Facebook API');
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });
      
      const uploadResult = await uploadResponse.json();
      
      logger?.info('📊 [facebookUploadVideo] Facebook API response:', {
        ok: uploadResponse.ok,
        status: uploadResponse.status,
        hasError: !!uploadResult.error,
        result: uploadResult
      });
      
      if (!uploadResponse.ok || uploadResult.error) {
        const errorCode = uploadResult.error?.code || uploadResponse.status;
        const errorMessage = uploadResult.error?.message || 'Unknown error';
        const errorType = uploadResult.error?.type || 'Unknown';
        
        logger?.error('❌ [facebookUploadVideo] Upload failed:', {
          code: errorCode,
          message: errorMessage,
          type: errorType,
          fullError: uploadResult
        });
        
        // Provide more specific error messages
        let userMessage = errorMessage;
        if (errorCode === 390) {
          userMessage = 'File video tidak valid atau corrupt. Pastikan video yang dikirim bisa diputar dan tidak rusak.';
        } else if (errorCode === 100) {
          userMessage = 'Permission error: Token Facebook tidak memiliki izin untuk upload video.';
        } else if (errorCode === 200) {
          userMessage = 'Permission error: Token memerlukan permission tambahan.';
        }
        
        return {
          success: false,
          error: `Upload gagal: ${userMessage}`,
        };
      }
      
      const videoId = uploadResult.id;
      const postId = uploadResult.post_id || uploadResult.id;
      const videoUrl = `https://www.facebook.com/${pageId}/videos/${videoId}`;
      
      logger?.info('✅ [facebookUploadVideo] Video uploaded successfully:', {
        videoId,
        postId,
        videoUrl,
      });
      
      // Clean up temporary file
      try {
        fs.unlinkSync(context.videoPath);
        logger?.info('🗑️ [facebookUploadVideo] Temporary file cleaned up');
      } catch (cleanupError) {
        logger?.warn('⚠️ [facebookUploadVideo] Failed to clean up temporary file:', cleanupError);
      }
      
      return {
        success: true,
        videoId,
        postId,
        videoUrl,
      };
      
    } catch (error: any) {
      logger?.error('❌ [facebookUploadVideo] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
