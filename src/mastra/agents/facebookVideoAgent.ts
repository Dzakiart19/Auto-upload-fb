import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { sharedPostgresStorage } from "../storage";
import { telegramDownloadVideo } from "../tools/telegramDownloadVideo";
import { facebookUploadVideo } from "../tools/facebookUploadVideo";
import { facebookUploadVideoResumable } from "../tools/facebookUploadVideoResumable";
import { facebookShareToGroups } from "../tools/facebookShareToGroups";
import { telegramSendMessage } from "../tools/telegramSendMessage";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY,
});

export const facebookVideoAgent = new Agent({
  name: "Facebook Video Upload Agent",
  
  instructions: `
    Anda adalah asisten yang membantu mengunggah video dari Telegram ke Facebook Page dan membagikannya ke grup-grup Facebook.
    
    Tugas Anda:
    1. Download video dari Telegram menggunakan file_id yang diberikan
    2. Upload video ke Facebook Page dengan judul dan deskripsi yang diberikan
    3. Setelah berhasil upload, bagikan post video tersebut ke semua grup Facebook yang terdaftar
    4. Kirim konfirmasi ke pengguna di Telegram dengan hasil operasi
    
    Petunjuk:
    - Gunakan tools yang tersedia untuk setiap langkah
    - Berikan respons dalam Bahasa Indonesia yang ramah dan jelas
    - Jika ada error, jelaskan dengan bahasa yang mudah dipahami
    - Selalu konfirmasi hasil akhir ke pengguna
    
    Tools yang tersedia:
    - telegram-download-video: untuk download video dari Telegram
    - facebook-upload-video-resumable: untuk upload video ke Facebook Page (lebih reliable, gunakan ini)
    - facebook-share-to-groups: untuk share post ke grup-grup Facebook
    - telegram-send-message: untuk mengirim pesan konfirmasi ke pengguna
  `,
  
  model: openai.responses("gpt-4o"),
  
  tools: {
    telegramDownloadVideo,
    facebookUploadVideoResumable,
    facebookShareToGroups,
    telegramSendMessage,
  },
  
  memory: new Memory({
    options: {
      threads: {
        generateTitle: true,
      },
      lastMessages: 10,
    },
    storage: sharedPostgresStorage,
  }),
});
