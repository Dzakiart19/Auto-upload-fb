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
  
  logger?.info("⚠️ [AI Mode] FALLBACK - Running without AI, using direct tool calls");
  logger?.info(`📝 [processMediaDirectly] Starting direct ${mediaType} processing...`, { mediaType });
  
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
    // Step 0: Use simple user input + generate hashtags only (no fancy captions)
    logger?.info("✨ [Step 0] Preparing caption from user input and generating hashtags...");
    
    // Validate and provide defaults for required inputs
    const safeTitle = inputData.title || 'Media upload';
    const safeDescription = inputData.description || '';
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
    // Step 1: Download media from Telegram (branch by media type)
    if (mediaType === 'photo') {
      logger?.info("📥 [Step 1] Downloading photo from Telegram...");
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
      // Video download (existing flow)
      logger?.info("📥 [Step 1/5] Downloading video from Telegram...");
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
    fileId: z.string().describe("Telegram file_id dari media (video atau photo)"),
    mediaType: z.enum(['video', 'photo']).default('video').describe("Type of media: video or photo"),
    title: z.string().describe("Judul/caption untuk media"),
    description: z.string().describe("Deskripsi/caption media dengan hashtags"),
    userName: z.string().optional().describe("Username pengirim"),
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
    
    logger?.info(`[AI] Mode: ${useAI ? 'AI ACTIVE' : 'FALLBACK (Direct Tools)'}`);
    logger?.info(`[AI] OpenAI Key: ${hasOpenAIKey ? 'Present' : 'Missing'}`);
    logger?.info(`[AI] Fallback Enabled: ${process.env.AI_FALLBACK_ENABLED || 'default (false)'}`);
    
    // If no AI, use direct tool execution
    if (!useAI || !hasOpenAIKey) {
      logger?.info("⚠️ AI sedang offline atau dinonaktifkan, menggunakan mode fallback");
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

export const facebookVideoWorkflow = createWorkflow({
  id: "facebook-video-workflow", // Keep same ID for backwards compatibility
  
  inputSchema: z.object({
    threadId: z.string().describe("Thread ID untuk memory management"),
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID"),
    fileId: z.string().describe("Telegram file_id dari media (video atau photo)"),
    mediaType: z.enum(['video', 'photo']).default('video').describe("Type of media: video or photo"),
    title: z.string().describe("Judul/caption untuk media"),
    description: z.string().describe("Deskripsi/caption media dengan hashtags"),
    userName: z.string().optional().describe("Username pengirim"),
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
  .then(processMediaUpload as any)
  .commit();
