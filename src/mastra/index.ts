import { Mastra } from "@mastra/core";
import { MastraError } from "@mastra/core/error";
import { PinoLogger } from "@mastra/loggers";
import { LogLevel, MastraLogger } from "@mastra/core/logger";
import pino from "pino";
import { MCPServer } from "@mastra/mcp";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { sharedPostgresStorage } from "./storage";
import { inngest, inngestServe } from "./inngest";
import { facebookVideoWorkflow } from "./workflows/facebookVideoWorkflow";
import { facebookVideoAgent } from "./agents/facebookVideoAgent";
import { registerTelegramTrigger } from "../triggers/telegramTriggers";

class ProductionPinoLogger extends MastraLogger {
  protected logger: pino.Logger;

  constructor(
    options: {
      name?: string;
      level?: LogLevel;
    } = {},
  ) {
    super(options);

    this.logger = pino({
      name: options.name || "app",
      level: options.level || LogLevel.INFO,
      base: {},
      formatters: {
        level: (label: string, _number: number) => ({
          level: label,
        }),
      },
      timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  debug(message: string, args: Record<string, any> = {}): void {
    this.logger.debug(args, message);
  }

  info(message: string, args: Record<string, any> = {}): void {
    this.logger.info(args, message);
  }

  warn(message: string, args: Record<string, any> = {}): void {
    this.logger.warn(args, message);
  }

  error(message: string, args: Record<string, any> = {}): void {
    this.logger.error(args, message);
  }
}

export const mastra = new Mastra({
  storage: sharedPostgresStorage,
  // Register your workflows here
  workflows: { facebookVideoWorkflow },
  // Register your agents here
  agents: { facebookVideoAgent },
  mcpServers: {
    allTools: new MCPServer({
      name: "allTools",
      version: "1.0.0",
      tools: {},
    }),
  },
  bundler: {
    // A few dependencies are not properly picked up by
    // the bundler if they are not added directly to the
    // entrypoint.
    externals: [
      "@slack/web-api",
      "inngest",
      "inngest/hono",
      "hono",
      "hono/streaming",
    ],
    // sourcemaps are good for debugging.
    sourcemap: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    middleware: [
      async (c, next) => {
        const mastra = c.get("mastra");
        const logger = mastra?.getLogger();
        logger?.debug("[Request]", { method: c.req.method, url: c.req.url });
        try {
          await next();
        } catch (error) {
          logger?.error("[Response]", {
            method: c.req.method,
            url: c.req.url,
            error,
          });
          if (error instanceof MastraError) {
            if (error.id === "AGENT_MEMORY_MISSING_RESOURCE_ID") {
              // This is typically a non-retirable error. It means that the request was not
              // setup correctly to pass in the necessary parameters.
              throw new NonRetriableError(error.message, { cause: error });
            }
          } else if (error instanceof z.ZodError) {
            // Validation errors are never retriable.
            throw new NonRetriableError(error.message, { cause: error });
          }

          throw error;
        }
      },
    ],
    apiRoutes: [
      // ======================================================================
      // Health Check & Status Endpoints
      // ======================================================================
      {
        path: "/",
        method: "GET",
        createHandler: async () => {
          return async (c) => {
            const getPublicUrl = () => {
              // Priority 1: Custom PUBLIC_URL (untuk Termux dengan ngrok/serveo)
              if (process.env.PUBLIC_URL) {
                return process.env.PUBLIC_URL.trim();
              }
              // Priority 2: Replit environment
              if (process.env.REPLIT_DEV_DOMAIN) {
                return `https://${process.env.REPLIT_DEV_DOMAIN}`;
              }
              // Priority 3: Replit legacy
              const replSlug = process.env.REPL_SLUG;
              const replOwner = process.env.REPL_OWNER;
              if (replSlug && replOwner) {
                return `https://${replSlug}.${replOwner}.replit.dev`;
              }
              // Fallback: localhost (untuk testing lokal)
              return `http://localhost:${process.env.PORT || 5000}`;
            };
            const publicUrl = getPublicUrl();
            
            return c.json({
              status: "✅ Server Aktif",
              message: "Bot Telegram untuk Upload Video ke Facebook",
              publicUrl: publicUrl,
              webhookUrl: `${publicUrl}/webhooks/telegram/action`,
              endpoints: {
                telegram: "/webhooks/telegram/action",
                status: "/status",
                ping: "/ping",
                playground: "http://0.0.0.0:5000/",
                inngest: "/api/inngest"
              },
              instructions: `Untuk setup Telegram webhook, kunjungi:\nhttps://api.telegram.org/bot<TOKEN>/setWebhook?url=${publicUrl}/webhooks/telegram/action`
            });
          };
        },
      },
      {
        path: "/status",
        method: "GET",
        createHandler: async () => {
          return async (c) => {
            const getPublicUrl = () => {
              // Priority 1: Custom PUBLIC_URL (untuk Termux dengan ngrok/serveo)
              if (process.env.PUBLIC_URL) {
                return process.env.PUBLIC_URL.trim();
              }
              // Priority 2: Replit environment
              if (process.env.REPLIT_DEV_DOMAIN) {
                return `https://${process.env.REPLIT_DEV_DOMAIN}`;
              }
              // Priority 3: Replit legacy
              const replSlug = process.env.REPL_SLUG;
              const replOwner = process.env.REPL_OWNER;
              if (replSlug && replOwner) {
                return `https://${replSlug}.${replOwner}.replit.dev`;
              }
              // Fallback: localhost (untuk testing lokal)
              return `http://localhost:${process.env.PORT || 5000}`;
            };
            const publicUrl = getPublicUrl();
            
            return c.json({
              status: "online",
              publicUrl: publicUrl,
              webhookUrl: `${publicUrl}/webhooks/telegram/action`,
              timestamp: new Date().toISOString()
            });
          };
        },
      },
      {
        path: "/ping",
        method: "GET",
        createHandler: async () => {
          return async (c) => {
            return c.json({
              status: "pong",
              uptime: process.uptime(),
              timestamp: new Date().toISOString(),
              message: "Server is alive"
            });
          };
        },
      },
      // ======================================================================
      // Inngest Integration Endpoint
      // ======================================================================
      // This API route is used to register the Mastra workflow (inngest function) on the inngest server
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
        // The inngestServe function integrates Mastra workflows with Inngest by:
        // 1. Creating Inngest functions for each workflow with unique IDs (workflow.${workflowId})
        // 2. Setting up event handlers that:
        //    - Generate unique run IDs for each workflow execution
        //    - Create an InngestExecutionEngine to manage step execution
        //    - Handle workflow state persistence and real-time updates
        // 3. Establishing a publish-subscribe system for real-time monitoring
        //    through the workflow:${workflowId}:${runId} channel
      },

      // ======================================================================
      // Connector Webhook Triggers
      // ======================================================================
      // Register your connector webhook handlers here using the spread operator.
      // Each connector trigger should be defined in src/triggers/{connectorName}Triggers.ts
      //
      // PATTERN FOR ADDING A NEW CONNECTOR TRIGGER:
      //
      // 1. Create a trigger file: src/triggers/{connectorName}Triggers.ts
      //    (See src/triggers/exampleConnectorTrigger.ts for a complete example)
      //
      // 2. Create a workflow: src/mastra/workflows/{connectorName}Workflow.ts
      //    (See src/mastra/workflows/linearIssueWorkflow.ts for an example)
      //
      // 3. Import both in this file:
      //    ```typescript
      //    import { register{ConnectorName}Trigger } from "../triggers/{connectorName}Triggers";
      //    import { {connectorName}Workflow } from "./workflows/{connectorName}Workflow";
      //    ```
      //
      // 4. Register the trigger in the apiRoutes array below:
      //    ```typescript
      //    ...register{ConnectorName}Trigger({
      //      triggerType: "{connector}/{event.type}",
      //      handler: async (mastra, triggerInfo) => {
      //        const logger = mastra.getLogger();
      //        logger?.info("🎯 [{Connector} Trigger] Processing {event}", {
      //          // Log relevant fields from triggerInfo.params
      //        });
      //
      //        // Create a unique thread ID for this event
      //        const threadId = `{connector}-{event}-${triggerInfo.params.someUniqueId}`;
      //
      //        // Start the workflow
      //        const run = await {connectorName}Workflow.createRunAsync();
      //        return await run.start({
      //          inputData: {
      //            threadId,
      //            ...triggerInfo.params,
      //          },
      //        });
      //      }
      //    })
      //    ```
      //
      // ======================================================================
      // EXAMPLE: Linear Issue Creation Webhook
      // ======================================================================
      // Uncomment to enable Linear webhook integration:
      //
      // ...registerLinearTrigger({
      //   triggerType: "linear/issue.created",
      //   handler: async (mastra, triggerInfo) => {
      //     // Extract what you need from the full payload
      //     const data = triggerInfo.payload?.data || {};
      //     const title = data.title || "Untitled";
      //
      //     // Start your workflow
      //     const run = await exampleWorkflow.createRunAsync();
      //     return await run.start({
      //       inputData: {
      //         message: `Linear Issue: ${title}`,
      //         includeAnalysis: true,
      //       }
      //     });
      //   }
      // }),
      //
      // To activate:
      // 1. Uncomment the code above
      // 2. Import at the top: import { registerLinearTrigger } from "../triggers/exampleConnectorTrigger";
      //
      // ======================================================================

      // Add more connector triggers below using the same pattern
      // ...registerGithubTrigger({ ... }),
      // ...registerSlackTrigger({ ... }),
      // ...registerStripeWebhook({ ... }),
      
      // Telegram trigger for video upload to Facebook
      ...registerTelegramTrigger({
        triggerType: "telegram/video",
        handler: async (mastra, triggerInfo) => {
          const logger = mastra.getLogger();
          logger?.info("🎯 [Telegram Trigger] Processing video upload", {
            chatId: triggerInfo.params.chatId,
            fileId: triggerInfo.params.fileId,
          });

          const threadId = `telegram-video-${triggerInfo.params.chatId}-${Date.now()}`;

          const run = await facebookVideoWorkflow.createRunAsync();
          await run.start({
            inputData: {
              threadId,
              chatId: triggerInfo.payload.chatId,
              fileId: triggerInfo.payload.fileId,
              title: triggerInfo.payload.title,
              description: triggerInfo.payload.description,
              userName: triggerInfo.payload.userName,
            },
          });
        }
      }),
    ],
  },
  logger:
    process.env.NODE_ENV === "production"
      ? new ProductionPinoLogger({
          name: "Mastra",
          level: "info",
        })
      : new PinoLogger({
          name: "Mastra",
          level: "info",
        }),
});

/*  Sanity check 1: Throw an error if there are more than 1 workflows.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getWorkflows()).length > 1) {
  throw new Error(
    "More than 1 workflows found. Currently, more than 1 workflows are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

/*  Sanity check 2: Throw an error if there are more than 1 agents.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getAgents()).length > 1) {
  throw new Error(
    "More than 1 agents found. Currently, more than 1 agents are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

// Display public URL on startup with proper URL detection
const getPublicUrl = () => {
  // Priority 1: Custom PUBLIC_URL (untuk Termux dengan ngrok/serveo)
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.trim();
  }
  
  // Priority 2: Use REPLIT_DEV_DOMAIN if available (most reliable)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Priority 3: Build from REPL_SLUG and REPL_OWNER
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  if (replSlug && replOwner) {
    return `https://${replSlug}.${replOwner}.replit.dev`;
  }
  
  // Fallback: localhost (untuk testing lokal)
  return `http://localhost:${process.env.PORT || 5000}`;
};

const publicUrl = getPublicUrl();
const logger = mastra.getLogger();

logger?.info("🚀 ========================================");
logger?.info("🎬 Bot Telegram untuk Upload Video ke Facebook");
logger?.info("🚀 ========================================");
logger?.info(`🌍 URL Publik AKTIF: ${publicUrl}`);
logger?.info(`📡 Webhook Telegram: ${publicUrl}/webhooks/telegram/action`);
logger?.info(`📊 Status Endpoint: ${publicUrl}/status`);
logger?.info(`❤️  Keep-Alive: ${publicUrl}/ping`);
logger?.info("🚀 ========================================");
logger?.info("📝 Setup Telegram Webhook:");
logger?.info(`   https://api.telegram.org/bot<TOKEN>/setWebhook?url=${publicUrl}/webhooks/telegram/action`);
logger?.info("📝 Verifikasi Webhook:");
logger?.info(`   https://api.telegram.org/bot<TOKEN>/getWebhookInfo`);
logger?.info("🚀 ========================================");

// Auto-setup webhook if TELEGRAM_BOT_TOKEN is available and AUTO_WEBHOOK is enabled
const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
const autoWebhook = process.env.AUTO_WEBHOOK !== 'false'; // Default true, set ke 'false' untuk disable

if (telegramToken && autoWebhook && publicUrl.startsWith('http')) {
  const webhookUrl = `${publicUrl}/webhooks/telegram/action`;
  const setWebhookUrl = `https://api.telegram.org/bot${telegramToken}/setWebhook?url=${webhookUrl}`;
  
  logger?.info("🔄 Auto-setting Telegram webhook...");
  logger?.info(`   Webhook URL: ${webhookUrl}`);
  logger?.info(`   Bot Token Length: ${telegramToken.length} characters`);
  
  fetch(setWebhookUrl)
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        logger?.info("✅ Telegram webhook berhasil di-set!");
        logger?.info(`   Webhook URL: ${webhookUrl}`);
        
        // Verify webhook
        fetch(`https://api.telegram.org/bot${telegramToken}/getWebhookInfo`)
          .then(res => res.json())
          .then(info => {
            logger?.info("📊 Webhook Info:", info.result);
          })
          .catch(err => logger?.warn("⚠️  Gagal verifikasi webhook:", err.message));
      } else {
        logger?.warn("⚠️  Gagal set webhook:", data);
      }
    })
    .catch(err => {
      logger?.warn("⚠️  Gagal menghubungi Telegram API:", err.message);
      logger?.info("💡 Silakan set webhook manual dengan URL di atas");
    });
} else if (telegramToken && !autoWebhook) {
  logger?.info("⚙️  AUTO_WEBHOOK disabled. Set webhook manual jika diperlukan");
  logger?.info(`   https://api.telegram.org/bot<TOKEN>/setWebhook?url=${publicUrl}/webhooks/telegram/action`);
}
