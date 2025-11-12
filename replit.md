# Overview

This project is a TypeScript-based automation system using the Mastra framework and Inngest for durable workflows. Its primary purpose is to automate **media uploads** (videos and photos) to Facebook Pages and sharing to Facebook Groups, triggered by media content received via Telegram. The system supports AI-powered agents with memory capabilities for enhanced interaction and workflow orchestration, but can also operate in a fallback mode without AI.

The application allows users to send **videos or photos** through Telegram, provide titles/captions and descriptions/hashtags, and then automates the upload to a specified Facebook Page. Videos are additionally shared to pre-configured Facebook Groups. Users receive confirmation of the process via Telegram.

Key capabilities include:
- **Media Type Support**: Handles both videos and photos from Telegram
- **Simple Caption System** (Updated November 12, 2025):
  - **Direct User Input**: Uses user's caption/description exactly as provided - NO modifications or "alay" additions
  - **Trending Hashtags**: Auto-generated hashtags (up to 15) based on category, title keywords, and global trends
  - **Category Detection**: Automatically detects content category (meme, gaming, tutorial, etc.) for optimized hashtags
  - **Multi-language Support**: Indonesian and English hashtag generation
  - **Clean Format**: User input + hashtags only - simple and straightforward
- **Video Processing**: 
  - Automatic format conversion using FFmpeg to ensure Facebook compatibility
  - Smart upload method selection (simple vs. resumable based on file size)
  - Automated sharing to multiple Facebook Groups after upload
- **Photo Processing**:
  - Direct upload to Facebook Page (no conversion needed)
  - Support for JPEG, PNG, GIF, WebP, BMP formats
  - Validation for file size (< 8MB) and format integrity
- **AI-Assisted Processing**: Optional workflow orchestration using OpenAI models (with fallback mode)
- **Robust Error Handling**: 
  - Automatic retry with exponential backoff for transient errors (timeouts, network issues)
  - Network-level error handling with 120s timeout protection
  - Content-type and file integrity validation
- **Automatic Cleanup**: Deletes temporary files after upload to prevent disk space issues

# User Preferences

Preferred communication style: Simple, everyday language.

**Caption Style Preference** (November 12, 2025):
- User prefers SIMPLE captions - use their input directly without modifications
- NO "alay" style with excessive emojis, call-to-actions, or engagement footers
- NO phrases like: "Cek ini!", "Follow untuk konten lebih seru!", "Tag teman kamu!", "Double tap!", etc.
- Format: Just user's title/description + hashtags (hashtags are OK)
- Keep it clean and straightforward - let the content speak for itself

# System Architecture

## Core Framework
- **Mastra Framework**: Orchestrates agents, tools, and workflows.
- **Inngest Integration**: Provides durable execution, step memoization, and reliable recovery.
- **TypeScript/Node.js**: Modern ES2022 modules with strict type checking.

## Agent Architecture
- **AI Agents**: Utilize OpenAI models (GPT-4o/GPT-4o-mini) via AI SDK for autonomous reasoning.
- **Memory System**: Includes working memory, conversation history, and semantic recall for long-term context.
- **Agent Networks**: Routing agents coordinate specialized agents for complex tasks.
- **Backward Compatibility**: `generateLegacy()` for Replit Playground UI integration.

## Workflow Engine
- **Graph-Based Workflows**: Explicit control flow with steps, branching, and parallel execution.
- **Suspend/Resume**: Human-in-the-loop support with state persistence via snapshots.
- **Streaming Support**: Real-time incremental responses.
- **Error Handling**: Configurable retry policies.

## Tool System
- **Structured Tools**: Type-safe functions with Zod schema validation.
- **Tool Streaming**: Incremental results during execution.

## Trigger System
- **Webhook Handlers**: Supports Telegram and custom connectors for event processing.
- **State Management**: Tracks conversation flow for multi-turn interactions.

## Memory and Storage
- **Storage Adapters**: Pluggable backends including LibSQL, PostgreSQL (with pgvector), and Upstash Redis.
- **Thread/Resource Scoping**: Isolates memory per conversation or persists across user sessions.
- **Snapshot Persistence**: Saves workflow state for suspend/resume.

## UI/UX Decisions
- **Telegram Bot Interface**: Primary user interaction channel for video submission and updates.
- **Mastra Playground UI**: Visualizes workflow graphs and nodes for development.

## Technical Implementations
- **Simple Caption & Hashtag System** (Updated November 12, 2025):
    - **Caption Strategy**: Uses user input DIRECTLY - NO auto-generated "alay" captions with emojis/CTAs
    - **Tool**: `generateTrendingHashtags` - Generates trending hashtags for maximum discoverability
    - **Categories Supported**: meme, comedy, tutorial, motivasi, gaming, lifestyle, teknologi, kuliner, travel, music, sports, **brainrot**, **absurd**, **random**, **perfectcut**, general
    - **Niche Focus**: **Optimized for Indonesian meme absurd/brainrot/random niche**
    - **Hashtag Sources**: Category-specific niche tags (ID: #memeindo, #memeabsurd, #brainrot, #humorabsurd, #randomvideo, #perfectcut, #videolucu; EN: #absurdhumor, #brainrotmemes, #randomvideos), title keywords, minimal viral hashtags
    - **Max Hashtags**: Configurable (default 15)
    - **Generic Tags Removed**: Eliminated generic viral hashtags (#viral, #trending, #fyp, #foryou, #foryoupage, #explore, #instagram, #facebook) in favor of niche-specific tags
    - **Category Detection**: Automatic keyword-based detection for all 15 categories including new niche categories
    - **Integration**: Hashtags automatically applied to all video/photo uploads
    - **Format**: User caption + Generated hashtags (clean and simple)
- **Media Type Branching** (November 2025):
    - **Unified Workflow**: Single workflow handles both videos and photos with intelligent branching
    - **Video Flow**: download → FFmpeg convert → upload → share to groups → notify
    - **Photo Flow**: download → upload → notify (skips conversion and group sharing)
    - **Backwards Compatible**: Maintains existing video workflow IDs and behavior
- **Facebook Video Upload**:
    - Proper `Content-Type` and filename handling for Facebook Graph API.
    - Video metadata helper for MIME type detection and extension handling.
    - Video file validation (magic numbers) to detect corrupt files early.
    - Smart upload system automatically selects between simple upload (<20MB) and resumable upload (>=20MB) based on file size.
    - Automatic exchange of User Access Token for Page Access Token.
    - **Enhanced Retry Logic** (November 2025):
      - Automatic retry with exponential backoff (2s, 4s, 8s delays) for transient errors
      - Network-level error handling (connection timeouts, TLS errors, disconnects)
      - 120-second timeout protection using AbortController
      - Categorized error types: NETWORK, TIMEOUT, API, UNKNOWN
      - Structured error responses with detailed debugging information
- **Facebook Photo Upload** (November 2025):
    - **Tool**: `facebookUploadPhoto` - Uploads photos directly to Facebook Page
    - **Validation**: File size < 8MB, MIME type detection (JPEG/PNG/GIF/WebP/BMP)
    - **Magic Number Validation**: Detects corrupt or invalid image files before upload
    - **API Integration**: Facebook Graph API POST /{page-id}/photos endpoint
    - **Features**: Caption support, published flag, returns photo URL and post ID
- **FFmpeg Video Conversion** (November 2025):
    - **Tool**: `ffmpegConvertVideo` - Converts videos to Facebook-compatible format (H.264/AAC)
    - **Optimized Parameters** (Facebook-recommended):
      - Profile: H.264 High (`-profile:v high -level 4.0`)
      - Pixel format: YUV420p (`-pix_fmt yuv420p`) for maximum compatibility
      - Quality: CRF 23 (`-crf 23`) for good quality
      - Resolution: Max 1080p with aspect ratio preservation (`-vf scale=-2:1080`)
      - Frame rate: 30 fps (`-r 30`)
      - Bitrate control: Max 4Mbps (`-maxrate 4M -bufsize 8M`)
      - Audio: 128kbps AAC at 44.1kHz (`-b:a 128k -ar 44100`)
      - Fast start: Progressive upload support (`-movflags +faststart`)
    - **Integration**: Workflow automatically converts all Telegram videos before uploading
    - **Cleanup**: Both original and converted video files are automatically deleted after upload
    - **Logging**: Extensive logging throughout conversion process
- **Telegram Media Handling**:
    - **Video Download**: `telegramDownloadVideo` - Downloads videos to `/tmp/telegram_videos/`
    - **Photo Download**: `telegramDownloadPhoto` - Downloads photos to `/tmp/telegram_photos/`
    - **Format Preservation**: Maintains original file extensions from Telegram
    - **Size Validation**: Checks file integrity and minimum size requirements
- **Instagram & TikTok Download Integration** (Updated November 12, 2025):
    - **Instagram Download**: `instagramDownload` - Uses `insta-fetcher` library v1.3.35
      - **Data Structure Fix**: Updated to use `result.links[]` array instead of deprecated `url_list` property
      - **Supported Content**: Video posts, reels, and stories
      - **Format**: Returns video URL with dimensions and file info
    - **TikTok Download**: `tiktokDownload` - Uses `@tobyg74/tiktok-api-dl` library v1.3.7
      - **API Version**: Targets v2 API (more reliable than v3 which has frequent 404 errors)
      - **Fallback Support**: Gracefully falls back to v3-style fields if v2 unavailable
      - **Extraction Logic**: `result.video.playAddr[0]` (v2) or `result.videoHD/videoSD` (v3)
      - **Short URL Support**: Handles both full TikTok URLs and short links
    - **Integration**: Both tools automatically download media and pass to Facebook upload workflow
- **Facebook Upload Optimizations** (Fixed November 12, 2025):
    - **Resumable Upload Finalization Fix**:
      - **Issue**: "Reduce the amount of data" error when title/description sent via URL query params
      - **Solution**: Send metadata via POST body using FormData instead of URL params
      - **Implementation**: Uses axios with FormData for reliable Node.js streaming support
      - **Benefits**: Supports long captions/descriptions (300+ chars) with hashtags without URL length limits
    - **Node.js Compatibility**: Switched from `fetch` to `axios` for FormData streaming to avoid "duplex: half" requirement in Node ≥18
- **AI Fallback Mechanism**: The system can operate without an OpenAI API key, directly executing tools. This is configurable via `AI_FALLBACK_ENABLED`.

## Design Patterns
- **Provider-Agnostic Models**: Unified interface for multiple AI providers.
- **Model Fallbacks**: Automatic provider switching on failures.
- **Processor Pipeline**: Input/output processors for guardrails and content transformation.
- **Zod Validation**: Schema-first design for data structures.

# External Dependencies

## AI Services (Optional)
- **OpenAI**: Primary LLM provider if `OPENAI_API_KEY` is present.
- **OpenRouter**: Alternative AI provider gateway via `@openrouter/ai-sdk-provider`.

## Messaging Platforms
- **Telegram Bot API**: For video reception and user interaction (`TELEGRAM_BOT_TOKEN`).

## Social Media APIs
- **Facebook Graph API**: For video uploads to Pages and sharing to Groups. Requires `FB_USER_ACCESS_TOKEN` (exchanged for Page Token) and `FB_PAGE_ID`.

## Database and Storage
- **LibSQL**: Embedded/local database.
- **PostgreSQL**: Optional storage backend with `pgvector` extension.
- **Upstash**: Redis and Vector database cloud service.

## Workflow Infrastructure
- **Inngest**: Serverless workflow orchestration.

## Third-Party Integrations
- **MCP (Model Context Protocol)**: Extensible tool integration.
- **Form Data Handling**: For multipart form uploads.
- **FFmpeg**: Video transcoding and format conversion (system dependency).

## Configuration Files
- `.env`: Environment variables for API keys and tokens.
- `groups.txt`: Stores Facebook Group IDs for automated sharing.