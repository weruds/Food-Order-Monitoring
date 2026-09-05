# Root Dockerfile — builds the WhatsApp Bot (Baileys) from the subfolder
# No Chromium or Puppeteer needed — Baileys uses pure WebSocket

FROM node:20-bookworm-slim

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

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
