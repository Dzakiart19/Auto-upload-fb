FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy application code
COPY . .

# Build Mastra application
RUN npm run build

# Expose port (Koyeb will set PORT via env var)
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=production

# Start command
CMD ["npx", "mastra", "start"]
