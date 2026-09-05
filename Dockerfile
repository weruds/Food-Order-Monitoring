# Root Dockerfile — builds the WhatsApp Bot from the subfolder
# Used by Railway since it deploys from repo root

FROM node:20-bookworm-slim

# Install Chromium, Xvfb (virtual display), and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    xvfb \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip bundled Chromium and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# Suppress "Can't open display" by pointing to Xvfb
ENV DISPLAY=:99
# Hardcode port so Railway proxy knows where to route traffic
ENV PORT=8080

WORKDIR /app

# Install ALL deps (devDeps needed for TypeScript build)
COPY "WhatsApp Bot/package*.json" ./
RUN npm ci

# Compile TypeScript → dist/
COPY "WhatsApp Bot/tsconfig.json" ./
COPY "WhatsApp Bot/src/" ./src/
RUN npm run build

# Drop devDependencies to keep image lean
RUN npm prune --omit=dev

EXPOSE 3333
# Start Xvfb virtual display then launch the bot
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 -nolisten tcp & sleep 1 && node dist/index.js"]
