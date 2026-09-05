# Root Dockerfile — builds the WhatsApp Bot from the subfolder
# Used by Railway since it deploys from repo root

FROM node:20-bullseye-slim

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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy bot source from subfolder
COPY "WhatsApp Bot/package*.json" ./
RUN npm ci

COPY "WhatsApp Bot/tsconfig.json" ./
COPY "WhatsApp Bot/src/" ./src/
RUN npm run build

RUN npm prune --omit=dev

VOLUME ["/app/.wwebjs_auth"]
EXPOSE 3333
CMD ["node", "dist/index.js"]
