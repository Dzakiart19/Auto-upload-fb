import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import FormData from "form-data";
import axios from "axios";
import { getFacebookCredentials, getVideoMetadata, validateVideoFile } from "./facebookHelpers";

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
      
      // Validate video file signature
      logger?.info('🔍 [facebookUploadVideoResumable] Validating video file...');
      const isValid = validateVideoFile(context.videoPath, logger);
      if (!isValid) {
        logger?.error('❌ [facebookUploadVideoResumable] Video file validation failed');
        return {
          success: false,
          error: 'File video tidak valid. File mungkin corrupt atau bukan format video yang didukung.',
        };
      }
      
      // Get video metadata for proper Content-Type
      const videoMetadata = getVideoMetadata(context.videoPath);
      logger?.info('📊 [facebookUploadVideoResumable] Video metadata:', videoMetadata);
      
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
      
      // IMPORTANT: Override Facebook's suggested chunk size with smaller chunks
      // to work around Replit's slow connection to Facebook API
      // Facebook suggests 1MB but we use 128KB for better reliability
      const CUSTOM_CHUNK_SIZE = 131072; // 128KB in bytes (much smaller for slow connections)
      const initialEndOffset = Math.min(initialStartOffset + CUSTOM_CHUNK_SIZE, fileSize);
      
      logger?.info('✅ [facebookUploadVideoResumable] Upload session initialized:', {
        uploadSessionId,
        videoId,
        initialStartOffset,
        initialEndOffset,
        initialChunkSize: initialEndOffset - initialStartOffset,
      });
      
      // Step 2: Upload video file in chunks
      logger?.info('📤 [facebookUploadVideoResumable] Step 2: Uploading video file in chunks...');
      
      // Upload in chunks following Facebook's offset pattern (using CUSTOM_CHUNK_SIZE defined above)
      // Open file once for the entire upload
      const fd = fs.openSync(context.videoPath, 'r');
      const tmpChunkDir = '/tmp/fb_chunks';
      
      // Create temp directory for chunks
      if (!fs.existsSync(tmpChunkDir)) {
        fs.mkdirSync(tmpChunkDir, { recursive: true });
      }
      
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
          
          // Write chunk to temporary file (more reliable for form-data library)
          const chunkFilePath = `${tmpChunkDir}/chunk_${Date.now()}_${chunkNumber}.${videoMetadata.extension}`;
          fs.writeFileSync(chunkFilePath, buffer);
          
          logger?.info(`💾 [facebookUploadVideoResumable] Chunk written to temp file:`, {
            path: chunkFilePath,
            size: fs.statSync(chunkFilePath).size,
          });
          
          try {
            const uploadUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos?access_token=${encodeURIComponent(pageAccessToken)}`;
            
            // Retry logic for chunk upload with exponential backoff
            const MAX_CHUNK_RETRIES = 5;
            let chunkUploadSuccess = false;
            let nextStartOffset = currentStartOffset;
            let nextEndOffset = currentEndOffset;
            
            for (let retryAttempt = 1; retryAttempt <= MAX_CHUNK_RETRIES; retryAttempt++) {
              try {
                // Create FormData for this chunk using file stream (must recreate on each retry)
                const form = new FormData();
                form.append('upload_phase', 'transfer');
                form.append('start_offset', currentStartOffset.toString());
                form.append('upload_session_id', uploadSessionId);
                form.append('video_file_chunk', fs.createReadStream(chunkFilePath), {
                  filename: `chunk.${videoMetadata.extension}`,
                  contentType: videoMetadata.contentType,
                });
                
                logger?.info(`🔼 [facebookUploadVideoResumable] Sending chunk ${chunkNumber} (attempt ${retryAttempt}/${MAX_CHUNK_RETRIES})...`, {
                  url: uploadUrl.split('?')[0],
                  contentType: videoMetadata.contentType,
                  chunkSize: chunkSize,
                });
                
                // Add delay before each chunk (except first chunk, first attempt)
                if (chunkNumber > 1 || retryAttempt > 1) {
                  const delayMs = retryAttempt > 1 ? 5000 * retryAttempt : 3000; // Much longer delay: 3s between chunks, 5-25s for retries
                  logger?.info(`⏱️ [facebookUploadVideoResumable] Waiting ${delayMs}ms before uploading...`);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                
                // Use axios instead of fetch for proper multipart/form-data handling
                // axios automatically includes Content-Type with boundary from form.getHeaders()
                const uploadResponse = await axios.post(uploadUrl, form, {
                  headers: form.getHeaders(),
                  maxContentLength: Infinity,
                  maxBodyLength: Infinity,
                  validateStatus: () => true, // Don't throw on any status code
                });
                
                const uploadResult = uploadResponse.data;
                
                logger?.info(`📩 [facebookUploadVideoResumable] Facebook response for chunk ${chunkNumber} (attempt ${retryAttempt}):`, {
                  status: uploadResponse.status,
                  ok: uploadResponse.status >= 200 && uploadResponse.status < 300,
                  result: uploadResult,
                });
                
                if (uploadResponse.status < 200 || uploadResponse.status >= 300 || uploadResult.error) {
                  // Check if error is transient (1363030 = timeout)
                  const isTransient = uploadResult.error?.error_subcode === 1363030 || uploadResult.error?.is_transient === true;
                  
                  logger?.error(`❌ [facebookUploadVideoResumable] Chunk ${chunkNumber} upload failed (attempt ${retryAttempt}):`, {
                    status: uploadResponse.status,
                    statusText: uploadResponse.statusText,
                    error: uploadResult.error,
                    errorMessage: uploadResult.error?.message,
                    errorCode: uploadResult.error?.code,
                    errorSubcode: uploadResult.error?.error_subcode,
                    isTransient,
                    fullResponse: uploadResult,
                  });
                  
                  if (isTransient && retryAttempt < MAX_CHUNK_RETRIES) {
                    logger?.warn(`⚠️ [facebookUploadVideoResumable] Transient error detected, will retry chunk ${chunkNumber}...`);
                    continue; // Retry this chunk
                  } else {
                    // Non-transient error or max retries reached
                    throw new Error(`Upload gagal pada chunk ${chunkNumber} setelah ${retryAttempt} percobaan: ${uploadResult.error?.message || 'Unknown error'}`);
                  }
                }
                
                // Success! Extract next offsets
                nextStartOffset = parseInt(uploadResult.start_offset || '0');
                const facebookSuggestedEndOffset = parseInt(uploadResult.end_offset || fileSize.toString());
                
                // Override Facebook's suggested chunk size with our custom smaller size for reliability
                nextEndOffset = Math.min(facebookSuggestedEndOffset, nextStartOffset + CUSTOM_CHUNK_SIZE, fileSize);
                
                logger?.info(`✅ [facebookUploadVideoResumable] Chunk ${chunkNumber} uploaded successfully (attempt ${retryAttempt})`, {
                  nextStartOffset,
                  nextEndOffset,
                  facebookSuggested: facebookSuggestedEndOffset,
                  customChunkSize: CUSTOM_CHUNK_SIZE,
                  remaining: fileSize - nextStartOffset,
                });
                
                chunkUploadSuccess = true;
                break; // Exit retry loop
                
              } catch (fetchError: any) {
                logger?.error(`❌ [facebookUploadVideoResumable] Network error uploading chunk ${chunkNumber} (attempt ${retryAttempt}):`, fetchError.message);
                
                if (retryAttempt >= MAX_CHUNK_RETRIES) {
                  throw new Error(`Upload gagal pada chunk ${chunkNumber} setelah ${retryAttempt} percobaan: ${fetchError.message}`);
                }
                
                // Retry on network errors
                logger?.warn(`⚠️ [facebookUploadVideoResumable] Network error, will retry chunk ${chunkNumber}...`);
                continue;
              }
            }
            
            if (!chunkUploadSuccess) {
              throw new Error(`Upload gagal pada chunk ${chunkNumber} setelah ${MAX_CHUNK_RETRIES} percobaan`);
            }
            
            // Update offsets for next iteration, clamp to file size
            currentStartOffset = nextStartOffset;
            currentEndOffset = Math.min(nextEndOffset, fileSize);
            
          } finally {
            // Clean up temporary chunk file
            try {
              fs.unlinkSync(chunkFilePath);
              logger?.info(`🗑️ [facebookUploadVideoResumable] Temp chunk file deleted: ${chunkFilePath}`);
            } catch (cleanupError) {
              logger?.warn(`⚠️ [facebookUploadVideoResumable] Failed to delete temp chunk: ${cleanupError}`);
            }
          }
          
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
        
        // Clean up temp chunk directory
        try {
          if (fs.existsSync(tmpChunkDir)) {
            const files = fs.readdirSync(tmpChunkDir);
            for (const file of files) {
              fs.unlinkSync(`${tmpChunkDir}/${file}`);
            }
            fs.rmdirSync(tmpChunkDir);
            logger?.info('🗑️ [facebookUploadVideoResumable] Temp chunk directory cleaned');
          }
        } catch (cleanupError) {
          logger?.warn('⚠️ [facebookUploadVideoResumable] Failed to clean temp directory:', cleanupError);
        }
      }
      
      // Step 3: Finalize upload with title and description
      logger?.info('📝 [facebookUploadVideoResumable] Step 3: Finalizing upload...');
      
      // IMPORTANT: Use POST body for title and description instead of URL query params
      // to avoid "reduce the amount of data" error when description is long
      // Using axios instead of fetch to avoid FormData streaming issues in Node.js
      const finalizeUrl = `https://graph-video.facebook.com/v19.0/${pageId}/videos?access_token=${encodeURIComponent(pageAccessToken)}`;
      
      const finalizeFormData = new FormData();
      finalizeFormData.append('upload_phase', 'finish');
      finalizeFormData.append('upload_session_id', uploadSessionId);
      finalizeFormData.append('title', context.title);
      finalizeFormData.append('description', context.description);
      
      logger?.info('📤 [facebookUploadVideoResumable] Sending finalize request with metadata:', {
        titleLength: context.title.length,
        descriptionLength: context.description.length,
        uploadSessionId,
      });
      
      const finalizeResponse = await axios.post(finalizeUrl, finalizeFormData, {
        headers: finalizeFormData.getHeaders(),
        timeout: 60000, // 60 seconds timeout
      });
      
      const finalizeResult = finalizeResponse.data;
      
      if (finalizeResponse.status !== 200 || finalizeResult.error) {
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
      
      // NOTE: File cleanup is handled by the caller (smart tool or workflow)
      // to allow retry with different upload methods if needed
      
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
