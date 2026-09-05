# ── WhatsApp Bot — Dockerfile ─────────────────────────────────────────────────
# Uses a Debian-based Node image that includes the system libraries
# needed by Puppeteer/Chromium (whatsapp-web.js dependency).

FROM node:20-bullseye-slim

# Install Chromium system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install ALL dependencies (including devDependencies for TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Remove devDependencies after build to keep image lean
RUN npm prune --omit=dev

EXPOSE 3333

CMD ["node", "dist/index.js"]
