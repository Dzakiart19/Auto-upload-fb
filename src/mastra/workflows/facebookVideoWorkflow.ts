import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { facebookVideoAgent } from "../agents/facebookVideoAgent";
import { telegramDownloadVideo } from "../tools/telegramDownloadVideo";
import { facebookUploadVideo } from "../tools/facebookUploadVideo";
import { facebookShareToGroups } from "../tools/facebookShareToGroups";
import { telegramSendMessage } from "../tools/telegramSendMessage";

// Check if AI should be used or fallback to direct tool calls
const shouldUseAI = () => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  const fallbackEnabled = process.env.AI_FALLBACK_ENABLED !== 'false'; // Default true
  return hasOpenAIKey && !fallbackEnabled;
};

// Fallback: Direct tool execution without AI
const processVideoDirectly = async (inputData: any, mastra: any) => {
  const logger = mastra?.getLogger();
  
  logger?.info("⚠️ [AI Mode] FALLBACK - Running without AI, using direct tool calls");
  logger?.info("📝 [processVideoDirectly] Starting direct video processing...");
  
  let videoUrl = '';
  let videoId = '';
  let downloadSuccess = false;
  let uploadSuccess = false;
  let shareResults = { totalGroups: 0, successCount: 0, failCount: 0 };
  
  try {
    // Step 1: Download video from Telegram
    logger?.info("📥 [Step 1/4] Downloading video from Telegram...");
    const downloadResult = await telegramDownloadVideo.execute({
      context: {
        fileId: inputData.fileId,
        fileName: `video_${Date.now()}.mp4`
      },
      mastra,
      runtimeContext: {}
    });
    
    if (!downloadResult.success || !downloadResult.filePath) {
      throw new Error(`Download gagal: ${downloadResult.error || 'Unknown error'}`);
    }
    
    downloadSuccess = true;
    logger?.info("✅ [Step 1/4] Video downloaded successfully");
    
    // Step 2: Upload video to Facebook Page (using simple upload)
    logger?.info("📤 [Step 2/4] Uploading video to Facebook Page...");
    const uploadResult = await facebookUploadVideo.execute({
      context: {
        videoPath: downloadResult.filePath,
        title: inputData.title,
        description: inputData.description
      },
      mastra,
      runtimeContext: {}
    });
    
    if (!uploadResult.success || !uploadResult.videoUrl) {
      throw new Error(`Upload gagal: ${uploadResult.error || 'Unknown error'}`);
    }
    
    uploadSuccess = true;
    videoUrl = uploadResult.videoUrl!;
    videoId = uploadResult.videoId!;
    logger?.info("✅ [Step 2/4] Video uploaded to Facebook:", videoUrl);
    
    // Step 3: Share to Facebook Groups
    logger?.info("📢 [Step 3/4] Sharing to Facebook Groups...");
    const shareResult = await facebookShareToGroups.execute({
      context: {
        videoUrl: videoUrl,
        videoId: videoId,
        message: `${inputData.title}\n\n${inputData.description}`
      },
      mastra,
      runtimeContext: {}
    });
    
    shareResults = {
      totalGroups: shareResult.totalGroups,
      successCount: shareResult.successCount,
      failCount: shareResult.failCount
    };
    
    logger?.info("✅ [Step 3/4] Sharing complete:", shareResults);
    
    // Step 4: Send confirmation to user
    logger?.info("📨 [Step 4/4] Sending confirmation to user...");
    const confirmationMessage = `
✅ *Video berhasil diupload!*

📹 *Judul:* ${inputData.title}
📝 *Deskripsi:* ${inputData.description}

🔗 *Link Video:*
${videoUrl}

📊 *Hasil Sharing ke Grup:*
• Total grup: ${shareResults.totalGroups}
• Berhasil: ${shareResults.successCount}
• Gagal: ${shareResults.failCount}

${shareResults.totalGroups === 0 ? '⚠️ Tidak ada grup Facebook di groups.txt' : ''}
${shareResults.successCount > 0 ? '✅ Video sudah dibagikan ke grup Facebook!' : ''}

_Video diproses tanpa AI (mode fallback)_
    `.trim();
    
    await telegramSendMessage.execute({
      context: {
        chatId: inputData.chatId,
        message: confirmationMessage
      },
      mastra,
      runtimeContext: {}
    });
    
    logger?.info("✅ [Step 4/4] Confirmation sent to user");
    
    return {
      success: true,
      videoUrl,
      shareResults,
      message: confirmationMessage
    };
    
  } catch (error: any) {
    logger?.error("❌ [processVideoDirectly] Error:", error);
    
    // Send error notification
    try {
      let errorMessage = `❌ *Maaf, terjadi error saat memproses video*\n\n`;
      
      if (!downloadSuccess) {
        errorMessage += `📥 Download video: GAGAL\n${error.message}\n\n`;
      } else if (!uploadSuccess) {
        errorMessage += `📥 Download video: SUKSES\n📤 Upload ke Facebook: GAGAL\n${error.message}\n\n`;
      } else {
        errorMessage += `📥 Download: SUKSES\n📤 Upload: SUKSES\n📢 Share: ERROR\n${error.message}\n\n`;
      }
      
      errorMessage += `Silakan coba lagi atau hubungi admin.`;
      
      await telegramSendMessage.execute({
        context: {
          chatId: inputData.chatId,
          message: errorMessage
        },
        mastra,
        runtimeContext: {}
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

const processVideoUpload = createStep({
  id: "process-video-upload",
  description: "Download video dari Telegram, upload ke Facebook Page, share ke groups, dan kirim konfirmasi",
  
  inputSchema: z.object({
    threadId: z.string().describe("Thread ID untuk memory management"),
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID pengirim video"),
    fileId: z.string().describe("Telegram file_id dari video"),
    title: z.string().describe("Judul video"),
    description: z.string().describe("Deskripsi/caption video dengan hashtags"),
    userName: z.string().optional().describe("Username pengirim"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    videoUrl: z.string().optional(),
    shareResults: z.object({
      totalGroups: z.number(),
      successCount: z.number(),
      failCount: z.number(),
    }).optional(),
    message: z.string(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🚀 [processVideoUpload] Starting video upload process...", {
      threadId: inputData.threadId,
      chatId: inputData.chatId,
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
      return await processVideoDirectly(inputData, mastra);
    }
    
    // Try AI mode with fallback on error
    try {
      const prompt = `
Saya memiliki video dari Telegram yang perlu di-upload ke Facebook Page dan dibagikan ke grup-grup Facebook.

Detail:
- File ID Telegram: ${inputData.fileId}
- Judul: ${inputData.title}
- Deskripsi: ${inputData.description}
- Chat ID pengirim: ${inputData.chatId}

Tolong lakukan langkah-langkah berikut secara berurutan:

1. Download video dari Telegram menggunakan file_id tersebut
2. Upload video ke Facebook Page dengan judul dan deskripsi yang diberikan
3. Setelah berhasil upload, bagikan post video ke semua grup Facebook yang ada di groups.txt
4. Kirim pesan konfirmasi ke chat ID ${inputData.chatId} yang berisi:
   - Link video di Facebook
   - Jumlah grup yang berhasil/gagal di-share
   - Pesan yang ramah dan informatif dalam Bahasa Indonesia

Jika ada error di langkah manapun, tetap lanjutkan ke langkah berikutnya yang masih bisa dilakukan, dan laporkan semua error dalam pesan konfirmasi.

Berikan saya ringkasan hasil akhir dari semua langkah tersebut.
      `;
      
      logger?.info("📝 [processVideoUpload] Calling AI agent to process video...");
      
      const response = await facebookVideoAgent.generateLegacy(
        [{ role: "user", content: prompt }],
        {
          resourceId: "telegram-bot",
          threadId: inputData.threadId,
          maxSteps: 10,
        }
      );
      
      logger?.info("✅ [processVideoUpload] AI agent processing complete");
      
      // Parse response untuk extract informasi penting
      const responseText = response.text;
      
      // Coba detect apakah ada video URL dalam response
      const videoUrlMatch = responseText.match(/https:\/\/www\.facebook\.com\/[^\s]+/);
      const videoUrl = videoUrlMatch ? videoUrlMatch[0] : undefined;
      
      // Coba detect hasil sharing
      const successMatch = responseText.match(/(\d+)\s*(?:grup)?\s*berhasil/i);
      const failMatch = responseText.match(/(\d+)\s*(?:grup)?\s*gagal/i);
      const totalMatch = responseText.match(/(\d+)\s*(?:total)?\s*grup/i);
      
      // Detect errors dalam response
      const hasError = responseText.toLowerCase().includes('error') || 
                       responseText.toLowerCase().includes('gagal') ||
                       responseText.toLowerCase().includes('tidak berhasil');
      
      // Success adalah true jika ada video URL dan tidak ada error kritis
      const overallSuccess = videoUrl !== undefined && !hasError;
      
      logger?.info("📊 [processVideoUpload] AI Results:", {
        overallSuccess,
        hasVideoUrl: !!videoUrl,
        hasError,
      });
      
      return {
        success: overallSuccess,
        videoUrl,
        shareResults: {
          totalGroups: totalMatch ? parseInt(totalMatch[1]) : 0,
          successCount: successMatch ? parseInt(successMatch[1]) : 0,
          failCount: failMatch ? parseInt(failMatch[1]) : 0,
        },
        message: responseText,
      };
      
    } catch (error: any) {
      logger?.error("❌ [processVideoUpload] AI Error, switching to fallback:", error.message);
      logger?.warn("⚠️ Beralih ke mode fallback karena AI error");
      
      // Fallback to direct processing if AI fails
      return await processVideoDirectly(inputData, mastra);
    }
  },
});

export const facebookVideoWorkflow = createWorkflow({
  id: "facebook-video-workflow",
  
  inputSchema: z.object({
    threadId: z.string().describe("Thread ID untuk memory management"),
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID"),
    fileId: z.string().describe("Telegram file_id dari video"),
    title: z.string().describe("Judul video"),
    description: z.string().describe("Deskripsi video dengan hashtags"),
    userName: z.string().optional().describe("Username pengirim"),
  }) as any,
  
  outputSchema: z.object({
    success: z.boolean(),
    videoUrl: z.string().optional(),
    shareResults: z.object({
      totalGroups: z.number(),
      successCount: z.number(),
      failCount: z.number(),
    }).optional(),
    message: z.string(),
  }),
})
  .then(processVideoUpload as any)
  .commit();
