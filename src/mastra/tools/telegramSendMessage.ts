import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const telegramSendMessage = createTool({
  id: "telegram-send-message",
  description: "Send a message to a Telegram chat",
  
  inputSchema: z.object({
    chatId: z.union([z.string(), z.number()]).describe("Telegram chat ID to send message to"),
    message: z.string().describe("Message text to send"),
    parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe("Message parse mode"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.number().optional(),
    error: z.string().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [telegramSendMessage] Starting execution with params:', {
      chatId: context.chatId,
      messageLength: context.message.length,
    });
    
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      logger?.error('❌ [telegramSendMessage] TELEGRAM_BOT_TOKEN not found');
      return {
        success: false,
        error: "TELEGRAM_BOT_TOKEN tidak ditemukan di environment variables",
      };
    }
    
    try {
      logger?.info('📝 [telegramSendMessage] Sending message to Telegram...');
      logger?.info('🔑 [telegramSendMessage] Token length:', token.length);
      
      const sendUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: context.chatId,
          text: context.message,
          parse_mode: context.parseMode || undefined,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        logger?.error('❌ [telegramSendMessage] Failed to send message:', result);
        return {
          success: false,
          error: result.description || 'Gagal mengirim pesan',
        };
      }
      
      logger?.info('✅ [telegramSendMessage] Message sent successfully:', {
        messageId: result.result.message_id,
      });
      
      return {
        success: true,
        messageId: result.result.message_id,
      };
      
    } catch (error: any) {
      logger?.error('❌ [telegramSendMessage] Error:', error);
      return {
        success: false,
        error: `Error: ${error.message}`,
      };
    }
  },
});
