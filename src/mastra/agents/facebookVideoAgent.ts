import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { sharedPostgresStorage } from "../storage";
import { telegramDownloadVideo } from "../tools/telegramDownloadVideo";
import { ffmpegConvertVideo } from "../tools/ffmpegConvertVideo";
import { facebookUploadVideoSmart } from "../tools/facebookUploadVideoSmart";
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
    2. Konversi video ke format yang kompatibel dengan Facebook (H.264/AAC) menggunakan FFmpeg
    3. Upload video hasil konversi ke Facebook Page dengan judul dan deskripsi yang diberikan
    4. Setelah berhasil upload, bagikan post video tersebut ke semua grup Facebook yang terdaftar
    5. Kirim konfirmasi ke pengguna di Telegram dengan hasil operasi
    
    Petunjuk:
    - Gunakan tools yang tersedia untuk setiap langkah SECARA BERURUTAN
    - PENTING: Selalu konversi video dengan ffmpeg-convert-video sebelum upload ke Facebook untuk menghindari error "file corrupt"
    - Berikan respons dalam Bahasa Indonesia yang ramah dan jelas
    - Jika ada error, jelaskan dengan bahasa yang mudah dipahami
    - Selalu konfirmasi hasil akhir ke pengguna
    
    Tools yang tersedia:
    - telegram-download-video: untuk download video dari Telegram
    - ffmpeg-convert-video: untuk konversi video ke format Facebook-compatible (WAJIB digunakan setelah download)
    - facebook-upload-video-smart: untuk upload video ke Facebook Page (gunakan video hasil konversi)
    - facebook-share-to-groups: untuk share post ke grup-grup Facebook
    - telegram-send-message: untuk mengirim pesan konfirmasi ke pengguna
  `,
  
  model: openai.responses("gpt-4o"),
  
  tools: {
    telegramDownloadVideo,
    ffmpegConvertVideo,
    facebookUploadVideoSmart,
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
