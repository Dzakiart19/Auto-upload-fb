import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { facebookVideoAgent } from "../agents/facebookVideoAgent";
import { telegramDownloadVideo } from "../tools/telegramDownloadVideo";
import { telegramDownloadPhoto } from "../tools/telegramDownloadPhoto";
import { ffmpegConvertVideo } from "../tools/ffmpegConvertVideo";
import { facebookUploadVideoSmart } from "../tools/facebookUploadVideoSmart";
import { facebookUploadPhoto } from "../tools/facebookUploadPhoto";
import { facebookShareToGroups } from "../tools/facebookShareToGroups";
import { telegramSendMessage } from "../tools/telegramSendMessage";
import { generateEngagingCaption } from "../tools/generateEngagingCaption";
import { generateTrendingHashtags } from "../tools/generateTrendingHashtags";
import { tiktokDownload } from "../tools/tiktokDownload";
import { instagramDownload } from "../tools/instagramDownload";
import * as fs from "fs";

// Check if AI should be used or fallback to direct tool calls
const shouldUseAI = () => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  const fallbackEnabled = process.env.AI_FALLBACK_ENABLED !== 'false'; // Default true
  return hasOpenAIKey && !fallbackEnabled;
};

// Detect content category from title (with safe fallback)
const detectCategory = (title: string | undefined | null, logger?: any): "meme" | "comedy" | "tutorial" | "motivasi" | "gaming" | "lifestyle" | "teknologi" | "kuliner" | "travel" | "music" | "sports" | "brainrot" | "absurd" | "random" | "perfectcut" | "general" => {
  logger?.info('🔍 [detectCategory] Starting category detection...', { title });
  
  // Safety: handle missing or empty title
  if (!title || typeof title !== 'string' || title.trim() === '') {
    logger?.warn('⚠️ [detectCategory] Empty or invalid title, defaulting to "general"');
    return "general";
  }
  
  const titleLower = title.toLowerCase();
  logger?.info('📝 [detectCategory] Normalized title:', { titleLower });
  
  // Check new specific categories FIRST (before meme) to avoid false matches
  if (titleLower.match(/brainrot|brain rot|brainrotmeme/)) {
    logger?.info('✅ [detectCategory] Detected category: brainrot (NEW CATEGORY)');
    return "brainrot";
  }
  if (titleLower.match(/perfect cut|perfectcut|perfectly cut|perfectlycut|timing/)) {
    logger?.info('✅ [detectCategory] Detected category: perfectcut (NEW CATEGORY)');
    return "perfectcut";
  }
  if (titleLower.match(/absurd|absur|chaos|receh/)) {
    logger?.info('✅ [detectCategory] Detected category: absurd (NEW CATEGORY)');
    return "absurd";
  }
  if (titleLower.match(/random|acak|unexpected/)) {
    logger?.info('✅ [detectCategory] Detected category: random (NEW CATEGORY)');
    return "random";
  }
  
  // Now check general categories
  if (titleLower.match(/meme|lucu|ngakak|ketawa|🤣|😂/)) {
    logger?.info('✅ [detectCategory] Detected category: meme');
    return "meme";
  }
  if (titleLower.match(/comedy|komedi|lawak|humor/)) {
    logger?.info('✅ [detectCategory] Detected category: comedy');
    return "comedy";
  }
  if (titleLower.match(/tutorial|cara|tips|belajar|how to/)) {
    logger?.info('✅ [detectCategory] Detected category: tutorial');
    return "tutorial";
  }
  if (titleLower.match(/motivasi|inspirasi|semangat|sukses/)) {
    logger?.info('✅ [detectCategory] Detected category: motivasi');
    return "motivasi";
  }
  if (titleLower.match(/game|gaming|ml|pubg|ff|freefire/)) {
    logger?.info('✅ [detectCategory] Detected category: gaming');
    return "gaming";
  }
  if (titleLower.match(/lifestyle|vlog|daily|ootd/)) {
    logger?.info('✅ [detectCategory] Detected category: lifestyle');
    return "lifestyle";
  }
  if (titleLower.match(/teknologi|tech|gadget|hp|smartphone/)) {
    logger?.info('✅ [detectCategory] Detected category: teknologi');
    return "teknologi";
  }
  if (titleLower.match(/makanan|kuliner|food|makan/)) {
    logger?.info('✅ [detectCategory] Detected category: kuliner');
    return "kuliner";
  }
  if (titleLower.match(/travel|jalan|wisata|liburan/)) {
    logger?.info('✅ [detectCategory] Detected category: travel');
    return "travel";
  }
  if (titleLower.match(/musik|music|lagu|song/)) {
    logger?.info('✅ [detectCategory] Detected category: music');
    return "music";
  }
  if (titleLower.match(/olahraga|sport|fitness|gym/)) {
    logger?.info('✅ [detectCategory] Detected category: sports');
    return "sports";
  }
  
  logger?.info('⚡ [detectCategory] No specific category matched, defaulting to "general"');
  return "general";
};

// Fallback: Direct tool execution without AI
const processMediaDirectly = async (inputData: any, mastra: any) => {
  const logger = mastra?.getLogger();
  const mediaType = inputData.mediaType || 'video'; // Default to 'video' for backwards compatibility
  const isUrlFlow = inputData.isUrlFlow || false;
  
  logger?.info("⚠️ [AI Mode] FALLBACK - Running without AI, using direct tool calls");
  logger?.info(`📝 [processMediaDirectly] Starting direct ${mediaType} processing...`, { 
    mediaType,
    isUrlFlow,
    hasFileId: !!inputData.fileId,
    hasLocalFilePath: !!inputData.localFilePath,
  });
  
  let mediaUrl = '';
  let mediaId = '';
  let originalMediaPath = '';
  let convertedVideoPath = '';
  let downloadSuccess = false;
  let convertSuccess = false;
  let uploadSuccess = false;
  let shareResults = { totalGroups: 0, successCount: 0, failCount: 0 };
  let optimizedCaption = '';
  let optimizedHashtags = '';
  
  try {
    // Step 0: Prepare caption based on flow type
    logger?.info("✨ [Step 0] Preparing caption...", {
      isUrlFlow,
      hasTitle: !!inputData.title,
      hasDescription: !!inputData.description,
    });
    
    // Validate and provide defaults for required inputs
    const safeTitle = inputData.title || 'Media upload';
    const safeDescription = inputData.description || '';
    
    if (isUrlFlow) {
      // URL flow: Use metadata from TikTok/Instagram directly (already contains caption + hashtags from source)
      logger?.info("🔗 [Step 0] URL flow - using metadata from source (TikTok/Instagram) directly");
      
      // Description from prepareMediaData already contains: caption + original description + hashtags
      // Use it as-is without any modifications or additional hashtag generation
      optimizedCaption = safeDescription ? `${safeTitle}\n\n${safeDescription}` : safeTitle;
      optimizedHashtags = ''; // Hashtags already included in description from source
      
      logger?.info("✅ [Step 0] Using source metadata directly", {
        captionLength: optimizedCaption.length,
        source: "TikTok/Instagram",
      });
      
    } else {
      // Manual upload flow: Use user input + generate trending hashtags
      logger?.info("📤 [Step 0] Manual upload flow - using user input + generating hashtags");
      
      const category = detectCategory(safeTitle, logger);
      
      // Use user input directly as caption (simple, no "alay" stuff)
      optimizedCaption = safeDescription ? `${safeTitle}\n\n${safeDescription}` : safeTitle;
      
      // Generate hashtags only (keep hashtags for discoverability)
      try {
        const hashtagResult = await generateTrendingHashtags.execute({
          context: {
            title: safeTitle,
            category: category,
            language: "both",
            maxHashtags: 15,
          },
          mastra,
          runtimeContext: {} as any
        });
        
        optimizedHashtags = hashtagResult.hashtags;
        
        logger?.info("✅ [Step 0] Hashtags generated successfully", {
          category,
          hashtagCount: hashtagResult.count,
        });
        
      } catch (hashtagError: any) {
        // Fallback: use user description as hashtags if generation fails
        logger?.warn("⚠️ [Step 0] Hashtag generation failed, using user description", {
          error: hashtagError.message,
        });
        
        optimizedHashtags = safeDescription;
      }
      
      logger?.info("✅ [Step 0] Caption ready (simple user input)", {
        captionLength: optimizedCaption.length,
      });
    }
    
    // Step 1: Get media file (branch by flow type)
    if (isUrlFlow) {
      // URL flow: Use already-downloaded file from prepareMediaData
      logger?.info("📂 [Step 1] URL flow - using pre-downloaded file...");
      
      if (!inputData.localFilePath) {
        throw new Error('URL flow requires localFilePath but it is missing');
      }
      
      downloadSuccess = true;
      originalMediaPath = inputData.localFilePath;
      logger?.info("✅ [Step 1] Using local file from URL download:", originalMediaPath);
      
    } else if (mediaType === 'photo') {
      // Manual upload flow: Download photo from Telegram
      logger?.info("📥 [Step 1] Manual flow - downloading photo from Telegram...");
      
      if (!inputData.fileId) {
        throw new Error('Manual upload requires fileId but it is missing');
      }
      
      const downloadResult = await telegramDownloadPhoto.execute({
        context: {
          fileId: inputData.fileId,
          fileName: `photo_${Date.now()}` // Let the tool add the correct extension
        },
        mastra,
        runtimeContext: {} as any
      });
      
      if (!downloadResult.success || !downloadResult.filePath) {
        throw new Error(`Download foto gagal: ${downloadResult.error || 'Unknown error'}`);
      }
      
      downloadSuccess = true;
      originalMediaPath = downloadResult.filePath;
      logger?.info("✅ [Step 1] Photo downloaded successfully:", originalMediaPath);
      
    } else {
      // Manual upload flow: Download video from Telegram
      logger?.info("📥 [Step 1/5] Manual flow - downloading video from Telegram...");
      
      if (!inputData.fileId) {
        throw new Error('Manual upload requires fileId but it is missing');
      }
      
      const downloadResult = await telegramDownloadVideo.execute({
        context: {
          fileId: inputData.fileId,
          fileName: `video_${Date.now()}` // Let the tool add the correct extension
        },
        mastra,
        runtimeContext: {} as any
      });
      
      if (!downloadResult.success || !downloadResult.filePath) {
        throw new Error(`Download video gagal: ${downloadResult.error || 'Unknown error'}`);
      }
      
      downloadSuccess = true;
      originalMediaPath = downloadResult.filePath;
      logger?.info("✅ [Step 1/5] Video downloaded successfully:", originalMediaPath);
    }
    
    // Step 2: Convert video (skip for photos)
    if (mediaType === 'video') {
      logger?.info("🎬 [Step 2/5] Converting video to Facebook-compatible format...");
      const convertResult = await ffmpegConvertVideo.execute({
        context: {
          videoPath: originalMediaPath
        },
        mastra,
        runtimeContext: {} as any
      });
      
      if (!convertResult.success || !convertResult.convertedVideoPath) {
        throw new Error(`Konversi video gagal: ${convertResult.error || 'Unknown error'}`);
      }
      
      convertSuccess = true;
      convertedVideoPath = convertResult.convertedVideoPath;
      logger?.info("✅ [Step 2/5] Video converted successfully:", convertedVideoPath);
    } else {
      logger?.info("⏭️ [Step 2] Skipping conversion for photo (not needed)");
      convertSuccess = true; // Photos don't need conversion
    }
    
    // Step 3: Upload media to Facebook Page (branch by media type)
    if (mediaType === 'photo') {
      logger?.info("📤 [Step 2] Uploading photo to Facebook Page...");
      
      // Combine optimized caption with hashtags
      const fullCaption = `${optimizedCaption}\n\n${optimizedHashtags}`;
      
      const uploadResult = await facebookUploadPhoto.execute({
        context: {
          photoPath: originalMediaPath,
          caption: fullCaption
        },
        mastra,
        runtimeContext: {} as any
      });
      
      if (!uploadResult.success || !uploadResult.photoUrl) {
        throw new Error(`Upload foto gagal: ${uploadResult.error || 'Unknown error'}`);
      }
      
      uploadSuccess = true;
      mediaUrl = uploadResult.photoUrl!;
      mediaId = uploadResult.postId!;
      logger?.info("✅ [Step 2] Photo uploaded to Facebook:", mediaUrl);
      
    } else {
      // Video upload (existing flow)
      logger?.info("📤 [Step 3/5] Uploading video to Facebook Page (smart upload)...");
      
      // Combine optimized caption with hashtags for video description
      const fullDescription = `${optimizedCaption}\n\n${optimizedHashtags}`;
      
      const uploadResult = await facebookUploadVideoSmart.execute({
        context: {
          videoPath: convertedVideoPath, // Use converted video instead of original
          title: inputData.title,
          description: fullDescription
        },
        mastra,
        runtimeContext: {} as any
      });
      
      if (!uploadResult.success || !uploadResult.videoUrl) {
        throw new Error(`Upload video gagal: ${uploadResult.error || 'Unknown error'}`);
      }
      
      uploadSuccess = true;
      mediaUrl = uploadResult.videoUrl!;
      mediaId = uploadResult.videoId!;
      logger?.info("✅ [Step 3/5] Video uploaded to Facebook:", mediaUrl);
    }
    
    // Step 4: Share to Facebook Groups (skip for photos for now)
    if (mediaType === 'video') {
      logger?.info("📢 [Step 4/5] Sharing to Facebook Groups...");
      
      // Use optimized caption for group sharing too
      const shareMessage = `${optimizedCaption}\n\n${optimizedHashtags}`;
      
      const shareResult = await facebookShareToGroups.execute({
        context: {
          videoUrl: mediaUrl,
          videoId: mediaId,
          message: shareMessage
        },
        mastra,
        runtimeContext: {} as any
      });
      
      shareResults = {
        totalGroups: shareResult.totalGroups,
        successCount: shareResult.successCount,
        failCount: shareResult.failCount
      };
      
      logger?.info("✅ [Step 4/5] Sharing complete:", shareResults);
    } else {
      logger?.info("⏭️ [Step 3] Skipping group sharing for photo (not implemented yet)");
      shareResults = { totalGroups: 0, successCount: 0, failCount: 0 };
    }
    
    // Step 5: Send confirmation to user
    const finalStep = mediaType === 'photo' ? '[Step 3]' : '[Step 5/5]';
    logger?.info(`📨 ${finalStep} Sending confirmation to user...`);
    
    let confirmationMessage = '';
    if (mediaType === 'photo') {
      confirmationMessage = `
✅ *Foto berhasil diupload!*

${optimizedCaption}

${optimizedHashtags}

Link: ${mediaUrl}
      `.trim();
    } else {
      confirmationMessage = `
✅ *Video berhasil diupload!*

${optimizedCaption}

${optimizedHashtags}

Link: ${mediaUrl}

Dibagikan ke ${shareResults.successCount} dari ${shareResults.totalGroups} grup
${shareResults.totalGroups === 0 ? '(Tidak ada grup di groups.txt)' : ''}
      `.trim();
    }
    
    await telegramSendMessage.execute({
      context: {
        chatId: inputData.chatId,
        message: confirmationMessage
      },
      mastra,
      runtimeContext: {} as any
    });
    
    logger?.info(`✅ ${finalStep} Confirmation sent to user`);
    
    // Cleanup: Delete temporary files
    logger?.info(`🗑️ [Cleanup] Deleting temporary ${mediaType} files...`);
    try {
      if (originalMediaPath && fs.existsSync(originalMediaPath)) {
        fs.unlinkSync(originalMediaPath);
        logger?.info(`✅ [Cleanup] Deleted original ${mediaType}:`, originalMediaPath);
      }
      if (convertedVideoPath && fs.existsSync(convertedVideoPath)) {
        fs.unlinkSync(convertedVideoPath);
        logger?.info("✅ [Cleanup] Deleted converted video:", convertedVideoPath);
      }
    } catch (cleanupError: any) {
      logger?.warn("⚠️ [Cleanup] Failed to delete temporary files:", cleanupError.message);
      // Don't throw error, cleanup is not critical
    }
    
    return {
      success: true,
      mediaUrl,
      shareResults,
      message: confirmationMessage
    };
    
  } catch (error: any) {
    logger?.error(`❌ [processMediaDirectly] Error processing ${mediaType}:`, error);
    
    // Cleanup: Delete temporary files even on error
    logger?.info(`🗑️ [Cleanup] Deleting temporary ${mediaType} files (error cleanup)...`);
    try {
      if (originalMediaPath && fs.existsSync(originalMediaPath)) {
        fs.unlinkSync(originalMediaPath);
        logger?.info(`✅ [Cleanup] Deleted original ${mediaType}:`, originalMediaPath);
      }
      if (convertedVideoPath && fs.existsSync(convertedVideoPath)) {
        fs.unlinkSync(convertedVideoPath);
        logger?.info("✅ [Cleanup] Deleted converted video:", convertedVideoPath);
      }
    } catch (cleanupError: any) {
      logger?.warn("⚠️ [Cleanup] Failed to delete temporary files:", cleanupError.message);
    }
    
    // Send error notification
    try {
      const mediaTypeLabel = mediaType === 'photo' ? 'foto' : 'video';
      let errorMessage = `❌ *Maaf, terjadi error saat memproses ${mediaTypeLabel}*\n\n`;
      
      if (!downloadSuccess) {
        errorMessage += `📥 Download ${mediaTypeLabel}: GAGAL\n${error.message}\n\n`;
      } else if (mediaType === 'video' && !convertSuccess) {
        errorMessage += `📥 Download video: SUKSES\n🎬 Konversi video: GAGAL\n${error.message}\n\n`;
      } else if (!uploadSuccess) {
        if (mediaType === 'photo') {
          errorMessage += `📥 Download foto: SUKSES\n📤 Upload ke Facebook: GAGAL\n${error.message}\n\n`;
        } else {
          errorMessage += `📥 Download video: SUKSES\n🎬 Konversi video: SUKSES\n📤 Upload ke Facebook: GAGAL\n${error.message}\n\n`;
        }
      } else {
        errorMessage += `📥 Download: SUKSES\n${mediaType === 'video' ? '🎬 Konversi: SUKSES\n' : ''}📤 Upload: SUKSES\n📢 Share: ERROR\n${error.message}\n\n`;
      }
      
      errorMessage += `Silakan coba lagi atau hubungi admin.`;
      
      await telegramSendMessage.execute({
        context: {
          chatId: inputData.chatId,
          message: errorMessage
        },
        mastra,
        runtimeContext: {} as any
      });
    } catch (notifError) {
      logger?.error("❌ Failed to send error notification:", notifError);
    }
    
    return {
      success: false,
      shareResults,
      message: `Error: ${error.message}`
    };
  }
};

const processMediaUpload = createStep({
  id: "process-video-upload", // Keep same ID for backwards compatibility
  description: "Download media (video/photo) dari Telegram, upload ke Facebook Page, share ke groups (video only), dan kirim konfirmasi",
  
  inputSchema: z.object({
    threadId: z.string().describe("Thread ID untuk memory management"),
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID pengirim media"),
    fileId: z.string().optional().describe("Telegram file_id dari media (video atau photo) - optional for URL flow"),
    mediaType: z.enum(['video', 'photo']).default('video').describe("Type of media: video or photo"),
    title: z.string().optional().describe("Judul/caption untuk media - optional for URL flow"),
    description: z.string().optional().describe("Deskripsi/caption media dengan hashtags - optional for URL flow"),
    userName: z.string().optional().describe("Username pengirim"),
    localFilePath: z.string().optional().describe("Local file path from URL download - for URL flow"),
    isUrlFlow: z.boolean().optional().describe("Flag to indicate URL flow vs manual flow"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    mediaUrl: z.string().optional(),
    shareResults: z.object({
      totalGroups: z.number(),
      successCount: z.number(),
      failCount: z.number(),
    }).optional(),
    message: z.string(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    const mediaType = inputData.mediaType || 'video';
    
    logger?.info(`🚀 [processMediaUpload] Starting ${mediaType} upload process...`, {
      threadId: inputData.threadId,
      chatId: inputData.chatId,
      mediaType: mediaType,
      title: inputData.title,
    });
    
    // Check AI availability
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
    const useAI = hasOpenAIKey && process.env.AI_FALLBACK_ENABLED !== 'true';
    const isUrlFlow = inputData.isUrlFlow || false;
    
    logger?.info(`[AI] Mode: ${useAI ? 'AI ACTIVE' : 'FALLBACK (Direct Tools)'}`);
    logger?.info(`[AI] OpenAI Key: ${hasOpenAIKey ? 'Present' : 'Missing'}`);
    logger?.info(`[AI] Fallback Enabled: ${process.env.AI_FALLBACK_ENABLED || 'default (false)'}`);
    logger?.info(`[AI] Is URL Flow: ${isUrlFlow}`);
    
    // IMPORTANT: URL flow MUST use direct tools to preserve source metadata (TikTok/Instagram)
    // AI mode would regenerate captions/hashtags which violates user requirement
    if (!useAI || !hasOpenAIKey || isUrlFlow) {
      if (isUrlFlow) {
        logger?.info("🔗 URL flow detected - bypassing AI to preserve source metadata (TikTok/Instagram)");
      } else {
        logger?.info("⚠️ AI sedang offline atau dinonaktifkan, menggunakan mode fallback");
      }
      return await processMediaDirectly(inputData, mastra);
    }
    
    // Try AI mode with fallback on error
    try {
      const prompt = mediaType === 'photo' 
        ? `
Saya memiliki foto dari Telegram yang perlu di-upload ke Facebook Page.

Detail:
- File ID Telegram: ${inputData.fileId}
- Type: Photo
- Caption: ${inputData.title}
- Deskripsi: ${inputData.description}
- Chat ID pengirim: ${inputData.chatId}

Tolong lakukan langkah-langkah berikut secara berurutan:

1. Download foto dari Telegram menggunakan file_id tersebut
2. Upload foto ke Facebook Page dengan caption yang diberikan
3. Kirim pesan konfirmasi ke chat ID ${inputData.chatId} yang berisi:
   - Link foto di Facebook
   - Pesan yang ramah dan informatif dalam Bahasa Indonesia

PENTING: Jangan gunakan FFmpeg untuk foto, langsung upload saja.

Jika ada error di langkah manapun, laporkan error dalam pesan konfirmasi.
        `
        : `
Saya memiliki video dari Telegram yang perlu di-upload ke Facebook Page dan dibagikan ke grup-grup Facebook.

Detail:
- File ID Telegram: ${inputData.fileId}
- Type: Video
- Judul: ${inputData.title}
- Deskripsi: ${inputData.description}
- Chat ID pengirim: ${inputData.chatId}

Tolong lakukan langkah-langkah berikut secara berurutan:

1. Download video dari Telegram menggunakan file_id tersebut
2. Konversi video ke format Facebook-compatible menggunakan FFmpeg (WAJIB)
3. Upload video hasil konversi ke Facebook Page dengan judul dan deskripsi yang diberikan
4. Setelah berhasil upload, bagikan post video ke semua grup Facebook yang ada di groups.txt
5. Kirim pesan konfirmasi ke chat ID ${inputData.chatId} yang berisi:
   - Link video di Facebook
   - Jumlah grup yang berhasil/gagal di-share
   - Pesan yang ramah dan informatif dalam Bahasa Indonesia

Jika ada error di langkah manapun, tetap lanjutkan ke langkah berikutnya yang masih bisa dilakukan, dan laporkan semua error dalam pesan konfirmasi.

Berikan saya ringkasan hasil akhir dari semua langkah tersebut.
        `;
      
      logger?.info(`📝 [processMediaUpload] Calling AI agent to process ${mediaType}...`);
      
      const response = await facebookVideoAgent.generateLegacy(
        [{ role: "user", content: prompt }],
        {
          resourceId: "telegram-bot",
          threadId: inputData.threadId,
          maxSteps: 10,
        }
      );
      
      logger?.info(`✅ [processMediaUpload] AI agent processing complete`);
      
      // Parse response untuk extract informasi penting
      const responseText = response.text;
      
      // Coba detect apakah ada media URL dalam response
      const mediaUrlMatch = responseText.match(/https:\/\/www\.facebook\.com\/[^\s]+/);
      const mediaUrl = mediaUrlMatch ? mediaUrlMatch[0] : undefined;
      
      // Coba detect hasil sharing (hanya untuk video)
      const successMatch = responseText.match(/(\d+)\s*(?:grup)?\s*berhasil/i);
      const failMatch = responseText.match(/(\d+)\s*(?:grup)?\s*gagal/i);
      const totalMatch = responseText.match(/(\d+)\s*(?:total)?\s*grup/i);
      
      // Detect errors dalam response
      const hasError = responseText.toLowerCase().includes('error') || 
                       responseText.toLowerCase().includes('gagal') ||
                       responseText.toLowerCase().includes('tidak berhasil');
      
      // Success adalah true jika ada media URL dan tidak ada error kritis
      const overallSuccess = mediaUrl !== undefined && !hasError;
      
      logger?.info(`📊 [processMediaUpload] AI Results for ${mediaType}:`, {
        overallSuccess,
        hasMediaUrl: !!mediaUrl,
        hasError,
      });
      
      return {
        success: overallSuccess,
        mediaUrl,
        shareResults: {
          totalGroups: totalMatch ? parseInt(totalMatch[1]) : 0,
          successCount: successMatch ? parseInt(successMatch[1]) : 0,
          failCount: failMatch ? parseInt(failMatch[1]) : 0,
        },
        message: responseText,
      };
      
    } catch (error: any) {
      logger?.error(`❌ [processMediaUpload] AI Error for ${mediaType}, switching to fallback:`, error.message);
      logger?.warn("⚠️ Beralih ke mode fallback karena AI error");
      
      // Fallback to direct processing if AI fails
      return await processMediaDirectly(inputData, mastra);
    }
  },
});

const prepareMediaData = createStep({
  id: "prepare-media-data",
  description: "Route workflow: if URL provided, download from TikTok/Instagram; otherwise pass through manual upload data",
  
  inputSchema: z.object({
    threadId: z.string().describe("Thread ID untuk memory management"),
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID"),
    fileId: z.string().optional().describe("Telegram file_id - for manual upload"),
    mediaType: z.enum(['video', 'photo']).default('video'),
    title: z.string().optional().describe("Title - for manual upload"),
    description: z.string().optional().describe("Description - for manual upload"),
    userName: z.string().optional(),
    url: z.string().optional().describe("TikTok/Instagram URL - for URL flow"),
  }),
  
  outputSchema: z.object({
    threadId: z.string(),
    chatId: z.union([z.string(), z.number()]),
    fileId: z.string().optional(),
    mediaType: z.enum(['video', 'photo']),
    title: z.string().optional(),
    description: z.string().optional(),
    userName: z.string().optional(),
    localFilePath: z.string().optional(),
    isUrlFlow: z.boolean(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    
    logger?.info('🔀 [prepareMediaData] Routing workflow...', {
      hasUrl: !!inputData.url,
      hasFileId: !!inputData.fileId,
    });
    
    // Check if this is URL flow or manual upload flow
    if (inputData.url) {
      logger?.info('🔗 [prepareMediaData] URL flow detected, downloading from URL...');
      
      try {
        // Detect platform from URL (include vt.tiktok.com for short URLs)
        const tiktokRegex = /tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i;
        const instagramRegex = /instagram\.com\/(?:p|reel)/i;
        
        const isTikTok = tiktokRegex.test(inputData.url);
        const isInstagram = instagramRegex.test(inputData.url);
        
        if (!isTikTok && !isInstagram) {
          logger?.error('❌ [prepareMediaData] URL is not TikTok or Instagram', {
            url: inputData.url,
          });
          
          await telegramSendMessage.execute({
            context: {
              chatId: inputData.chatId,
              message: '❌ *URL tidak valid*\n\nURL harus dari TikTok atau Instagram (post/reel).',
            },
            mastra,
            runtimeContext: {} as any
          });
          
          return {
            threadId: inputData.threadId,
            chatId: inputData.chatId,
            mediaType: 'video' as const,
            userName: inputData.userName,
            isUrlFlow: true,
          };
        }
        
        logger?.info(`📱 [prepareMediaData] Platform detected: ${isTikTok ? 'TikTok' : 'Instagram'}`);
        
        // Call appropriate download tool
        let downloadResult;
        
        if (isTikTok) {
          logger?.info('📥 [prepareMediaData] Downloading from TikTok...');
          downloadResult = await tiktokDownload.execute({
            context: { url: inputData.url },
            mastra,
            runtimeContext: {} as any
          });
        } else {
          logger?.info('📥 [prepareMediaData] Downloading from Instagram...');
          downloadResult = await instagramDownload.execute({
            context: { url: inputData.url },
            mastra,
            runtimeContext: {} as any
          });
        }
        
        if (!downloadResult.success || !downloadResult.filePath) {
          logger?.error('❌ [prepareMediaData] Download failed', {
            error: downloadResult.error,
            platform: isTikTok ? 'TikTok' : 'Instagram',
          });
          
          const platform = isTikTok ? 'TikTok' : 'Instagram';
          await telegramSendMessage.execute({
            context: {
              chatId: inputData.chatId,
              message: `❌ *Gagal download video dari ${platform}*\n\n${downloadResult.error || 'Unknown error'}\n\nSilakan coba lagi atau gunakan URL lain.`,
            },
            mastra,
            runtimeContext: {} as any
          });
          
          return {
            threadId: inputData.threadId,
            chatId: inputData.chatId,
            mediaType: 'video' as const,
            userName: inputData.userName,
            isUrlFlow: true,
          };
        }
        
        logger?.info('✅ [prepareMediaData] Download successful!', {
          filePath: downloadResult.filePath,
          fileSize: downloadResult.fileSize,
          title: downloadResult.title?.substring(0, 50),
          platform: isTikTok ? 'TikTok' : 'Instagram',
        });
        
        // Merge downloaded data with metadata
        // NOTE: caption from TikTok/Instagram already contains hashtags, so don't duplicate
        const mergedTitle = downloadResult.title || inputData.title || 'Video';
        const mergedDescription = downloadResult.caption || inputData.description || 'Video dari TikTok/Instagram';
        
        logger?.info('✅ [prepareMediaData] Merged metadata:', {
          title: mergedTitle.substring(0, 50),
          descriptionLength: mergedDescription.length,
          hasCaption: !!downloadResult.caption,
        });
        
        return {
          threadId: inputData.threadId,
          chatId: inputData.chatId,
          mediaType: 'video' as const,
          title: mergedTitle,
          description: mergedDescription,
          userName: inputData.userName,
          localFilePath: downloadResult.filePath,
          isUrlFlow: true,
        };
        
      } catch (error: any) {
        logger?.error('❌ [prepareMediaData] Unexpected error:', error);
        
        await telegramSendMessage.execute({
          context: {
            chatId: inputData.chatId,
            message: `❌ *Terjadi error saat download video*\n\n${error.message}\n\nSilakan coba lagi.`,
          },
          mastra,
          runtimeContext: {} as any
        }).catch(err => {
          logger?.error('❌ Failed to send error notification:', err);
        });
        
        return {
          threadId: inputData.threadId,
          chatId: inputData.chatId,
          mediaType: 'video' as const,
          userName: inputData.userName,
          isUrlFlow: true,
        };
      }
      
    } else {
      logger?.info('📤 [prepareMediaData] Manual upload flow detected, passing through...');
      
      // Validate manual upload has required fields
      if (!inputData.fileId) {
        logger?.error('❌ [prepareMediaData] Manual upload missing fileId');
        await telegramSendMessage.execute({
          context: {
            chatId: inputData.chatId,
            message: '❌ *Error: Data tidak lengkap*\n\nFile ID tidak ditemukan. Mohon kirim ulang media.',
          },
          mastra,
          runtimeContext: {} as any
        }).catch(err => logger?.error('Failed to send error message:', err));
        
        throw new Error('Manual upload requires fileId');
      }
      
      logger?.info('✅ [prepareMediaData] Manual upload validated', {
        hasFileId: !!inputData.fileId,
        hasTitle: !!inputData.title,
        hasDescription: !!inputData.description,
      });
      
      // Manual upload flow: pass through as-is with explicit flag
      return {
        threadId: inputData.threadId,
        chatId: inputData.chatId,
        fileId: inputData.fileId,
        mediaType: inputData.mediaType || 'video' as const,
        title: inputData.title || 'Media upload',
        description: inputData.description || '',
        userName: inputData.userName,
        isUrlFlow: false, // Explicit flag for manual flow
      };
    }
  },
});

export const facebookVideoWorkflow = createWorkflow({
  id: "facebook-video-workflow", // Keep same ID for backwards compatibility
  
  inputSchema: z.object({
    threadId: z.string().describe("Thread ID untuk memory management"),
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID"),
    fileId: z.string().optional().describe("Telegram file_id dari media (video atau photo) - optional for URL flow"),
    mediaType: z.enum(['video', 'photo']).default('video').describe("Type of media: video or photo"),
    title: z.string().optional().describe("Judul/caption untuk media - optional for URL flow"),
    description: z.string().optional().describe("Deskripsi/caption media dengan hashtags - optional for URL flow"),
    userName: z.string().optional().describe("Username pengirim"),
    url: z.string().optional().describe("TikTok/Instagram URL untuk auto-download"),
  }) as any,
  
  outputSchema: z.object({
    success: z.boolean(),
    mediaUrl: z.string().optional(),
    shareResults: z.object({
      totalGroups: z.number(),
      successCount: z.number(),
      failCount: z.number(),
    }).optional(),
    message: z.string(),
  }),
})
  .then(prepareMediaData as any)
  .then(processMediaUpload as any)
  .commit();
