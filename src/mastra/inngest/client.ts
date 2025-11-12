import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

// Use self-hosted Inngest for both dev and production (no cloud dependency)
// This avoids needing INNGEST_EVENT_KEY
const isDev = process.env.NODE_ENV !== "production";

export const inngest = new Inngest({
  id: "mastra-telegram-bot",
  name: "Telegram to Facebook Bot",
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: isDev,
  ...(isDev && { middleware: [realtimeMiddleware()] }),
});
