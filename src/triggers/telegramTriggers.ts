import type { ContentfulStatusCode } from "hono/utils/http-status";

import { registerApiRoute } from "../mastra/inngest";
import { Mastra } from "@mastra/core";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn(
    "Trying to initialize Telegram triggers without TELEGRAM_BOT_TOKEN. Can you confirm that the Telegram integration is configured correctly?",
  );
}

export type TriggerInfoTelegramOnNewMessage = {
  type: "telegram/message" | "telegram/video";
  params: {
    userName: string;
    message?: string;
    chatId: string | number;
    fileId?: string;
    fileName?: string;
    fileSize?: number;
  };
  payload: any;
};

// State management untuk conversation flow
const userStates = new Map<string | number, {
  step: 'awaiting_video' | 'awaiting_title' | 'awaiting_description';
  videoFileId?: string;
  videoFileName?: string;
  title?: string;
}>();

async function sendTelegramMessage(chatId: string | number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
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

          // Handle /start command
          if (text === '/start') {
            userStates.set(chatId, { step: 'awaiting_video' });
            await sendTelegramMessage(
              chatId,
              '🎬 Selamat datang di Bot Upload Video ke Facebook!\n\n' +
              'Kirim video yang ingin kamu upload ke Facebook Page!'
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
              videoFileId: video.file_id,
              videoFileName: video.file_name || `video_${Date.now()}.mp4`,
            });

            await sendTelegramMessage(
              chatId,
              '✅ Video diterima!\n\n📝 Sekarang, kirim <b>judul</b> untuk video ini:'
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

              await sendTelegramMessage(
                chatId,
                '✅ Judul tersimpan!\n\n🏷️ Sekarang, kirim <b>deskripsi/hashtags</b> untuk video ini:'
              );
              return c.text("OK", 200);

            } else if (currentState.step === 'awaiting_description') {
              const description = text;
              
              await sendTelegramMessage(
                chatId,
                '⏳ Sedang memproses video...\n\n' +
                '• Download video dari Telegram\n' +
                '• Upload ke Facebook Page\n' +
                '• Share ke grup-grup Facebook\n\n' +
                'Mohon tunggu sebentar...'
              );

              // Trigger workflow
              await handler(mastra, {
                type: "telegram/video",
                params: {
                  userName,
                  chatId,
                  fileId: currentState.videoFileId!,
                  fileName: currentState.videoFileName,
                },
                payload: {
                  chatId,
                  fileId: currentState.videoFileId,
                  fileName: currentState.videoFileName,
                  title: currentState.title,
                  description,
                  userName,
                },
              } as TriggerInfoTelegramOnNewMessage);

              // Reset state
              userStates.set(chatId, { step: 'awaiting_video' });

              return c.text("OK", 200);
            }
          }

          // Default message untuk user yang belum /start atau di step yang salah
          if (!currentState || currentState.step === 'awaiting_video') {
            await sendTelegramMessage(
              chatId,
              '🎬 Kirim video yang ingin kamu upload ke Facebook Page!\n\n' +
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
