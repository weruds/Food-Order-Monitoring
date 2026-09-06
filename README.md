# ODC SEET Food Order Monitoring

A browser-based food order monitoring dashboard with Firebase real-time storage and an optional Baileys WhatsApp notification service.

## What is included

- `index.html` — the complete dashboard UI and browser-side logic.
- `WhatsApp Bot/` — the Node.js/TypeScript WhatsApp notification API.
- `firestore.rules` — Firestore rules for the planner and survey documents.
- `firebase.json` — Firebase Hosting configuration.
- `Dockerfile` and `railway.toml` — container deployment configuration for the WhatsApp bot.

The dashboard does not require npm or a build step. The WhatsApp bot is a separate service and does require Node.js/npm, Docker, or a Node-compatible hosting provider.

## Dashboard setup

### Requirements

- A modern browser.
- A Firebase project with Firestore enabled.
- Firebase configuration embedded in `index.html`.

### Run locally

Open `index.html` directly, or serve the project with any static web server. The dashboard stores a local cache in the browser and synchronizes the main state document with Firestore.

### Firebase data

The dashboard uses:

- Collection: `planner`
- Document: `engagement_planner`
- Survey document: `survey/engagement_survey`
- Browser cache key: `engage_planner_v1`

The Firebase project configuration is defined near the top of `index.html` in `FB_FIRESTORE_CONFIG`.

### Firestore rules

The current rules are intentionally open for this private internal tool. Review and replace them with authenticated rules before exposing the application publicly.

## WhatsApp notifications

The dashboard calls the bot using `WA_BOT_URL` and `WA_BOT_SECRET` in `index.html`. The bot exposes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Report API and WhatsApp connection status |
| `POST` | `/notify-assignee` | Notify one assignee |
| `POST` | `/notify-group` | Send group assignments |
| `POST` | `/notify-distribution` | Send the distribution-ready message |

POST requests require the `x-api-secret` header.

The dashboard and bot must be network-accessible to each other. If the dashboard is hosted over HTTPS, use an HTTPS bot URL; browsers block calls from an HTTPS page to an HTTP API as mixed content.

See [`WhatsApp Bot/README.md`](WhatsApp%20Bot/README.md) for installation, environment variables, QR login, and deployment instructions.

## Deploy the dashboard to Firebase Hosting

From the repository root:

```powershell
firebase login
firebase use seet-order-management
firebase deploy --only hosting,firestore
```

The configured Firebase Hosting public directory is the repository root, so `index.html` is deployed directly. Do not deploy `node_modules`, `.env`, or the WhatsApp session directory.

## Deploy the WhatsApp bot

The bot can run locally:

```powershell
cd "WhatsApp Bot"
npm install
npm run build
npm start
```

It can also be deployed with the included Docker configuration or to Railway. Keep `WhatsApp Bot/.env` and `.wwebjs_auth/` private; they are local credentials and are excluded by `.gitignore`.

## Security notes

- Never commit `.env` or WhatsApp session files.
- Replace the sample API secret before deployment.
- Restrict Firestore rules and CORS before public production use.
- Treat the Firebase web configuration as public client configuration, but protect Firestore data with rules.
