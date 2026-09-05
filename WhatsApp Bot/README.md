# WhatsApp Bot

Minimal Node.js bot that exposes an HTTP API so the Food Committee Order Monitoring dashboard can send WhatsApp messages directly.

## What it does
- `POST /notify-assignee` — sends a direct message to an assignee's phone number
- `POST /notify-group` — sends "Distribution Ready" message to your food committee WhatsApp group
- `GET /health` — check if the bot is alive and connected

## Setup

### 1. Install dependencies
```
npm install
```

### 2. Configure environment
```
cp .env.example .env
```
Fill in `.env`:
- `FOOD_GROUP_ID` — your WhatsApp group chat ID (printed in console on first run)
- `API_SECRET` — any secret string (must match `WA_BOT_SECRET` in `index.html`)

### 3. Build & run
```
npm run build
npm start
```
Scan the QR code with WhatsApp on first run. The console will print all your group IDs — copy your food committee group ID into `.env` as `FOOD_GROUP_ID`.

### 4. Getting the group ID
Run the bot and either:
- Wait for the startup log to list all groups, **or**
- Send any message in your food committee WhatsApp group — the bot will log the group ID

## Notes
- The bot must be running on the **same machine** you open the dashboard from (`localhost:3333`)
- Session is saved in `.wwebjs_auth/` — you only need to scan QR once
- To restart: `npm start` (no QR scan needed if session exists)
