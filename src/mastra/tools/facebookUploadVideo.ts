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
      // Check if file exists
      if (!fs.existsSync(context.videoPath)) {
        logger?.error('❌ [facebookUploadVideo] File not found:', context.videoPath);
        return {
          success: false,
          error: `File tidak ditemukan: ${context.videoPath}`,
        };
      }
      
      logger?.info('📝 [facebookUploadVideo] Uploading video to Facebook Page...');
      
      // Create form data for video upload
      const formData = new FormData();
      formData.append('source', fs.createReadStream(context.videoPath));
      formData.append('title', context.title);
      formData.append('description', context.description);
      formData.append('access_token', pageAccessToken);
      
      // Upload video to Facebook Page
      const uploadUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok || uploadResult.error) {
        logger?.error('❌ [facebookUploadVideo] Upload failed:', uploadResult);
        return {
          success: false,
          error: `Upload gagal: ${uploadResult.error?.message || JSON.stringify(uploadResult)}`,
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
