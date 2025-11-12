import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import FormData from "form-data";
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
      
      const initUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos`;
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
      const initialStartOffset = parseInt(initResult.start_offset || '0');
      const initialEndOffset = parseInt(initResult.end_offset || fileSize.toString());
      
      logger?.info('✅ [facebookUploadVideoResumable] Upload session initialized:', {
        uploadSessionId,
        videoId,
        initialStartOffset,
        initialEndOffset,
        initialChunkSize: initialEndOffset - initialStartOffset,
      });
      
      // Step 2: Upload video file in chunks
      logger?.info('📤 [facebookUploadVideoResumable] Step 2: Uploading video file in chunks...');
      
      // Detect file extension and content type
      const fileExtension = context.videoPath.split('.').pop()?.toLowerCase() || 'mp4';
      const contentTypeMap: Record<string, string> = {
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
      };
      const contentType = contentTypeMap[fileExtension] || 'video/mp4';
      
      logger?.info('📊 [facebookUploadVideoResumable] File metadata:', {
        extension: fileExtension,
        contentType: contentType,
        fileSize: fileSize,
      });
      
      // Upload in chunks following Facebook's offset pattern
      // Open file once for the entire upload
      const fd = fs.openSync(context.videoPath, 'r');
      
      try {
        // Use offsets from the start phase, not hardcoded values
        let currentStartOffset = initialStartOffset;
        let currentEndOffset = Math.min(initialEndOffset, fileSize); // Clamp to file size
        let chunkNumber = 0;
        let previousOffset = -1;
        
        while (currentStartOffset < fileSize) {
          chunkNumber++;
          
          // Safety check: detect infinite loop
          if (currentStartOffset === previousOffset) {
            logger?.error('❌ [facebookUploadVideoResumable] Upload stalled - offset not advancing');
            throw new Error('Upload stalled: offset not advancing. Please try again.');
          }
          previousOffset = currentStartOffset;
          
          const chunkSize = currentEndOffset - currentStartOffset;
          
          // Validate chunk size
          if (chunkSize <= 0) {
            logger?.error('❌ [facebookUploadVideoResumable] Invalid chunk size:', chunkSize);
            throw new Error(`Invalid chunk size: ${chunkSize}. Facebook returned inconsistent offsets.`);
          }
          
          if (chunkSize > fileSize - currentStartOffset) {
            logger?.error('❌ [facebookUploadVideoResumable] Chunk size exceeds remaining file size');
            throw new Error(`Chunk size ${chunkSize} exceeds remaining ${fileSize - currentStartOffset} bytes.`);
          }
          
          logger?.info(`📦 [facebookUploadVideoResumable] Uploading chunk ${chunkNumber}...`, {
            startOffset: currentStartOffset,
            endOffset: currentEndOffset,
            chunkSize: chunkSize,
            totalSize: fileSize,
            progress: `${((currentStartOffset / fileSize) * 100).toFixed(1)}%`,
          });
          
          // Read only the chunk Facebook requested
          const buffer = Buffer.alloc(chunkSize);
          fs.readSync(fd, buffer, 0, chunkSize, currentStartOffset);
          
          // Create FormData for this chunk
          const form = new FormData();
          form.append('upload_phase', 'transfer');
          form.append('start_offset', currentStartOffset.toString());
          form.append('upload_session_id', uploadSessionId);
          form.append('video_file_chunk', buffer, {
            filename: `video.${fileExtension}`,
            contentType: contentType,
          });
          
          const uploadUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos?access_token=${encodeURIComponent(pageAccessToken)}`;
          
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: form as any,
            headers: form.getHeaders(),
          });
          
          const uploadResult = await uploadResponse.json();
          
          if (!uploadResponse.ok || uploadResult.error) {
            logger?.error('❌ [facebookUploadVideoResumable] Chunk upload failed:', uploadResult);
            throw new Error(`Upload gagal pada chunk ${chunkNumber}: ${uploadResult.error?.message || 'Unknown error'}`);
          }
          
          // Facebook returns the next offset to upload
          const nextStartOffset = parseInt(uploadResult.start_offset || '0');
          const nextEndOffset = parseInt(uploadResult.end_offset || fileSize.toString());
          
          logger?.info(`✅ [facebookUploadVideoResumable] Chunk ${chunkNumber} uploaded`, {
            nextStartOffset,
            nextEndOffset,
            remaining: fileSize - nextStartOffset,
          });
          
          // Update offsets for next iteration, clamp to file size
          currentStartOffset = nextStartOffset;
          currentEndOffset = Math.min(nextEndOffset, fileSize);
          
          // If start equals or exceeds end, we're done
          if (currentStartOffset >= currentEndOffset || currentStartOffset >= fileSize) {
            break;
          }
        }
        
        logger?.info('✅ [facebookUploadVideoResumable] All chunks uploaded successfully');
        
      } finally {
        // Always close the file descriptor
        fs.closeSync(fd);
        logger?.info('🗑️ [facebookUploadVideoResumable] File descriptor closed');
      }
      
      // Step 3: Finalize upload with title and description
      logger?.info('📝 [facebookUploadVideoResumable] Step 3: Finalizing upload...');
      
      const finalizeUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos`;
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
