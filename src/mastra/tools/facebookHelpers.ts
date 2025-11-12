/**
 * Facebook API Helper Functions
 * 
 * This file contains utility functions for working with Facebook Graph API,
 * including token management and API interactions.
 */

import * as fs from 'fs';

interface PageData {
  access_token: string;
  id: string;
  name: string;
}

interface PageTokenResponse {
  data: PageData[];
}

/**
 * Exchange a User Access Token for a Page Access Token
 * 
 * Facebook requires a Page Access Token to upload videos and post to Pages.
 * This function exchanges a User Access Token for the proper Page Access Token.
 * 
 * @param userAccessToken - The user's access token
 * @param pageId - Optional specific page ID to get token for
 * @returns Page Access Token and Page ID
 * @throws Error if token exchange fails
 */
export async function getPageAccessToken(
  userAccessToken: string,
  pageId?: string
): Promise<{ pageAccessToken: string; pageId: string; pageName: string }> {
  try {
    // Call Facebook API to get all pages managed by this user
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get page token: ${error.error?.message || 'Unknown error'}`);
    }

    const data: PageTokenResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No pages found for this user access token');
    }

    // If specific pageId is provided, find that page
    if (pageId) {
      const page = data.data.find((p) => p.id === pageId);
      if (!page) {
        throw new Error(`Page with ID ${pageId} not found in user's managed pages`);
      }
      return {
        pageAccessToken: page.access_token,
        pageId: page.id,
        pageName: page.name,
      };
    }

    // Otherwise, return the first page
    const firstPage = data.data[0];
    return {
      pageAccessToken: firstPage.access_token,
      pageId: firstPage.id,
      pageName: firstPage.name,
    };
  } catch (error: any) {
    throw new Error(`Error getting page access token: ${error.message}`);
  }
}

/**
 * Get the correct access token for Facebook API operations
 * 
 * This function handles the token logic:
 * 1. If FB_PAGE_ACCESS_TOKEN is set and looks like a page token, use it
 * 2. Otherwise, exchange FB_USER_ACCESS_TOKEN for a page token
 * 3. Falls back to FB_PAGE_ACCESS_TOKEN if no user token is available
 * 
 * @param logger - Logger instance for debugging
 * @returns Object with pageAccessToken and pageId
 */
export async function getFacebookCredentials(logger?: any): Promise<{
  pageAccessToken: string;
  pageId: string;
}> {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const userAccessToken = process.env.FB_USER_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  // If we have a user access token, exchange it for a page token
  if (userAccessToken) {
    logger?.info('🔑 [Facebook] Using user access token to get page token');
    try {
      const result = await getPageAccessToken(userAccessToken, pageId);
      logger?.info('✅ [Facebook] Successfully obtained page access token', {
        pageId: result.pageId,
        pageName: result.pageName,
      });
      return {
        pageAccessToken: result.pageAccessToken,
        pageId: result.pageId,
      };
    } catch (error: any) {
      logger?.error('❌ [Facebook] Failed to exchange user token for page token:', error.message);
      logger?.warn('⚠️ [Facebook] Falling back to FB_PAGE_ACCESS_TOKEN');
    }
  }

  // Fallback to direct page access token
  if (!pageAccessToken || !pageId) {
    throw new Error(
      'Missing Facebook credentials. Please set either:\n' +
      '1. FB_USER_ACCESS_TOKEN (recommended) - will auto-exchange for page token\n' +
      '2. FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID - direct page token'
    );
  }

  logger?.info('🔑 [Facebook] Using direct page access token');
  return {
    pageAccessToken,
    pageId,
  };
}

/**
 * Video Metadata Helper
 * 
 * Detects MIME type and content type from file extension
 */
export interface VideoMetadata {
  extension: string;
  contentType: string;
  filename: string;
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  'mp4': 'video/mp4',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'wmv': 'video/x-ms-wmv',
  'flv': 'video/x-flv',
  'mkv': 'video/x-matroska',
  'webm': 'video/webm',
  'm4v': 'video/x-m4v',
  '3gp': 'video/3gpp',
  'mpeg': 'video/mpeg',
  'mpg': 'video/mpeg',
};

/**
 * Get video metadata from file path
 * 
 * @param filePath - Path to the video file
 * @returns VideoMetadata object with extension, contentType, and filename
 */
export function getVideoMetadata(filePath: string): VideoMetadata {
  // Extract just the filename, not the full path
  const filename = filePath.split('/').pop() || 'video.mp4';
  
  // Check if filename has an extension
  const parts = filename.split('.');
  const hasExtension = parts.length > 1 && parts[parts.length - 1].length > 0;
  
  // Get extension or fallback to 'mp4'
  const extension = hasExtension ? parts[parts.length - 1].toLowerCase() : 'mp4';
  
  // Get content type
  const contentType = CONTENT_TYPE_MAP[extension] || 'video/mp4';
  
  // Ensure filename has extension
  const finalFilename = hasExtension ? filename : `${filename}.${extension}`;
  
  return {
    extension,
    contentType,
    filename: finalFilename,
  };
}

/**
 * Validate video file by checking container signature
 * 
 * Checks for common video file signatures (magic numbers):
 * - MP4/M4V: starts with 'ftyp' at offset 4
 * - AVI: starts with 'RIFF' and contains 'AVI '
 * - MOV: starts with 'ftyp' (similar to MP4)
 * - WebM: starts with 0x1A45DFA3
 * 
 * @param filePath - Path to the video file
 * @param logger - Optional logger for debugging
 * @returns true if file appears to be a valid video, false otherwise
 */
export function validateVideoFile(filePath: string, logger?: any): boolean {
  try {
    // Read first 32 bytes to check file signature
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);
    
    if (bytesRead < 8) {
      logger?.warn('⚠️ [validateVideoFile] File too small to validate:', bytesRead, 'bytes');
      return false;
    }
    
    // Check for common video signatures
    const header = buffer.toString('ascii', 0, Math.min(bytesRead, 12));
    const hex = buffer.toString('hex', 0, Math.min(bytesRead, 8));
    
    // MP4/M4V/MOV: Contains 'ftyp' at offset 4
    if (buffer.toString('ascii', 4, 8) === 'ftyp') {
      logger?.info('✅ [validateVideoFile] Valid MP4/MOV container detected');
      return true;
    }
    
    // AVI: Starts with 'RIFF' and contains 'AVI ' at offset 8
    if (header.startsWith('RIFF') && buffer.toString('ascii', 8, 12) === 'AVI ') {
      logger?.info('✅ [validateVideoFile] Valid AVI container detected');
      return true;
    }
    
    // WebM: Starts with 0x1A45DFA3
    if (hex.startsWith('1a45dfa3')) {
      logger?.info('✅ [validateVideoFile] Valid WebM container detected');
      return true;
    }
    
    // FLV: Starts with 'FLV'
    if (header.startsWith('FLV')) {
      logger?.info('✅ [validateVideoFile] Valid FLV container detected');
      return true;
    }
    
    // MPEG: Starts with 0x000001BA or 0x000001B3
    if (hex.startsWith('000001ba') || hex.startsWith('000001b3')) {
      logger?.info('✅ [validateVideoFile] Valid MPEG container detected');
      return true;
    }
    
    logger?.warn('⚠️ [validateVideoFile] Unknown video format, header:', {
      ascii: header,
      hex: hex,
    });
    
    // If we can't recognize the format, still return true
    // to avoid false negatives (some valid formats not checked above)
    return true;
    
  } catch (error: any) {
    logger?.error('❌ [validateVideoFile] Error validating file:', error.message);
    return false;
  }
}
