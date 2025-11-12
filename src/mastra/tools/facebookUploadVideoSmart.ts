import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import { facebookUploadVideo } from "./facebookUploadVideo";
import { facebookUploadVideoResumable } from "./facebookUploadVideoResumable";

const FILE_SIZE_THRESHOLD = parseInt(process.env.FB_UPLOAD_SIZE_THRESHOLD || '20971520'); // 20MB default

export const facebookUploadVideoSmart = createTool({
  id: "facebook-upload-video-smart",
  description: "Intelligently upload video to Facebook Page by choosing the best method based on file size (simple upload for small files, resumable for large files)",
  
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
    uploadMethod: z.enum(['simple', 'resumable']).optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [facebookUploadVideoSmart] Starting smart upload with params:', {
      videoPath: context.videoPath,
      title: context.title,
      descriptionLength: context.description.length,
    });
    
    try {
      // Check if file exists
      if (!fs.existsSync(context.videoPath)) {
        logger?.error('❌ [facebookUploadVideoSmart] File not found:', context.videoPath);
        return {
          success: false,
          error: `File tidak ditemukan: ${context.videoPath}`,
        };
      }
      
      // Get file size
      const fileStats = fs.statSync(context.videoPath);
      const fileSize = fileStats.size;
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
      const thresholdMB = (FILE_SIZE_THRESHOLD / 1024 / 1024).toFixed(2);
      
      logger?.info('📊 [facebookUploadVideoSmart] File analysis:', {
        path: context.videoPath,
        size: fileSize,
        sizeKB: (fileSize / 1024).toFixed(2) + ' KB',
        sizeMB: fileSizeMB + ' MB',
        threshold: thresholdMB + ' MB',
      });
      
      if (fileSize === 0) {
        logger?.error('❌ [facebookUploadVideoSmart] File is empty');
        return {
          success: false,
          error: 'File video kosong (0 bytes)',
        };
      }
      
      // Decide upload method based on file size
      const useSimpleUpload = fileSize < FILE_SIZE_THRESHOLD;
      const uploadMethod: 'simple' | 'resumable' = useSimpleUpload ? 'simple' : 'resumable';
      
      logger?.info(`🎯 [facebookUploadVideoSmart] Upload decision: ${uploadMethod.toUpperCase()}`, {
        fileSize: fileSizeMB + ' MB',
        threshold: thresholdMB + ' MB',
        reason: useSimpleUpload 
          ? 'File kecil (<' + thresholdMB + 'MB), menggunakan simple upload'
          : 'File besar (>=' + thresholdMB + 'MB), menggunakan resumable upload',
      });
      
      let uploadResult;
      let actualUploadMethod = uploadMethod;
      
      if (useSimpleUpload) {
        // Use simple upload for small files
        logger?.info('📤 [facebookUploadVideoSmart] Using SIMPLE upload method...');
        
        uploadResult = await facebookUploadVideo.execute({
          context: {
            videoPath: context.videoPath,
            title: context.title,
            description: context.description,
          },
          mastra,
          runtimeContext: {} as any,
        });
        
        // If simple upload fails with transient error 1363030, retry with resumable
        if (!uploadResult.success && uploadResult.error?.includes('1363030')) {
          logger?.warn('⚠️ [facebookUploadVideoSmart] Simple upload failed with transient error 1363030, retrying with resumable upload...');
          
          uploadResult = await facebookUploadVideoResumable.execute({
            context: {
              videoPath: context.videoPath,
              title: context.title,
              description: context.description,
            },
            mastra,
            runtimeContext: {} as any,
          });
          
          actualUploadMethod = 'resumable';
          
          if (uploadResult.success) {
            logger?.info('✅ [facebookUploadVideoSmart] Resumable upload (retry) succeeded!');
          } else {
            logger?.error('❌ [facebookUploadVideoSmart] Resumable upload (retry) also failed');
          }
        }
        
      } else {
        // Use resumable upload for large files
        logger?.info('📤 [facebookUploadVideoSmart] Using RESUMABLE upload method...');
        
        uploadResult = await facebookUploadVideoResumable.execute({
          context: {
            videoPath: context.videoPath,
            title: context.title,
            description: context.description,
          },
          mastra,
          runtimeContext: {} as any,
        });
      }
      
      if (uploadResult.success) {
        logger?.info('✅ [facebookUploadVideoSmart] Upload successful!', {
          method: actualUploadMethod,
          videoId: uploadResult.videoId,
          videoUrl: uploadResult.videoUrl,
        });
        
        return {
          success: true,
          videoId: uploadResult.videoId,
          postId: uploadResult.postId,
          videoUrl: uploadResult.videoUrl,
          uploadMethod: actualUploadMethod,
        };
      } else {
        logger?.error('❌ [facebookUploadVideoSmart] Upload failed:', {
          error: uploadResult.error,
          method: actualUploadMethod,
        });
        
        return {
          success: false,
          error: uploadResult.error,
          uploadMethod: actualUploadMethod,
        };
      }
      
    } catch (error: any) {
      logger?.error('❌ [facebookUploadVideoSmart] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
