import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import { getFacebookCredentials } from "./facebookHelpers";

export const facebookUploadVideoResumable = createTool({
  id: "facebook-upload-video-resumable",
  description: "Upload video to Facebook Page using Resumable Upload API (more reliable for larger files)",
  
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
    logger?.info('🔧 [facebookUploadVideoResumable] Starting resumable upload with params:', {
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
      logger?.error('❌ [facebookUploadVideoResumable] Failed to get Facebook credentials:', error.message);
      return {
        success: false,
        error: `Kredensial Facebook tidak valid: ${error.message}`,
      };
    }
    
    try {
      // Check if file exists and validate
      if (!fs.existsSync(context.videoPath)) {
        logger?.error('❌ [facebookUploadVideoResumable] File not found:', context.videoPath);
        return {
          success: false,
          error: `File tidak ditemukan: ${context.videoPath}`,
        };
      }
      
      // Get file info
      const fileStats = fs.statSync(context.videoPath);
      const fileSize = fileStats.size;
      
      logger?.info('📊 [facebookUploadVideoResumable] File info:', {
        path: context.videoPath,
        size: fileSize,
        sizeKB: (fileSize / 1024).toFixed(2) + ' KB',
        sizeMB: (fileSize / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      if (fileSize === 0) {
        logger?.error('❌ [facebookUploadVideoResumable] File is empty');
        return {
          success: false,
          error: 'File video kosong (0 bytes)',
        };
      }
      
      // Step 1: Initialize upload session
      logger?.info('📝 [facebookUploadVideoResumable] Step 1: Initializing upload session...');
      
      const initUrl = `https://graph.facebook.com/v19.0/${pageId}/videos`;
      const initParams = new URLSearchParams({
        access_token: pageAccessToken,
        upload_phase: 'start',
        file_size: fileSize.toString(),
      });
      
      const initResponse = await fetch(`${initUrl}?${initParams}`, {
        method: 'POST',
      });
      
      const initResult = await initResponse.json();
      
      if (!initResponse.ok || initResult.error) {
        logger?.error('❌ [facebookUploadVideoResumable] Failed to initialize upload:', initResult);
        return {
          success: false,
          error: `Gagal inisialisasi upload: ${initResult.error?.message || 'Unknown error'}`,
        };
      }
      
      const uploadSessionId = initResult.upload_session_id;
      const videoId = initResult.video_id;
      
      logger?.info('✅ [facebookUploadVideoResumable] Upload session initialized:', {
        uploadSessionId,
        videoId,
      });
      
      // Step 2: Upload video file
      logger?.info('📤 [facebookUploadVideoResumable] Step 2: Uploading video file...');
      
      const videoBuffer = fs.readFileSync(context.videoPath);
      
      const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/videos`;
      const uploadParams = new URLSearchParams({
        access_token: pageAccessToken,
        upload_phase: 'transfer',
        upload_session_id: uploadSessionId,
        start_offset: '0',
      });
      
      const uploadResponse = await fetch(`${uploadUrl}?${uploadParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: videoBuffer,
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok || uploadResult.error) {
        logger?.error('❌ [facebookUploadVideoResumable] Upload failed:', uploadResult);
        return {
          success: false,
          error: `Upload gagal: ${uploadResult.error?.message || 'Unknown error'}`,
        };
      }
      
      logger?.info('✅ [facebookUploadVideoResumable] File uploaded successfully');
      
      // Step 3: Finalize upload with title and description
      logger?.info('📝 [facebookUploadVideoResumable] Step 3: Finalizing upload...');
      
      const finalizeUrl = `https://graph.facebook.com/v19.0/${pageId}/videos`;
      const finalizeParams = new URLSearchParams({
        access_token: pageAccessToken,
        upload_phase: 'finish',
        upload_session_id: uploadSessionId,
        title: context.title,
        description: context.description,
      });
      
      const finalizeResponse = await fetch(`${finalizeUrl}?${finalizeParams}`, {
        method: 'POST',
      });
      
      const finalizeResult = await finalizeResponse.json();
      
      if (!finalizeResponse.ok || finalizeResult.error) {
        logger?.error('❌ [facebookUploadVideoResumable] Failed to finalize:', finalizeResult);
        return {
          success: false,
          error: `Gagal finalisasi upload: ${finalizeResult.error?.message || 'Unknown error'}`,
        };
      }
      
      logger?.info('✅ [facebookUploadVideoResumable] Upload finalized successfully');
      
      const success = finalizeResult.success === true;
      const videoUrl = `https://www.facebook.com/${pageId}/videos/${videoId}`;
      
      logger?.info('🎉 [facebookUploadVideoResumable] Video uploaded successfully:', {
        videoId,
        videoUrl,
        success,
      });
      
      // Clean up temporary file
      try {
        fs.unlinkSync(context.videoPath);
        logger?.info('🗑️ [facebookUploadVideoResumable] Temporary file cleaned up');
      } catch (cleanupError) {
        logger?.warn('⚠️ [facebookUploadVideoResumable] Failed to clean up temporary file:', cleanupError);
      }
      
      return {
        success: true,
        videoId,
        postId: videoId,
        videoUrl,
      };
      
    } catch (error: any) {
      logger?.error('❌ [facebookUploadVideoResumable] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
