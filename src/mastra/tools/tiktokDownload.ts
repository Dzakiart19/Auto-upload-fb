import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { Downloader } from "@tobyg74/tiktok-api-dl";
import axios from "axios";

export const tiktokDownload = createTool({
  id: "tiktok-download",
  description: "Download TikTok video and extract metadata (title, caption, hashtags) automatically",
  
  inputSchema: z.object({
    url: z.string().describe("TikTok video URL (e.g., https://www.tiktok.com/@user/video/123456789)"),
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
    logger?.info('🔧 [tiktokDownload] Starting TikTok download with params:', context);
    
    try {
      // Step 1: Get TikTok video metadata and download URL
      logger?.info('📝 [tiktokDownload] Fetching TikTok metadata...');
      
      // Use v2 for best reliability (v1 fails with short URLs, v3 sometimes returns 404)
      const result = await Downloader(context.url, {
        version: "v2" // v2 is most reliable
      });
      
      if (result.status !== "success" || !result.result) {
        logger?.error('❌ [tiktokDownload] Failed to fetch TikTok data:', result);
        return {
          success: false,
          error: `Failed to fetch TikTok video: ${result.message || 'Unknown error'}`,
        };
      }
      
      const videoData = result.result;
      logger?.info('✅ [tiktokDownload] Metadata fetched:', {
        author: videoData.author?.nickname,
        description: videoData.desc?.substring(0, 100),
        type: videoData.type,
      });
      
      // Extract metadata
      const title = videoData.desc || 'TikTok Video';
      const caption = videoData.desc || '';
      const author = videoData.author?.nickname || 'Unknown';
      
      // Extract hashtags from description
      const hashtagMatches = caption.match(/#[\w]+/g) || [];
      const hashtags = hashtagMatches.join(' ');
      
      logger?.info('📝 [tiktokDownload] Extracted metadata:', {
        title: title.substring(0, 50),
        hashtagCount: hashtagMatches.length,
        author,
      });
      
      // Step 2: Download video
      // v2 structure: result.video.playAddr[0] or result.video (string)
      // v3 structure: result.videoHD or result.videoSD (need type assertion)
      let videoUrl: string | undefined;
      
      if (videoData.video) {
        // v2 format
        if (typeof videoData.video === 'string') {
          videoUrl = videoData.video;
        } else if (videoData.video.playAddr && Array.isArray(videoData.video.playAddr)) {
          videoUrl = videoData.video.playAddr[0];
        }
      }
      
      // Fallback to v3 format if v2 didn't work (use type assertion for v3 properties)
      if (!videoUrl) {
        const videoDataAny = videoData as any;
        videoUrl = videoDataAny.videoHD || videoDataAny.videoSD;
      }
      
      if (!videoUrl) {
        logger?.error('❌ [tiktokDownload] No video URL found in response');
        return {
          success: false,
          error: 'Video URL not found in TikTok response',
        };
      }
      
      logger?.info('📥 [tiktokDownload] Downloading video from:', videoUrl.substring(0, 100));
      
      // Create download directory
      const downloadDir = '/tmp/tiktok_videos';
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      // Generate filename
      const timestamp = Date.now();
      const fileName = `tiktok_${timestamp}.mp4`;
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
      
      logger?.info('✅ [tiktokDownload] Video downloaded successfully:', {
        filePath,
        fileSize: fileSizeMB + ' MB',
      });
      
      // Validate file size
      if (fileSize === 0) {
        logger?.error('❌ [tiktokDownload] Downloaded file is empty');
        fs.unlinkSync(filePath); // Delete empty file
        return {
          success: false,
          error: 'Downloaded TikTok video file is empty',
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
      logger?.error('❌ [tiktokDownload] Error:', error);
      return {
        success: false,
        error: `TikTok download error: ${error.message}`,
      };
    }
  },
});
