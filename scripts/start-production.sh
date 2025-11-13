#!/bin/bash
set -e

echo "🚀 Starting Inngest Dev Server..."
# Start Inngest dev server in background with auto-discovery
npx inngest-cli dev --host 0.0.0.0 --port 3000 &
INNGEST_PID=$!

# Wait longer for Inngest to be fully ready
echo "⏳ Waiting for Inngest server to be ready..."
sleep 10

echo "🎬 Starting Mastra server..."
# Start Mastra (will connect to local Inngest and auto-register functions)
npx mastra start &
MASTRA_PID=$!

# Wait additional time for Mastra to register with Inngest
echo "⏳ Waiting for Mastra to register with Inngest..."
sleep 5

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $INNGEST_PID 2>/dev/null || true
    kill $MASTRA_PID 2>/dev/null || true
    wait $INNGEST_PID 2>/dev/null || true
    wait $MASTRA_PID 2>/dev/null || true
    exit 0
}

# Set trap for cleanup on SIGTERM and SIGINT
trap cleanup SIGTERM SIGINT

echo "✅ Services started successfully!"
echo "📊 Inngest PID: $INNGEST_PID"
echo "📊 Mastra PID: $MASTRA_PID"
echo "⏳ Waiting for processes... (Press Ctrl+C to stop)"

# Wait for both processes to complete
# This will keep the container running
wait
