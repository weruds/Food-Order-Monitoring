# WhatsApp Bot

Baileys-based Node.js/TypeScript service for sending Food Order Monitoring notifications through WhatsApp.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Returns API and WhatsApp connection status |
| `POST` | `/notify-assignee` | Sends an assignment message to one person |
| `POST` | `/notify-group` | Sends the assignment list to the food committee group |
| `POST` | `/notify-distribution` | Sends the distribution-ready message to the group |

POST endpoints require an `x-api-secret` header matching `API_SECRET`.

## Requirements

- Node.js 20 or newer.
- npm, included with Node.js.
- A WhatsApp account for the bot.

## Local setup

From this directory:

```powershell
npm install
Copy-Item .env.example .env
# Edit .env and provide FOOD_GROUP_ID and API_SECRET
npm run build
npm start
```

If PowerShell cannot run `npm`, use `npm.cmd` or install/repair Node.js so `C:\Program Files\nodejs` is on `PATH`.

For development without compiling first:

```powershell
npm run dev
```

The API listens on `PORT`, then `API_PORT`, and defaults to `3333`.

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Description |
| --- | --- |
| `SESSION_DATA_PATH` | Directory where the Baileys login session is stored; defaults to `./.wwebjs_auth` |
| `FOOD_GROUP_ID` | WhatsApp group JID ending in `@g.us` |
| `API_PORT` | Local API port; defaults to `3333` |
| `API_SECRET` | Shared secret required by POST requests |

The first run prints a QR-code URL. Open it in a browser and scan it from WhatsApp. Keep `.wwebjs_auth` between restarts so the account does not need to be scanned again.

## Deployment

### Railway

The repository includes a root `Dockerfile` and `railway.toml`. Configure the Railway service to use the repository root Dockerfile, then add the environment variables in the Railway dashboard. Mount persistent storage at `/app/.wwebjs_auth` so the session survives restarts. Expose the Railway-provided `PORT`; the application already prefers it over `API_PORT`.

### Docker

From the repository root:

```powershell
docker build -t odc-whatsapp-bot .
docker run --env-file "WhatsApp Bot/.env" -p 3333:8080 odc-whatsapp-bot
```

For production, persist `/app/.wwebjs_auth` and map the published port required by the host.

## Security

- Never commit `.env` or `.wwebjs_auth`.
- Use a strong API secret and keep it synchronized with `WA_BOT_SECRET` in the dashboard.
- Restrict the API network access and replace wildcard CORS before public production use.
