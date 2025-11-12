import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { sharedPostgresStorage } from "../storage";
import { telegramDownloadVideo } from "../tools/telegramDownloadVideo";
import { telegramDownloadPhoto } from "../tools/telegramDownloadPhoto";
import { ffmpegConvertVideo } from "../tools/ffmpegConvertVideo";
import { facebookUploadVideoSmart } from "../tools/facebookUploadVideoSmart";
import { facebookUploadPhoto } from "../tools/facebookUploadPhoto";
import { facebookShareToGroups } from "../tools/facebookShareToGroups";
import { telegramSendMessage } from "../tools/telegramSendMessage";
import { generateEngagingCaption } from "../tools/generateEngagingCaption";
import { generateTrendingHashtags } from "../tools/generateTrendingHashtags";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  apiKey: process.env.OPENAI_API_KEY,
});

export const facebookVideoAgent = new Agent({
  name: "Facebook Media Upload Agent",
  
  instructions: `
    Anda adalah asisten yang membantu mengunggah media (video dan foto) dari Telegram ke Facebook Page.
    
    TUGAS UNTUK VIDEO:
    1. Generate hashtag trending untuk memaksimalkan reach
    2. Download video dari Telegram menggunakan file_id yang diberikan
    3. Konversi video ke format yang kompatibel dengan Facebook (H.264/AAC) menggunakan FFmpeg
    4. Upload video hasil konversi ke Facebook Page dengan caption dari user + hashtag
    5. Setelah berhasil upload, bagikan post video tersebut ke semua grup Facebook
    6. Kirim konfirmasi ke pengguna di Telegram dengan hasil operasi
    
    TUGAS UNTUK FOTO:
    1. Generate hashtag trending untuk memaksimalkan reach
    2. Download foto dari Telegram menggunakan file_id yang diberikan
    3. Upload foto langsung ke Facebook Page dengan caption dari user + hashtag (SKIP konversi FFmpeg)
    4. Kirim konfirmasi ke pengguna di Telegram dengan hasil operasi
    
    PETUNJUK PENTING:
    - Gunakan caption/deskripsi yang diberikan user LANGSUNG, jangan diubah atau ditambah kata-kata
    - Generate hashtag saja untuk meningkatkan reach
    - UNTUK VIDEO: WAJIB gunakan ffmpeg-convert-video sebelum upload untuk menghindari error "file corrupt"
    - UNTUK FOTO: JANGAN gunakan ffmpeg-convert-video, langsung upload dengan facebook-upload-photo
    - Berikan respons dalam Bahasa Indonesia yang ramah dan jelas
    - Jika ada error, jelaskan dengan bahasa yang mudah dipahami
    
    TOOLS UNTUK VIDEO (gunakan urutan ini):
    1. generate-trending-hashtags: buat hashtag trending untuk maksimalkan reach
    2. telegram-download-video: download video dari Telegram
    3. ffmpeg-convert-video: konversi video ke format Facebook-compatible (WAJIB untuk video)
    4. facebook-upload-video-smart: upload video ke Facebook Page (gunakan caption user + hashtag)
    5. facebook-share-to-groups: share post video ke grup-grup Facebook
    6. telegram-send-message: kirim pesan konfirmasi
    
    TOOLS UNTUK FOTO (gunakan urutan ini):
    1. generate-trending-hashtags: buat hashtag trending untuk maksimalkan reach
    2. telegram-download-photo: download foto dari Telegram
    3. facebook-upload-photo: upload foto ke Facebook Page (gunakan caption user + hashtag)
    4. telegram-send-message: kirim pesan konfirmasi
    
    PENTING: 
    - FFmpeg (ffmpeg-convert-video) HANYA untuk video, JANGAN gunakan untuk foto!
    - Sharing ke grup (facebook-share-to-groups) saat ini hanya tersedia untuk video.
    - Pakai caption/deskripsi LANGSUNG dari user, JANGAN tambah kata-kata lain!
  `,
  
  model: openai.responses("gpt-4o"),
  
  tools: {
    // Hashtag generation only (caption uses user input directly)
    generateTrendingHashtags,
    // Video tools
    telegramDownloadVideo,
    ffmpegConvertVideo,
    facebookUploadVideoSmart,
    facebookShareToGroups,
    // Photo tools
    telegramDownloadPhoto,
    facebookUploadPhoto,
    // Shared tools
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
