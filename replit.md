# Overview

This project is a TypeScript-based automation system using the Mastra framework and Inngest for durable workflows. Its primary purpose is to automate video uploading to Facebook Pages and sharing to Facebook Groups, triggered by video content received via Telegram. The system supports AI-powered agents with memory capabilities for enhanced interaction and workflow orchestration, but can also operate in a fallback mode without AI.

The application allows users to send videos through Telegram, provide a title and description/hashtags, and then automates the upload to a specified Facebook Page and subsequent sharing to pre-configured Facebook Groups. Users receive confirmation of the process via Telegram.

Key capabilities include:
- Receiving video content and metadata from Telegram.
- Automatic video format conversion using FFmpeg to ensure Facebook compatibility.
- AI-assisted processing and workflow orchestration (optional).
- Automated video upload to Facebook Pages.
- Automated sharing of uploaded videos to multiple Facebook Groups.
- Robust error handling for video uploads, including smart upload method selection (simple vs. resumable) and content-type validation.
- Automatic cleanup of temporary files to prevent disk space issues.

# User Preferences

Preferred communication style: Simple, everyday language.

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
- **Facebook Video Upload Fixes**:
    - Proper `Content-Type` and filename handling for Facebook Graph API.
    - Video metadata helper for MIME type detection and extension handling.
    - Video file validation (magic numbers) to detect corrupt files early.
    - Smart upload system automatically selects between simple upload (<20MB) and resumable upload (>=20MB) based on file size, with intelligent retry logic for transient errors.
    - Preserves original file format from Telegram.
    - Correct implementation of Facebook's resumable upload protocol, including offset management and chunk handling.
    - Automatic exchange of User Access Token for Page Access Token.
- **FFmpeg Video Conversion** (November 2025):
    - **Tool**: `ffmpegConvertVideo` - Converts videos to Facebook-compatible format (H.264/AAC) using FFmpeg.
    - **Command**: `ffmpeg -i [input] -c:v libx264 -preset fast -c:a aac -strict experimental [output]`
    - **Integration**: Workflow automatically converts all Telegram videos before uploading to Facebook, preventing "file corrupt" errors.
    - **Cleanup**: Both original and converted video files are automatically deleted after upload (success or failure) to prevent disk space issues.
    - **Logging**: Extensive logging throughout conversion process for debugging and monitoring.
    - **Error Handling**: Graceful failure with detailed error messages if conversion fails.
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