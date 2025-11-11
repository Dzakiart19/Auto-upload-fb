# Overview

This is a TypeScript-based automation project built with Mastra framework and Inngest for durable workflow execution. The application integrates with Telegram and Facebook APIs to automate video uploading and sharing workflows. It supports AI-powered agents with memory capabilities, workflow orchestration, and webhook-based triggers for third-party services.

The system is designed to receive video content through Telegram, process it with AI assistance, upload to Facebook Pages, and automatically share to multiple Facebook Groups.

## Bot Telegram untuk Upload Video ke Facebook

Bot ini memungkinkan pengguna untuk:
1. Mengirim video melalui Telegram
2. Memberikan judul dan deskripsi/hashtag
3. Otomatis upload ke Facebook Page
4. Otomatis share ke semua Facebook Groups yang terdaftar
5. Menerima konfirmasi hasil melalui Telegram

### URL Publik & Webhook Setup:

**URL Publik Server (GRATIS & AKTIF):**
- Public URL: `https://fc29960b-e4e3-4b9b-8c10-ae56d2cc19bf-00-30plge0szoe05.pike.replit.dev`
- Status: `https://fc29960b-e4e3-4b9b-8c10-ae56d2cc19bf-00-30plge0szoe05.pike.replit.dev/status`
- Keep-Alive: `https://fc29960b-e4e3-4b9b-8c10-ae56d2cc19bf-00-30plge0szoe05.pike.replit.dev/ping`
- Webhook Telegram: `https://fc29960b-e4e3-4b9b-8c10-ae56d2cc19bf-00-30plge0szoe05.pike.replit.dev/webhooks/telegram/action`

**Status Webhook:**
✅ **WEBHOOK SUDAH TERSET OTOMATIS!**

Server secara otomatis mengatur webhook Telegram saat startup. Tidak perlu setup manual!

**Cara Verifikasi Webhook:**
Cek apakah webhook sudah terset dengan benar:
```bash
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Cara Setup Manual (jika diperlukan):**
Jika webhook belum terset, jalankan:
```bash
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://fc29960b-e4e3-4b9b-8c10-ae56d2cc19bf-00-30plge0szoe05.pike.replit.dev/webhooks/telegram/action
```

### Cara Penggunaan Bot:
1. Kirim `/start` ke bot Telegram
2. Kirim video yang ingin diupload
3. Masukkan judul video
4. Masukkan deskripsi/hashtag
5. Bot akan otomatis memproses dan mengirim konfirmasi

### Konfigurasi:
- Tambahkan Facebook Group IDs di file `groups.txt` (satu ID per baris)
- Pastikan semua environment variables sudah diisi (lihat bagian External Dependencies)
- URL `.replit.dev` adalah URL gratis yang aktif saat aplikasi running
- URL `.replit.app` memerlukan deployment berbayar (tidak diperlukan untuk bot ini)

### Mode AI Fallback (PENTING):

**Bot ini bisa berjalan dengan atau tanpa OpenAI API!**

**Mode Operasi:**
1. **AI Mode** (jika OPENAI_API_KEY tersedia dan valid):
   - Bot menggunakan AI agent untuk mengkoordinasi proses upload
   - AI agent secara otomatis memanggil tools yang diperlukan
   - Memberikan respons yang lebih natural dan fleksibel

2. **Fallback Mode** (jika OPENAI_API_KEY tidak ada/invalid):
   - Bot langsung menjalankan tools tanpa AI
   - Menggunakan judul & deskripsi dari user tanpa modifikasi
   - Tetap berfungsi 100% untuk upload video!
   - Tidak ada crash atau error "Incorrect API key"

**Environment Variable:**
```bash
# Set ke 'true' untuk selalu gunakan mode fallback (tanpa AI)
# Set ke 'false' atau hapus untuk gunakan AI jika tersedia
AI_FALLBACK_ENABLED=true
```

**Log Status:**
Saat workflow berjalan, cek log untuk melihat mode yang aktif:
```
[AI] Mode: AI ACTIVE / FALLBACK (Direct Tools)
[AI] OpenAI Key: Present / Missing
[AI] Fallback Enabled: true / false
```

**Upload Status:**
```
[Upload] Status: 
  📥 Download video: SUKSES/GAGAL
  📤 Upload ke Facebook: SUKSES/GAGAL
  📢 Share ke grup: SUKSES/GAGAL
```

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Mastra Framework**: Primary orchestration layer for agents, tools, and workflows
- **Inngest Integration**: Provides durable execution and step memoization for workflows, ensuring reliable recovery from failures
- **TypeScript/Node.js**: Modern ES2022 modules with strict type checking

## Agent Architecture
- **AI Agents**: Autonomous reasoning units using OpenAI GPT-4o/GPT-4o-mini models via AI SDK
- **Memory System**: Multi-tier context management including:
  - Working memory for persistent state
  - Conversation history for recent interactions
  - Semantic recall using vector embeddings for long-term context
- **Agent Networks**: Routing agents coordinate multiple specialized agents for complex tasks
- **Backward Compatibility**: Uses `generateLegacy()` for Replit Playground UI integration

## Workflow Engine
- **Graph-Based Workflows**: Explicit control flow with steps, branching, and parallel execution
- **Suspend/Resume**: Human-in-the-loop patterns with state persistence via snapshots
- **Streaming Support**: Real-time incremental responses from agents and workflows
- **Error Handling**: Configurable retry policies at workflow and step levels

## Tool System
- **Structured Tools**: Type-safe functions with Zod schema validation for inputs/outputs
- **Tool Streaming**: Incremental results during execution
- **Integration Points**: Tools callable from agents, workflows, and other tools

## Trigger System
- **Webhook Handlers**: Support for Telegram, Slack, Linear, and custom connectors
- **Event Processing**: Validates and routes incoming webhook payloads
- **State Management**: Conversation flow tracking for multi-turn interactions (e.g., video upload flow)

## Memory and Storage
- **Storage Adapters**: Pluggable backends including:
  - LibSQL for local/embedded databases
  - PostgreSQL with pgvector extension
  - Upstash Redis with vector capabilities
- **Thread/Resource Scoping**: Isolates memory per conversation or persists across user sessions
- **Snapshot Persistence**: Workflow state saved for suspend/resume operations

## Facebook Integration
- **Video Upload**: Graph API integration for uploading videos to Facebook Pages
- **Group Sharing**: Automated post distribution to multiple groups from `groups.txt`
- **Token Management**: Uses PAGE_ACCESS_TOKEN for API authentication

## Telegram Bot
- **Video Processing**: Accepts video files from users
- **Interactive Flow**: Multi-step conversation for collecting title and description
- **State Tracking**: Manages user conversation state between video upload stages

## Development Tools
- **Mastra Playground UI**: Visual workflow graph and node inspection (requires `generateLegacy()` usage)
- **Hot Reload**: SSE-based automatic refresh during development
- **TypeScript Tooling**: Prettier formatting, type checking via `tsc`

## Design Patterns
- **Provider-Agnostic Models**: Unified interface across 47+ AI providers (OpenAI, Anthropic, Google, etc.)
- **Model Fallbacks**: Automatic provider switching on failures
- **Processor Pipeline**: Input/output processors for guardrails, moderation, and content transformation
- **Zod Validation**: Schema-first design for all data structures

# External Dependencies

## AI Services (OPTIONAL)
- **OpenAI**: Primary LLM provider (optional - requires `OPENAI_API_KEY`)
  - Jika tersedia: bot menggunakan AI agent untuk koordinasi
  - Jika tidak tersedia: bot tetap berfungsi dengan mode fallback (direct tools)
- **OpenRouter**: Alternative AI provider gateway (via `@openrouter/ai-sdk-provider`)
- **Model Support**: 803 models across 47 providers via Mastra's unified router
- **AI_FALLBACK_ENABLED**: Environment variable untuk kontrol mode AI (default: false)
  - Set `true` untuk paksa gunakan mode non-AI
  - Set `false` atau hapus untuk gunakan AI jika API key tersedia

## Messaging Platforms
- **Telegram Bot API**: Video reception and user interaction (requires `TELEGRAM_BOT_TOKEN`)
- **Slack Web API**: Optional integration via `@slack/web-api`

## Social Media APIs
- **Facebook Graph API**: 
  - Video upload endpoint: `graph-video.facebook.com/v19.0/{PAGE_ID}/videos`
  - Group sharing endpoint: `graph.facebook.com/v19.0/{GROUP_ID}/feed`
  - Requires `FB_PAGE_ACCESS_TOKEN` and `FB_PAGE_ID`

## Database and Storage
- **LibSQL**: Embedded/local database with vector search capabilities
- **PostgreSQL**: Optional storage backend with pgvector extension (requires `DATABASE_URL`)
- **Upstash**: Redis and Vector database cloud service (requires REST URLs and tokens)

## Workflow Infrastructure
- **Inngest**: Serverless workflow orchestration and durability
- **Inngest Realtime**: Live execution monitoring via `@inngest/realtime`

## Development Infrastructure
- **Pino**: Structured logging with JSON output
- **tsx**: TypeScript execution for development
- **Exa**: Search API integration (requires `exa-js`)

## Third-Party Integrations
- **MCP (Model Context Protocol)**: Extensible tool integration via `@mastra/mcp`
- **Form Data Handling**: Multipart form uploads for video files

## Configuration Files
- `.env`: Environment variables for API keys and tokens
- `groups.txt`: Line-separated Facebook Group IDs for automated sharing
- `tsconfig.json`: ES2022 target with bundler module resolution