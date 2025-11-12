import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { igApi } from "insta-fetcher";
import axios from "axios";

export const instagramDownload = createTool({
  id: "instagram-download",
  description: "Download Instagram video/reel and extract metadata (caption, hashtags) automatically",
  
  inputSchema: z.object({
    url: z.string().describe("Instagram video/reel URL (e.g., https://www.instagram.com/reel/...)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    filePath: z.string().optional(),
    fileSize: z.number().optional(),
    title: z.string().optional(),
    caption: z.string().optional(),
    hashtags: z.string().optional(),
    author: z.string().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [instagramDownload] Starting Instagram download with params:', context);
    
    try {
      // Step 1: Get Instagram video metadata and download URL
      logger?.info('📝 [instagramDownload] Fetching Instagram metadata...');
      
      // Instagram fetcher needs a cookie, try to get it from env or use default empty string
      const instagramCookie = process.env.INSTAGRAM_COOKIE || '';
      const ig = new igApi(instagramCookie);
      
      const result = await ig.fetchPost(context.url);
      
      if (!result || !result.links || result.links.length === 0) {
        logger?.error('❌ [instagramDownload] No data returned from Instagram');
        return {
          success: false,
          error: 'Failed to fetch Instagram video data. Pastikan link Instagram valid dan public.',
        };
      }
      
      logger?.info('✅ [instagramDownload] Metadata fetched:', {
        hasUrl: !!result.links[0],
        caption: result.caption?.substring(0, 100),
      });
      
      // Extract metadata
      const caption = result.caption || '';
      const title = caption.split('\n')[0] || 'Instagram Video'; // Use first line as title
      const author = result.username || undefined;
      
      // Extract hashtags from caption
      const hashtagMatches = caption.match(/#[\w]+/g) || [];
      const hashtags = hashtagMatches.join(' ');
      
      logger?.info('📝 [instagramDownload] Extracted metadata:', {
        title: title.substring(0, 50),
        hashtagCount: hashtagMatches.length,
        author,
      });
      
      // Step 2: Download video (use first URL from links array)
      const videoUrl = typeof result.links[0] === 'string' ? result.links[0] : result.links[0].url;
      
      if (!videoUrl) {
        logger?.error('❌ [instagramDownload] No video URL found in response');
        return {
          success: false,
          error: 'Video URL not found in Instagram response',
        };
      }
      
      logger?.info('📥 [instagramDownload] Downloading video from:', videoUrl.substring(0, 100));
      
      // Create download directory
      const downloadDir = '/tmp/instagram_videos';
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      // Generate filename
      const timestamp = Date.now();
      const fileName = `instagram_${timestamp}.mp4`;
      const filePath = path.join(downloadDir, fileName);
      
      // Download video
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      
      // Save to file
      fs.writeFileSync(filePath, response.data);
      
      // Get file size
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
      
      logger?.info('✅ [instagramDownload] Video downloaded successfully:', {
        filePath,
        fileSize: fileSizeMB + ' MB',
      });
      
      // Validate file size
      if (fileSize === 0) {
        logger?.error('❌ [instagramDownload] Downloaded file is empty');
        fs.unlinkSync(filePath); // Delete empty file
        return {
          success: false,
          error: 'Downloaded Instagram video file is empty',
        };
      }
      
      return {
        success: true,
        filePath,
        fileSize,
        title,
        caption,
        hashtags,
        author,
      };
      
    } catch (error: any) {
      logger?.error('❌ [instagramDownload] Error:', error);
      return {
        success: false,
        error: `Instagram download error: ${error.message}`,
      };
    }
  },
});
