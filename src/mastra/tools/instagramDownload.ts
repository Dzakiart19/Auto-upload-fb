import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { igApi } from "insta-fetcher";
import axios from "axios";

// TODO: Instagram scraping is currently blocked by Instagram in 2025
// Library insta-fetcher (v1.3.35) is outdated and fails with 403 errors
// Alternative libraries tested also fail due to Instagram's anti-scraping measures
// Possible solutions:
// 1. Use official Facebook Graph API (requires business account + permissions)
// 2. Use paid scraping service (RapidAPI, Apify)
// 3. Wait for community libraries to catch up with Instagram changes
// For now, return friendly error message to users

export const instagramDownload = createTool({
  id: "instagram-download",
  description: "Download Instagram video/reel (currently limited due to Instagram blocking)",
  
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
    
    // Instagram has blocked all scraping methods in 2025
    // Until a reliable solution is found, return informative error
    logger?.warn('⚠️ [instagramDownload] Instagram scraping currently blocked');
    
    return {
      success: false,
      error: 'Instagram saat ini memblokir download otomatis. Fitur Instagram download sedang dalam perbaikan. Untuk sementara, gunakan link TikTok atau upload manual.',
    };
  },
});
