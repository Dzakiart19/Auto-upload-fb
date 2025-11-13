FROM node:20-slim

# Set working directory
WORKDIR /app

# Install FFmpeg and other system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy application code
COPY . .

# Build Mastra application
RUN npm run build

# Copy start script
COPY scripts/start-production.sh ./scripts/
RUN chmod +x ./scripts/start-production.sh

# Expose ports (8000 for Mastra, 3000 for Inngest)
EXPOSE 8000 3000

# Set environment variables - DO NOT set NODE_ENV=production
# to allow Inngest dev mode
ENV INNGEST_PORT=3000

# Start both Mastra and Inngest dev server
CMD ["./scripts/start-production.sh"]
