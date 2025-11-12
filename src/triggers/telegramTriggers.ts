import type { ContentfulStatusCode } from "hono/utils/http-status";

import { registerApiRoute } from "../mastra/inngest";
import { Mastra } from "@mastra/core";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn(
    "Trying to initialize Telegram triggers without TELEGRAM_BOT_TOKEN. Can you confirm that the Telegram integration is configured correctly?",
  );
}

export type TriggerInfoTelegramOnNewMessage = {
  type: "telegram/message" | "telegram/video" | "telegram/photo";
  params: {
    userName: string;
    message?: string;
    chatId: string | number;
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    mediaType?: 'video' | 'photo';
  };
  payload: any;
};

// State management untuk conversation flow
const userStates = new Map<string | number, {
  step: 'awaiting_media' | 'awaiting_title' | 'awaiting_description';
  mediaType?: 'video' | 'photo';
  mediaFileId?: string;
  mediaFileName?: string;
  title?: string;
}>();

// Idempotency check: Track files yang sedang diproses untuk mencegah duplicate upload
const processingFiles = new Map<string, number>();
const PROCESSING_TIMEOUT = 5 * 60 * 1000; // 5 menit

// Cleanup old entries setiap 10 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processingFiles.entries()) {
    if (now - timestamp > PROCESSING_TIMEOUT) {
      processingFiles.delete(key);
    }
  }
}, 10 * 60 * 1000);

async function sendTelegramMessage(chatId: string | number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export function registerTelegramTrigger({
  triggerType,
  handler,
}: {
  triggerType: string;
  handler: (
    mastra: Mastra,
    triggerInfo: TriggerInfoTelegramOnNewMessage,
  ) => Promise<void>;
}) {
  return [
    registerApiRoute("/webhooks/telegram/action", {
      method: "POST",
      handler: async (c) => {
        const mastra = c.get("mastra");
        const logger = mastra.getLogger();
        try {
          const payload = await c.req.json();

          logger?.info("📝 [Telegram] payload", payload);

          const message = payload.message;
          if (!message) {
            return c.text("OK", 200);
          }

          const chatId = message.chat.id;
          const userName = message.from?.username || message.from?.first_name || 'User';
          const text = message.text;
          const video = message.video;
          const photo = message.photo; // Array of PhotoSize, largest is at the end

          // Handle /start command
          if (text === '/start') {
            userStates.set(chatId, { step: 'awaiting_media' });
            await sendTelegramMessage(
              chatId,
              '🎬📸 Selamat datang di Bot Upload Media ke Facebook!\n\n' +
              'Kirim <b>video</b> atau <b>foto</b> yang ingin kamu upload ke Facebook Page!'
            );
            return c.text("OK", 200);
          }

          const currentState = userStates.get(chatId);

          // Handle video upload
          if (video) {
            logger?.info("📹 [Telegram] Video received", {
              fileId: video.file_id,
              fileName: video.file_name,
              fileSize: video.file_size,
            });

            userStates.set(chatId, {
              step: 'awaiting_title',
              mediaType: 'video',
              mediaFileId: video.file_id,
              mediaFileName: video.file_name || `video_${Date.now()}.mp4`,
            });

            await sendTelegramMessage(
              chatId,
              '✅ Video diterima!\n\n📝 Sekarang, kirim <b>judul</b> untuk video ini:'
            );
            return c.text("OK", 200);
          }

          // Handle photo upload
          if (photo && Array.isArray(photo) && photo.length > 0) {
            // Get the largest photo (last element in the array)
            const largestPhoto = photo[photo.length - 1];
            
            logger?.info("📸 [Telegram] Photo received", {
              fileId: largestPhoto.file_id,
              fileSize: largestPhoto.file_size,
              width: largestPhoto.width,
              height: largestPhoto.height,
              totalSizes: photo.length,
            });

            userStates.set(chatId, {
              step: 'awaiting_title',
              mediaType: 'photo',
              mediaFileId: largestPhoto.file_id,
              mediaFileName: `photo_${Date.now()}.jpg`,
            });

            await sendTelegramMessage(
              chatId,
              '✅ Foto diterima!\n\n📝 Sekarang, kirim <b>caption</b> untuk foto ini:'
            );
            return c.text("OK", 200);
          }

          // Handle conversation flow
          if (currentState && text) {
            if (currentState.step === 'awaiting_title') {
              userStates.set(chatId, {
                ...currentState,
                step: 'awaiting_description',
                title: text,
              });

              const mediaLabel = currentState.mediaType === 'photo' ? 'foto' : 'video';
              await sendTelegramMessage(
                chatId,
                `✅ ${currentState.mediaType === 'photo' ? 'Caption' : 'Judul'} tersimpan!\n\n🏷️ Sekarang, kirim <b>deskripsi/hashtags</b> untuk ${mediaLabel} ini:`
              );
              return c.text("OK", 200);

            } else if (currentState.step === 'awaiting_description') {
              const description = text;
              const mediaType = currentState.mediaType || 'video'; // Default to video for backwards compatibility
              const mediaLabel = mediaType === 'photo' ? 'foto' : 'video';
              
              // Idempotency check: Cegah duplicate processing untuk file yang sama
              const fileKey = `${chatId}-${currentState.mediaFileId}`;
              const now = Date.now();
              
              if (processingFiles.has(fileKey)) {
                const processingTime = processingFiles.get(fileKey)!;
                const elapsedTime = now - processingTime;
                
                if (elapsedTime < PROCESSING_TIMEOUT) {
                  logger?.warn(`⚠️ [Telegram] Duplicate request detected dan diabaikan`, {
                    fileKey,
                    chatId,
                    mediaType,
                    elapsedTime: Math.floor(elapsedTime / 1000) + 's',
                  });
                  
                  await sendTelegramMessage(
                    chatId,
                    `⚠️ ${mediaLabel.charAt(0).toUpperCase() + mediaLabel.slice(1)} ini sedang diproses.\n\nMohon tunggu beberapa saat...`
                  );
                  
                  return c.text("OK", 200);
                }
              }
              
              // Mark file sebagai sedang diproses
              processingFiles.set(fileKey, now);
              logger?.info(`🔒 [Telegram] Marking file as processing`, { fileKey, chatId, mediaType });
              
              try {
                // Processing message based on media type
                let processingMessage = '';
                if (mediaType === 'photo') {
                  processingMessage = 
                    '⏳ Sedang memproses foto...\n\n' +
                    '• Download foto dari Telegram\n' +
                    '• Upload ke Facebook Page\n\n' +
                    'Mohon tunggu sebentar...';
                } else {
                  processingMessage = 
                    '⏳ Sedang memproses video...\n\n' +
                    '• Download video dari Telegram\n' +
                    '• Konversi video\n' +
                    '• Upload ke Facebook Page\n' +
                    '• Share ke grup-grup Facebook\n\n' +
                    'Mohon tunggu sebentar...';
                }
                
                await sendTelegramMessage(chatId, processingMessage);

                // Trigger workflow with mediaType
                const triggerType = mediaType === 'photo' ? 'telegram/photo' : 'telegram/video';
                await handler(mastra, {
                  type: triggerType,
                  params: {
                    userName,
                    chatId,
                    fileId: currentState.mediaFileId!,
                    fileName: currentState.mediaFileName,
                    mediaType: mediaType,
                  },
                  payload: {
                    chatId,
                    fileId: currentState.mediaFileId,
                    fileName: currentState.mediaFileName,
                    mediaType: mediaType,
                    title: currentState.title,
                    description,
                    userName,
                  },
                } as TriggerInfoTelegramOnNewMessage);
              } finally {
                // Always clear processing lock after workflow completes or fails
                processingFiles.delete(fileKey);
                logger?.info(`🔓 [Telegram] Cleared processing lock`, { fileKey, chatId, mediaType });
              }

              // Reset state
              userStates.set(chatId, { step: 'awaiting_media' });

              return c.text("OK", 200);
            }
          }

          // Default message untuk user yang belum /start atau di step yang salah
          if (!currentState || currentState.step === 'awaiting_media') {
            await sendTelegramMessage(
              chatId,
              '🎬📸 Kirim <b>video</b> atau <b>foto</b> yang ingin kamu upload ke Facebook Page!\n\n' +
              'Atau ketik /start untuk memulai ulang.'
            );
          }

          return c.text("OK", 200);
        } catch (error) {
          logger?.error("Error handling Telegram webhook:", error);
          return c.text("Internal Server Error", 500);
        }
      },
    }),
  ];
}
