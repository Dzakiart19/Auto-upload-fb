import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { facebookVideoAgent } from "../agents/facebookVideoAgent";

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
      
      logger?.info("📝 [processVideoUpload] Calling agent to process video...");
      
      const response = await facebookVideoAgent.generateLegacy(
        [{ role: "user", content: prompt }],
        {
          resourceId: "telegram-bot",
          threadId: inputData.threadId,
          maxSteps: 10,
        }
      );
      
      logger?.info("✅ [processVideoUpload] Agent processing complete");
      
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
      
      logger?.info("📊 [processVideoUpload] Results:", {
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
      logger?.error("❌ [processVideoUpload] Error:", error);
      
      // Even on error, try to send notification to user
      try {
        const errorMessage = `❌ Maaf, terjadi error saat memproses video:\n\n${error.message}\n\nSilakan coba lagi atau hubungi admin.`;
        
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: inputData.chatId,
            text: errorMessage,
          }),
        });
      } catch (notifError) {
        logger?.error("❌ [processVideoUpload] Failed to send error notification:", notifError);
      }
      
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
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
