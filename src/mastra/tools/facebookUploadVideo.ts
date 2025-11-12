import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import FormData from "form-data";
import { getFacebookCredentials, getVideoMetadata, validateVideoFile } from "./facebookHelpers";

/**
 * Helper function to detect if a Facebook API error is transient
 * Transient errors are temporary issues like timeouts or temporary server problems
 * that can be resolved by retrying the request
 */
function isTransientError(errorResult: any): boolean {
  // Check for explicit is_transient field from Facebook
  if (errorResult.error?.is_transient === true) {
    return true;
  }
  
  const errorCode = errorResult.error?.code;
  const errorSubcode = errorResult.error?.error_subcode;
  
  // Error 390 with subcode 1363030 is a known transient timeout error
  if (errorCode === 390 && errorSubcode === 1363030) {
    return true;
  }
  
  // Error 1 is often a temporary API error
  if (errorCode === 1) {
    return true;
  }
  
  // Error 2 is often a temporary service error
  if (errorCode === 2) {
    return true;
  }
  
  return false;
}

/**
 * Helper function to create a delay for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      
      // Validate video file signature
      logger?.info('🔍 [facebookUploadVideo] Validating video file...');
      const isValid = validateVideoFile(context.videoPath, logger);
      if (!isValid) {
        logger?.error('❌ [facebookUploadVideo] Video file validation failed');
        return {
          success: false,
          error: 'File video tidak valid. File mungkin corrupt atau bukan format video yang didukung.',
        };
      }
      
      // Get video metadata for proper Content-Type
      const videoMetadata = getVideoMetadata(context.videoPath);
      logger?.info('📊 [facebookUploadVideo] Video metadata:', videoMetadata);
      
      logger?.info('📝 [facebookUploadVideo] Uploading video to Facebook Page...');
      logger?.info('🔑 [facebookUploadVideo] Using credentials:', {
        pageId,
        tokenLength: pageAccessToken.length,
        tokenPrefix: pageAccessToken.substring(0, 20) + '...',
      });
      
      // Retry configuration
      const MAX_RETRIES = 3;
      const BASE_DELAY = 2000; // 2 seconds base delay
      
      // Retry loop for transient errors
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        logger?.info(`🔄 [facebookUploadVideo] Upload attempt ${attempt}/${MAX_RETRIES}`);
        
        // Create form data for video upload with explicit content type
        // Must recreate FormData on each retry because streams can only be read once
        const formData = new FormData();
        formData.append('source', fs.createReadStream(context.videoPath), {
          filename: videoMetadata.filename,
          contentType: videoMetadata.contentType,
        });
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
          const errorSubcode = uploadResult.error?.error_subcode;
          const isTransient = uploadResult.error?.is_transient;
          
          logger?.error('❌ [facebookUploadVideo] Upload failed:', {
            attempt,
            code: errorCode,
            subcode: errorSubcode,
            message: errorMessage,
            type: errorType,
            isTransient,
            fullError: uploadResult
          });
          
          // Check if this is a transient error that we should retry
          if (isTransientError(uploadResult)) {
            if (attempt < MAX_RETRIES) {
              const delay = BASE_DELAY * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
              logger?.warn(`⚠️ [facebookUploadVideo] Transient error detected (timeout/koneksi lambat)`);
              logger?.warn(`🔄 [facebookUploadVideo] Retry ${attempt + 1}/${MAX_RETRIES} akan dimulai dalam ${delay}ms...`);
              await sleep(delay);
              continue; // Retry the upload
            } else {
              // Max retries reached for transient error
              logger?.error('❌ [facebookUploadVideo] Max retries reached for transient error');
              return {
                success: false,
                error: `Upload gagal setelah ${MAX_RETRIES} kali percobaan. Koneksi ke Facebook timeout atau lambat. Silakan coba lagi nanti.`,
              };
            }
          }
          
          // Not a transient error - this is a real error that won't be fixed by retrying
          // Provide more specific error messages
          let userMessage = errorMessage;
          if (errorCode === 390 && errorSubcode !== 1363030) {
            // Error 390 without the transient subcode is likely a real file issue
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
        
        // Success! Upload completed
        const videoId = uploadResult.id;
        const postId = uploadResult.post_id || uploadResult.id;
        const videoUrl = `https://www.facebook.com/${pageId}/videos/${videoId}`;
        
        logger?.info('✅ [facebookUploadVideo] Video uploaded successfully:', {
          videoId,
          postId,
          videoUrl,
          attemptNumber: attempt,
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
      }
      
      // This should never be reached, but just in case
      return {
        success: false,
        error: 'Upload gagal setelah semua percobaan.',
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
