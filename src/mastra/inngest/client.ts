import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

// Always use self-hosted Inngest dev server (no cloud dependency)
// This works in both development and production without needing INNGEST_EVENT_KEY
export const inngest = new Inngest({
  id: "mastra-telegram-bot",
  name: "Telegram to Facebook Bot",
  baseUrl: process.env.INNGEST_BASE_URL || "http://localhost:3000",
  isDev: true,
  middleware: [realtimeMiddleware()],
});
