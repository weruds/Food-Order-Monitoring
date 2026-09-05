# WhatsApp Bot

Minimal WhatsApp bot that exposes an HTTP API for the Food Committee Order Monitoring dashboard.  
Sends direct WhatsApp messages to assignees and group notifications via `whatsapp-web.js`.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notify-assignee` | DM a team member about their food distribution assignment |
| `POST` | `/notify-group` | Send "Food Ready" message to the food committee WhatsApp group |
| `GET`  | `/health` | Health check — returns bot connection status |

All `POST` endpoints require the `x-api-secret` header matching `API_SECRET`.

---

## Deploy to Railway (recommended)

### 1 — Push this folder to GitHub
Make sure `WhatsApp Bot/` is committed and pushed. The `.env` is gitignored — do **not** commit it.

### 2 — Create a Railway project
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repo, set the **Root Directory** to `WhatsApp Bot`
4. Railway will detect the `Dockerfile` automatically

### 3 — Set environment variables in Railway
In your Railway service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `FOOD_GROUP_ID` | `120363411910061717@g.us` |
| `API_SECRET` | `odc-seet-wa-bot-2026` |
| `API_PORT` | `3333` |
| `SESSION_DATA_PATH` | `/app/.wwebjs_auth` |

### 4 — Add a persistent volume
The WhatsApp session must survive restarts:
1. Railway service → **Volumes** → **Add Volume**
2. Mount path: `/app/.wwebjs_auth`

### 5 — Deploy and scan QR
1. Click **Deploy** — Railway builds the Docker image
2. Open **Logs** — wait for `[Auth] Scan this QR code with WhatsApp:`
3. The QR appears as ASCII art in the logs — scan it with WhatsApp
4. After scanning you'll see `[WhatsApp] Client is ready!`
5. Session is saved to the volume — you only scan once

### 6 — Get your public URL
Railway assigns a URL like:
```
https://whatsapp-bot-production-xxxx.up.railway.app
```
Copy it from **Settings → Networking → Public URL**.

### 7 — Update index.html
In `index.html`, find line:
```js
const WA_BOT_URL = 'https://whatsapp-bot-production-xxxx.up.railway.app';
```
Replace the placeholder with your actual Railway URL, then redeploy to Firebase:
```
firebase deploy
```

---

## Local development

```bash
# Install dependencies
npm install

# Copy env and fill in values
cp .env.example .env

# Run in dev mode (TypeScript, no build needed)
npm run dev

# Or build and run compiled JS
npm run build
npm start
```

The dashboard will be available at `http://localhost:3333/` when the bot is running locally.
