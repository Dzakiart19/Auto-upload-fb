import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import FormData from "form-data";
import { getFacebookCredentials } from "./facebookHelpers";

/**
 * Photo Metadata Helper
 * Detects MIME type and content type from file extension
 */
interface PhotoMetadata {
  extension: string;
  contentType: string;
  filename: string;
}

const PHOTO_CONTENT_TYPE_MAP: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'bmp': 'image/bmp',
};

/**
 * Get photo metadata from file path
 */
function getPhotoMetadata(filePath: string): PhotoMetadata {
  const filename = filePath.split('/').pop() || 'photo.jpg';
  const parts = filename.split('.');
  const hasExtension = parts.length > 1 && parts[parts.length - 1].length > 0;
  const extension = hasExtension ? parts[parts.length - 1].toLowerCase() : 'jpg';
  const contentType = PHOTO_CONTENT_TYPE_MAP[extension] || 'image/jpeg';
  const finalFilename = hasExtension ? filename : `${filename}.${extension}`;
  
  return {
    extension,
    contentType,
    filename: finalFilename,
  };
}

/**
 * Validate photo file by checking signature and MIME type
 */
function validatePhotoFile(filePath: string, logger?: any): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
    
    if (bytesRead < 4) {
      logger?.warn('⚠️ [validatePhotoFile] File too small to validate:', bytesRead, 'bytes');
      return false;
    }
    
    const hex = buffer.toString('hex', 0, Math.min(bytesRead, 12));
    
    // JPEG: Starts with FFD8FF
    if (hex.startsWith('ffd8ff')) {
      logger?.info('✅ [validatePhotoFile] Valid JPEG detected');
      return true;
    }
    
    // PNG: Starts with 89504E47
    if (hex.startsWith('89504e47')) {
      logger?.info('✅ [validatePhotoFile] Valid PNG detected');
      return true;
    }
    
    // GIF: Starts with 474946 (GIF87a or GIF89a)
    if (hex.startsWith('474946')) {
      logger?.info('✅ [validatePhotoFile] Valid GIF detected');
      return true;
    }
    
    // WebP: Starts with 52494646...57454250 (RIFF...WEBP)
    if (hex.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP') {
      logger?.info('✅ [validatePhotoFile] Valid WebP detected');
      return true;
    }
    
    // BMP: Starts with 424D (BM)
    if (hex.startsWith('424d')) {
      logger?.info('✅ [validatePhotoFile] Valid BMP detected');
      return true;
    }
    
    logger?.warn('⚠️ [validatePhotoFile] Unknown image format, header:', {
      hex: hex,
    });
    
    return false;
    
  } catch (error: any) {
    logger?.error('❌ [validatePhotoFile] Error validating file:', error.message);
    return false;
  }
}

export const facebookUploadPhoto = createTool({
  id: "facebook-upload-photo",
  description: "Upload photo to Facebook Page using Graph API",
  
  inputSchema: z.object({
    photoPath: z.string().describe("Local file path of the photo to upload"),
    caption: z.string().describe("Caption for the photo (can include hashtags)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    postId: z.string().optional(),
    photoUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [facebookUploadPhoto] Starting execution with params:', {
      photoPath: context.photoPath,
      captionLength: context.caption.length,
    });
    
    let pageAccessToken: string;
    let pageId: string;
    
    try {
      const credentials = await getFacebookCredentials(logger);
      pageAccessToken = credentials.pageAccessToken;
      pageId = credentials.pageId;
    } catch (error: any) {
      logger?.error('❌ [facebookUploadPhoto] Failed to get Facebook credentials:', error.message);
      return {
        success: false,
        error: `Kredensial Facebook tidak valid: ${error.message}`,
      };
    }
    
    try {
      // Check if file exists
      if (!fs.existsSync(context.photoPath)) {
        logger?.error('❌ [facebookUploadPhoto] File not found:', context.photoPath);
        return {
          success: false,
          error: `File tidak ditemukan: ${context.photoPath}`,
        };
      }
      
      // Check file size
      const fileStats = fs.statSync(context.photoPath);
      logger?.info('📊 [facebookUploadPhoto] File info:', {
        path: context.photoPath,
        size: fileStats.size,
        sizeKB: (fileStats.size / 1024).toFixed(2) + ' KB',
        sizeMB: (fileStats.size / 1024 / 1024).toFixed(2) + ' MB'
      });
      
      if (fileStats.size === 0) {
        logger?.error('❌ [facebookUploadPhoto] File is empty (0 bytes)');
        return {
          success: false,
          error: 'File foto kosong (0 bytes). Foto gagal di-download dengan benar.',
        };
      }
      
      // Facebook photo size limit is 8MB
      const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8MB in bytes
      if (fileStats.size > MAX_PHOTO_SIZE) {
        logger?.error('❌ [facebookUploadPhoto] File too large:', {
          size: fileStats.size,
          maxSize: MAX_PHOTO_SIZE,
          sizeMB: (fileStats.size / 1024 / 1024).toFixed(2)
        });
        return {
          success: false,
          error: `File foto terlalu besar (${(fileStats.size / 1024 / 1024).toFixed(2)} MB). Maksimal 8 MB.`,
        };
      }
      
      // Very small files are likely corrupt
      if (fileStats.size < 1024) { // Less than 1KB
        logger?.error('❌ [facebookUploadPhoto] File too small (likely corrupt):', fileStats.size);
        return {
          success: false,
          error: `File foto terlalu kecil (${fileStats.size} bytes), kemungkinan corrupt atau tidak lengkap.`,
        };
      }
      
      // Validate photo file signature
      logger?.info('🔍 [facebookUploadPhoto] Validating photo file...');
      const isValid = validatePhotoFile(context.photoPath, logger);
      if (!isValid) {
        logger?.error('❌ [facebookUploadPhoto] Photo file validation failed');
        return {
          success: false,
          error: 'File foto tidak valid. File mungkin corrupt atau bukan format gambar yang didukung (JPEG/PNG/GIF).',
        };
      }
      
      // Get photo metadata for proper Content-Type
      const photoMetadata = getPhotoMetadata(context.photoPath);
      logger?.info('📊 [facebookUploadPhoto] Photo metadata:', photoMetadata);
      
      logger?.info('📝 [facebookUploadPhoto] Uploading photo to Facebook Page...');
      logger?.info('🔑 [facebookUploadPhoto] Using credentials:', {
        pageId,
        tokenLength: pageAccessToken.length,
        tokenPrefix: pageAccessToken.substring(0, 20) + '...',
      });
      
      // Create form data for photo upload
      const formData = new FormData();
      formData.append('source', fs.createReadStream(context.photoPath), {
        filename: photoMetadata.filename,
        contentType: photoMetadata.contentType,
      });
      formData.append('caption', context.caption);
      formData.append('published', 'true');
      
      // Upload photo to Facebook Page
      const uploadUrl = `https://graph.facebook.com/v21.0/${pageId}/photos?access_token=${encodeURIComponent(pageAccessToken)}`;
      
      logger?.info('📤 [facebookUploadPhoto] Sending request to Facebook API');
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });
      
      const uploadResult = await uploadResponse.json();
      
      logger?.info('📊 [facebookUploadPhoto] Facebook API response:', {
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
        
        logger?.error('❌ [facebookUploadPhoto] Upload failed:', {
          code: errorCode,
          subcode: errorSubcode,
          message: errorMessage,
          type: errorType,
          fullError: uploadResult
        });
        
        // Provide specific error messages
        let userMessage = errorMessage;
        if (errorCode === 324) {
          userMessage = 'File foto tidak valid atau corrupt. Pastikan foto yang dikirim bisa dibuka dan tidak rusak.';
        } else if (errorCode === 100) {
          userMessage = 'Permission error: Token Facebook tidak memiliki izin untuk upload foto.';
        } else if (errorCode === 200) {
          userMessage = 'Permission error: Token memerlukan permission tambahan.';
        } else if (errorCode === 190) {
          userMessage = 'Token Facebook tidak valid atau sudah kadaluarsa.';
        }
        
        return {
          success: false,
          error: `Upload gagal: ${userMessage}`,
        };
      }
      
      // Success! Upload completed
      const postId = uploadResult.post_id || uploadResult.id;
      const photoId = uploadResult.id;
      
      // Construct photo URL
      // Facebook photo URL format: https://www.facebook.com/photo.php?fbid={photo-id}
      // Or page-specific: https://www.facebook.com/{page-id}/photos/{photo-id}
      const photoUrl = `https://www.facebook.com/${pageId}/photos/${photoId}`;
      
      logger?.info('✅ [facebookUploadPhoto] Photo uploaded successfully:', {
        photoId,
        postId,
        photoUrl,
      });
      
      // Clean up temporary file
      try {
        fs.unlinkSync(context.photoPath);
        logger?.info('🗑️ [facebookUploadPhoto] Temporary file cleaned up');
      } catch (cleanupError) {
        logger?.warn('⚠️ [facebookUploadPhoto] Failed to clean up temporary file:', cleanupError);
      }
      
      return {
        success: true,
        postId,
        photoUrl,
      };
      
    } catch (error: any) {
      logger?.error('❌ [facebookUploadPhoto] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
