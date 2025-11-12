import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { getFacebookCredentials } from "./facebookHelpers";

export const facebookShareToGroups = createTool({
  id: "facebook-share-to-groups",
  description: "Share a Facebook post to multiple Facebook Groups",
  
  inputSchema: z.object({
    videoUrl: z.string().describe("URL of the video post to share"),
    videoId: z.string().describe("Facebook video ID"),
    message: z.string().optional().describe("Additional message to include when sharing"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    totalGroups: z.number(),
    successCount: z.number(),
    failCount: z.number(),
    results: z.array(z.object({
      groupId: z.string(),
      success: z.boolean(),
      postId: z.string().optional(),
      error: z.string().optional(),
    })),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [facebookShareToGroups] Starting execution with params:', context);
    
    let pageAccessToken: string;
    let pageId: string;
    
    try {
      const credentials = await getFacebookCredentials(logger);
      pageAccessToken = credentials.pageAccessToken;
      pageId = credentials.pageId;
    } catch (error: any) {
      logger?.error('❌ [facebookShareToGroups] Failed to get Facebook credentials:', error.message);
      return {
        success: false,
        totalGroups: 0,
        successCount: 0,
        failCount: 0,
        results: [],
      };
    }
    
    try {
      // Read group IDs from groups.txt
      // Use REPL_HOME or fallback to /home/runner/workspace to get the actual project root
      const projectRoot = process.env.REPL_HOME || '/home/runner/workspace';
      const groupsFilePath = path.join(projectRoot, 'groups.txt');
      
      logger?.info('🔍 [facebookShareToGroups] Checking groups.txt file...', {
        path: groupsFilePath,
        cwd: process.cwd(),
        exists: fs.existsSync(groupsFilePath),
      });
      
      if (!fs.existsSync(groupsFilePath)) {
        logger?.warn('⚠️ [facebookShareToGroups] groups.txt not found, creating empty file');
        fs.writeFileSync(groupsFilePath, '# Tambahkan Facebook Group IDs di sini, satu per baris\n');
        return {
          success: true,
          totalGroups: 0,
          successCount: 0,
          failCount: 0,
          results: [],
        };
      }
      
      const groupsContent = fs.readFileSync(groupsFilePath, 'utf-8');
      logger?.info('📄 [facebookShareToGroups] File content loaded', {
        contentLength: groupsContent.length,
        lines: groupsContent.split('\n').length,
      });
      
      const groupIds = groupsContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Accept both numeric and text IDs
      
      logger?.info('📝 [facebookShareToGroups] Parsed group IDs', {
        count: groupIds.length,
        firstFew: groupIds.slice(0, 3),
        allIds: groupIds,
      });
      
      if (groupIds.length === 0) {
        logger?.warn('⚠️ [facebookShareToGroups] No group IDs found in groups.txt');
        logger?.warn('⚠️ [facebookShareToGroups] Raw content preview:', {
          preview: groupsContent.substring(0, 200),
        });
        return {
          success: true,
          totalGroups: 0,
          successCount: 0,
          failCount: 0,
          results: [],
        };
      }
      
      logger?.info('✅ [facebookShareToGroups] Found groups to share:', { count: groupIds.length });
      
      const shareMessage = context.message || `🔥 Video baru! Tonton sekarang: ${context.videoUrl}`;
      
      const results = [];
      let successCount = 0;
      let failCount = 0;
      
      // Share to each group
      for (const groupId of groupIds) {
        logger?.info(`📤 [facebookShareToGroups] Sharing to group ${groupId}...`);
        
        try {
          const shareUrl = `https://graph.facebook.com/v19.0/${groupId}/feed`;
          
          const shareResponse = await fetch(shareUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: shareMessage,
              link: context.videoUrl,
              access_token: pageAccessToken,
            }),
          });
          
          const shareResult = await shareResponse.json();
          
          if (shareResponse.ok && shareResult.id) {
            logger?.info(`✅ [facebookShareToGroups] Successfully shared to group ${groupId}:`, shareResult.id);
            results.push({
              groupId,
              success: true,
              postId: shareResult.id,
            });
            successCount++;
          } else {
            logger?.error(`❌ [facebookShareToGroups] Failed to share to group ${groupId}:`, shareResult);
            results.push({
              groupId,
              success: false,
              error: shareResult.error?.message || 'Unknown error',
            });
            failCount++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          logger?.error(`❌ [facebookShareToGroups] Error sharing to group ${groupId}:`, error);
          results.push({
            groupId,
            success: false,
            error: error.message,
          });
          failCount++;
        }
      }
      
      logger?.info('✅ [facebookShareToGroups] Sharing complete:', {
        totalGroups: groupIds.length,
        successCount,
        failCount,
      });
      
      return {
        success: successCount > 0,
        totalGroups: groupIds.length,
        successCount,
        failCount,
        results,
      };
      
    } catch (error: any) {
      logger?.error('❌ [facebookShareToGroups] Error:', error);
      return {
        success: false,
        totalGroups: 0,
        successCount: 0,
        failCount: 0,
        results: [],
      };
    }
  },
});
