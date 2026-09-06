# ODC SEET Food Order Monitoring

## 1. Purpose

ODC SEET Food Order Monitoring is a browser-based dashboard for organizing food orders, monitoring survey responses, assigning distribution responsibilities, and coordinating Food Committee schedules.

The project has two separate parts:

1. **Dashboard** — a static `index.html` application served by Firebase Hosting.
2. **WhatsApp Bot** — an optional Node.js/TypeScript service that sends assignment and distribution notifications through WhatsApp using Baileys.

The dashboard can open without Node.js or npm. Node.js/npm is required only for the WhatsApp Bot or for Firebase CLI deployment commands.

## Technology stack

### Dashboard

- **HTML5** — page structure and forms.
- **CSS3** — responsive layout, theming, and dashboard styling.
- **Vanilla JavaScript** — single-page dashboard behavior without a frontend framework or bundler.
- **Firebase JavaScript SDK** — browser integration with Firebase.
- **Cloud Firestore** — real-time persistence and synchronization of planner and survey data.
- **Firebase Hosting** — static hosting for the dashboard.
- **Browser localStorage** — local/offline cache for dashboard state and schedule-card image data.
- **Monday.com GraphQL API** — food-order synchronization.
- **Chart.js** — dashboard charts.
- **html2canvas** — schedule-card image export.

### WhatsApp Bot

- **Node.js 20+** — server runtime.
- **TypeScript** — bot source language with strict compilation through `tsc`.
- **Express** — HTTP API server.
- **Baileys (`@whiskeysockets/baileys`)** — WhatsApp WebSocket connection and messaging.
- **dotenv** — environment-variable configuration.
- **Pino** — logging used by the WhatsApp client.
- **npm** — dependency and script management.

### Deployment and infrastructure

- **Docker** — optional container deployment for the WhatsApp Bot.
- **Railway** — optional bot hosting platform.
- **Firebase CLI** — Firebase Hosting and Firestore deployment.
- **GitHub Actions** — optional automated Firebase deployment workflow.

---

## 2. Main capabilities

### Monitoring

- **Survey Results** — displays food-order information synchronized from Monday.com.
- **Food Orders Monitor** — displays food orders by activity, meal, service line, and selected food option.
- **People** — maintains the employee/participant list used by assignments.
- **Food Committee Assignments** — shows which Food Committee members are responsible for distribution and which orders belong to each person.
- **WhatsApp notifications** — sends assignment lists, individual assignee messages, and a distribution-ready message when the bot is available.

### Planning and coordination

- **Food Committee Schedule** — maintains the Wednesday Free Lunch group queue and supports manual or randomized group creation.
- **Full Overview** — summarizes the selected activity, attendees, venue, committee, games, bed plans, car plans, meals, grocery items, schedule, and expenses.
- **Activities** — supports multiple activities and stores activity-specific planning data.
- **Locations** — records venues and location details.
- **Car Seat Plan** — assigns people to vehicle seats.
- **Bed Plan** — assigns people to rooms and beds.
- **Engagement Games** — stores planned games and materials.
- **Organizing Committee** — stores committee members and their roles.
- **Grocery List** — tracks grocery items and completion state.
- **Meal Plan** — plans meals by day and meal type.
- **Expenses** — records spending and budget information.

### Surveys

The page contains two browser forms:

- A feedback survey for rating the planner and requesting improvements.
- An initial planning survey for role, availability, activity preferences, schedule, budget, dietary restrictions, name, and suggestions.

Survey responses are saved locally and, when Firebase is connected, written to Firestore collections.

---

## 3. Architecture

```text
Browser
  │
  ├── index.html
  │     ├── HTML layout and modal forms
  │     ├── CSS styles and responsive layout
  │     ├── Firebase browser SDK
  │     ├── Firestore synchronization
  │     ├── localStorage offline cache
  │     ├── Monday.com GraphQL synchronization
  │     └── WhatsApp Bot HTTP calls
  │
  ├── Firebase Hosting
  │     └── Serves index.html and 404.html
  │
  ├── Cloud Firestore
  │     ├── planner/engagement_planner
  │     ├── survey/engagement_survey
  │     ├── survey_responses/{auto-id}
  │     └── initial_survey_responses/{auto-id}
  │
  └── WhatsApp Bot (optional)
        ├── Express HTTP API
        ├── Baileys WhatsApp connection
        └── persistent .wwebjs_auth session directory
```

### Dashboard execution model

`index.html` is a single-page application. There is no frontend build tool, bundler, package manager, or local frontend server requirement.

When the page loads, it:

1. Reads the browser's local state from `localStorage`.
2. Renders the interface immediately using that cached state.
3. Initializes Firebase Firestore.
4. Subscribes to `planner/engagement_planner` with an `onSnapshot` listener.
5. Merges remote state into the page whenever Firestore changes.
6. Writes user changes to both localStorage and Firestore.

Large schedule-card images are kept in localStorage instead of the Firestore document because Firestore documents have size limits.

### WhatsApp execution model

The bot is independent of Firebase and the browser:

1. `src/index.ts` loads environment variables and opens a Baileys connection.
2. Baileys stores login credentials in `.wwebjs_auth`.
3. `src/api.ts` starts an Express server.
4. The dashboard sends authenticated HTTP requests to the bot.
5. The bot validates the request, checks the WhatsApp connection, and sends the message.

The bot does not use Puppeteer, Chromium, or `whatsapp-web.js`; it uses Baileys over WebSocket.

---

## 4. Repository structure

```text
ODC SEET Food Order Monitoring/
├── index.html                         # Complete dashboard application
├── README.md                          # This documentation
├── 404.html                           # Firebase Hosting fallback page
├── firebase.json                      # Firebase Hosting and Firestore CLI config
├── .firebaserc                        # Firebase project selection
├── firestore.rules                    # Firestore access rules
├── Dockerfile                         # Root Docker build for the WhatsApp bot
├── railway.toml                       # Railway deployment settings
├── .github/workflows/                 # Optional Firebase GitHub Actions
└── WhatsApp Bot/
    ├── src/index.ts                   # WhatsApp connection and session handling
    ├── src/api.ts                     # Express endpoints and authentication
    ├── package.json                   # npm scripts and dependencies
    ├── package-lock.json              # Locked dependency versions
    ├── tsconfig.json                  # TypeScript compiler settings
    ├── .env.example                   # Environment variable template
    ├── Dockerfile                     # Standalone bot image
    └── README.md                      # Bot-specific instructions
```

The following are intentionally not committed:

- `node_modules/` — installed dependencies.
- `dist/` — generated TypeScript output.
- `.env` — secrets and machine-specific settings.
- `.wwebjs_auth/` — WhatsApp login credentials.
- `.firebase/hosting..cache` — Firebase CLI cache.

---

## 5. Requirements

### To open the dashboard

- Chrome, Edge, Firefox, or another modern browser.
- Internet access if Firebase, Monday.com, or the WhatsApp Bot is required.

### To run the WhatsApp Bot locally

- Windows, Linux, or macOS.
- Node.js 20 or newer. Node.js includes npm.
- A WhatsApp account that can be used for the bot.
- Access to the Food Committee WhatsApp group.
- A configured `.env` file.

### To deploy the dashboard

- Node.js/npm if installing Firebase CLI through npm, or an already installed Firebase CLI.
- Firebase CLI authentication.
- Access to the Firebase project `seet-order-management`.

### To deploy the bot with Docker

- Docker Desktop on Windows or Docker Engine on Linux.
- Persistent storage for `.wwebjs_auth`.

---

## 6. Run the dashboard locally

The dashboard can be opened directly:

```powershell
Start-Process .\index.html
```

You may also use a static server. For example, if Python is installed:

```powershell
python -m http.server 5500
```

Then open `http://localhost:5500`.

Opening the file directly is enough for local state, but a local HTTP server is usually better for testing browser networking, Firebase behavior, and calls to the WhatsApp Bot.

---

## 7. Firebase configuration

The Firebase browser configuration is embedded in `index.html` in `FB_FIRESTORE_CONFIG`. It points to the `seet-order-management` project.

The dashboard uses these Firestore locations:

| Location | Use |
| --- | --- |
| `planner/engagement_planner` | Main dashboard state |
| `survey/engagement_survey` | Survey/order synchronization document used by the dashboard |
| `survey_responses/{auto-id}` | Planner feedback survey responses |
| `initial_survey_responses/{auto-id}` | Initial planning survey responses |

The dashboard also uses these browser storage keys:

| Key | Use |
| --- | --- |
| `engage_planner_v1` | Offline dashboard state |
| `engage_images_v1` | Schedule-card image and palette data |
| `survey_seen` | Feedback survey viewed flag |
| `engage_initial_survey_v1` | Initial survey local responses |
| `initial_survey_seen` | Initial survey viewed flag |

### Firestore rules warning

The current [`firestore.rules`](firestore.rules) allows unrestricted reads and writes to the `planner` and `survey` paths, and the survey response collections may also be written by the browser code. This is acceptable only for a trusted internal prototype. Before public production use, add Firebase Authentication and restrictive rules.

---

## 8. Monday.com synchronization

The Survey Results page has a **Sync from Monday** action. It sends a GraphQL request from the browser to `https://api.monday.com/v2`.

The dashboard currently contains:

- A Monday.com API token.
- A board ID.
- The column IDs used for email, service line, meal, dish, vegetable, side dish, and dessert.

The synchronization process:

1. Requests up to 500 items from the configured board.
2. Reads the item name and configured column values.
3. Builds a readable food option label.
4. Stores the resulting food orders in the current activity.
5. Saves the activity to localStorage and Firestore.
6. Renders the updated order and assignment views.

### Security warning

A Monday.com API token embedded in browser JavaScript is exposed to every user who can load the page. For production, move Monday.com synchronization to a protected backend or serverless function and keep the token in server-side environment variables. Rotate the token if it has been exposed beyond the intended users.

---

## 9. WhatsApp Bot setup

The bot lives in [`WhatsApp Bot`](WhatsApp%20Bot). Open a terminal in that directory, not only in the repository root:

```powershell
cd "C:\DIM\ODC SEET Food Order Monitoring\WhatsApp Bot"
node --version
npm --version
npm install
Copy-Item .env.example .env
```

Edit `.env`:

```env
SESSION_DATA_PATH=./.wwebjs_auth
FOOD_GROUP_ID=120363411910061717@g.us
API_PORT=3333
API_SECRET=replace-this-with-a-strong-secret
```

Build and start:

```powershell
npm run build
npm start
```

For development:

```powershell
npm run dev
```

The first run prints a URL containing the QR code. Open that URL and scan it from WhatsApp. Do not delete `.wwebjs_auth` after a successful login.

The bot's detailed setup, Docker, Railway, environment variables, and troubleshooting instructions are in [`WhatsApp Bot/README.md`](WhatsApp%20Bot/README.md).

---

## 10. Connecting the dashboard to the bot

The dashboard configuration is near the WhatsApp notification code in `index.html`:

```js
const WA_BOT_URL = 'http://localhost:3333';
const WA_BOT_SECRET = 'replace-with-the-same-value-as-API_SECRET';
```

Use:

- `http://localhost:3333` when the browser and bot run on the same computer.
- `http://192.168.x.x:3333` when the bot runs on another computer on the same network and the firewall allows the port.
- An HTTPS public bot URL when the dashboard is hosted on HTTPS.

An HTTPS dashboard cannot call an HTTP bot URL because browsers block mixed content. The bot must also permit the dashboard's origin through its network and firewall configuration.

Available bot actions:

| Dashboard action | Endpoint |
| --- | --- |
| Notify one assignee | `POST /notify-assignee` |
| Notify the assignment group | `POST /notify-group` |
| Notify that distribution is ready | `POST /notify-distribution` |

---

## 11. Firebase Hosting deployment

Install Firebase CLI if necessary:

```powershell
npm install -g firebase-tools
firebase --version
```

From the repository root:

```powershell
cd "C:\DIM\ODC SEET Food Order Monitoring"
firebase login
firebase use seet-order-management
firebase deploy --only hosting,firestore
```

The configured hosting directory is the repository root, so `index.html` is deployed directly. The deployed site is:

```text
https://seet-order-management.web.app
```

The GitHub workflow can also deploy when changes are pushed to `main`, provided the Firebase service-account secret is configured in GitHub Actions. Confirm that the workflow project ID matches `seet-order-management`.

---

## 12. Docker deployment for the bot

The root [`Dockerfile`](Dockerfile) builds the bot source from `WhatsApp Bot/` and runs the compiled output on container port `8080` because hosting platforms commonly provide `PORT=8080`.

From the repository root:

```powershell
docker build -t odc-whatsapp-bot .
docker run --name odc-whatsapp-bot `
  --env-file ".\WhatsApp Bot\.env" `
  -p 3333:8080 `
  -v "${PWD}\WhatsApp Bot\.wwebjs_auth:/app/.wwebjs_auth" `
  odc-whatsapp-bot
```

The bot code prefers the platform-provided `PORT`, then `API_PORT`, then `3333`. Persist `/app/.wwebjs_auth`; otherwise the container will lose the WhatsApp login when recreated.

---

## 13. Routine operation

1. Start the WhatsApp Bot before using WhatsApp notification buttons.
2. Check `http://localhost:3333/health` or the bot host's health URL.
3. Confirm the response reports `"bot":"connected"`.
4. Sync current orders from Monday.com.
5. Confirm people and Food Committee assignments.
6. Use **Notify Group** to send the assignment list.
7. Use **Distribution is Ready to Go** only when food is ready.
8. Use individual notification controls to contact an assignee when needed.

The dashboard can still display cached data when Firestore is temporarily unavailable, but remote synchronization and cross-device updates will not work until the connection returns.

---

## 14. Troubleshooting

### `npm` is not recognized

Node.js/npm is not installed or is missing from Windows `PATH`. Install Node.js 20 or newer, close PowerShell, open a new terminal, and verify:

```powershell
node --version
npm --version
```

If `node` works but `npm` does not, try:

```powershell
npm.cmd --version
```

If necessary, repair Node.js and ensure `C:\Program Files\nodejs\` is in `PATH`.

### `npm approve-scripts <pkg>` gives a PowerShell error

`<pkg>` is a placeholder, not text to type. Use the actual package names:

```powershell
npm approve-scripts @whiskeysockets/baileys protobufjs
```

Or review all pending scripts:

```powershell
npm approve-scripts --allow-scripts-pending
```

### `npm install` is run from the wrong folder

Run it from the folder containing `package.json`:

```powershell
cd "C:\DIM\ODC SEET Food Order Monitoring\WhatsApp Bot"
Get-ChildItem package.json
npm install
```

### Bot API starts but dashboard cannot reach it

Check the following:

1. The bot is running and listening on the expected port.
2. `GET /health` returns a response.
3. `WA_BOT_URL` uses the bot computer's reachable hostname or IP.
4. Windows Firewall allows inbound TCP traffic on the bot port.
5. The dashboard and bot do not violate HTTPS mixed-content rules.
6. The browser console does not show a CORS or network error.

### Bot returns `401 Unauthorized`

`API_SECRET` in the bot `.env` does not match `WA_BOT_SECRET` in `index.html`, or the request did not include `x-api-secret`.

### Bot returns `503 WhatsApp bot not connected yet`

The HTTP server is running, but Baileys has not connected. Wait for `[WhatsApp] Client is ready!`. If no QR URL appears, inspect the terminal for connection errors.

### QR code does not appear or login is lost

Stop the bot and verify that `.wwebjs_auth` exists and is writable. If WhatsApp logged the session out, remove the local session directory only when you are prepared to scan again, then restart the bot.

### Firestore status shows `Sync error`

Check browser DevTools and verify:

- Internet access is available.
- The Firebase project ID is correct.
- Firestore is enabled.
- The deployed rules allow the requested operation.
- The browser is not blocking Firebase requests.

### Monday.com sync returns no orders

Verify the board ID, API token, column IDs, board permissions, and that the board contains items. Use the browser console output from the sync operation to identify GraphQL errors.

### Changes appear on one computer but not another

Confirm both browsers are connected to the same Firebase project and document. Check the Firebase status indicator. Clear stale local data only if necessary; localStorage is an offline cache and is not the authoritative shared copy when Firestore is connected.

### Firebase deployment fails

From the repository root, run:

```powershell
firebase use
firebase projects:list
firebase deploy --only hosting,firestore --debug
```

Confirm that you are logged into an account with access to `seet-order-management` and that `firebase.json` is present.

---

## 15. Security checklist

Before production or wider sharing:

- Move the Monday.com token out of `index.html` and into a backend.
- Replace the sample WhatsApp API secret.
- Restrict bot CORS to the actual dashboard origin.
- Restrict firewall access to trusted clients or use an HTTPS reverse proxy.
- Add Firebase Authentication and restrictive Firestore rules.
- Never commit `.env`, `.wwebjs_auth`, `node_modules`, or `dist`.
- Rotate any secret that has been posted in chat, screenshots, logs, or public repositories.
- Keep the WhatsApp bot account separate from a personal account where possible.

---

## 16. Validation commands

Run these before committing changes:

```powershell
# Dashboard structure check
Select-String -Path .\index.html -Pattern '<html','</html>','firebase.initializeApp'

# Bot type check/build
Set-Location ".\WhatsApp Bot"
npm run build
Set-Location ..

# Git whitespace check
git diff --check
```

## License

Internal ODC SEET project. Add a formal license if this project will be distributed outside the organization.
