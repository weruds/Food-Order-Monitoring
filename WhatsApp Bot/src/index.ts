import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { startApi } from './api';
import fs from 'fs';
import path from 'path';

dotenv.config();

// ── Clear stale Chromium lock files on startup ────────────────────────────────
// The volume may carry locks from a previous container (different hostname).
// Wipe every known lock file pattern under the entire auth directory.
const authRoot = path.resolve(process.env.SESSION_DATA_PATH ?? './.wwebjs_auth');
function clearLocks(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      clearLocks(full);
    } else if (
      ['SingletonLock', 'SingletonCookie', 'SingletonSocket',
       'lockfile', '.lock'].some(n => entry.name === n || entry.name.endsWith('.lock'))
    ) {
      fs.rmSync(full);
      console.log(`[Boot] Removed stale lock: ${full}`);
    }
  }
}
clearLocks(authRoot);

// ── WhatsApp Client ───────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.SESSION_DATA_PATH ?? './.wwebjs_auth',
    clientId: 'wa-bot',
  }),
  puppeteer: {
    headless: true,
    protocolTimeout: 120000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--metrics-recording-only',
      '--disable-default-apps',
    ],
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
});

// ── QR Code ───────────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  // ASCII QR is unreadable in Railway's log viewer — print a scannable URL instead
  const encoded = encodeURIComponent(qr);
  console.log('\n[Auth] ══════════════════════════════════════════════');
  console.log('[Auth] Open this URL in your browser to scan the QR:');
  console.log(`[Auth] https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`);
  console.log('[Auth] ══════════════════════════════════════════════\n');
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.on('ready', () => {
  console.log('[WhatsApp] Client is ready!');
  startApi(client);

  // Retry getChats() up to 5 times with increasing delays
  function tryListGroups(attempt: number): void {
    const delay = attempt * 5000; // 5s, 10s, 15s, 20s, 25s
    setTimeout(() => {
      client.getChats().then(chats => {
        const groups = chats.filter(c => c.isGroup);
        if (groups.length) {
          console.log('\n[Setup] Group chats found — copy your FOOD_GROUP_ID to .env:');
          groups.forEach(g => console.log(`  "${g.name}"  →  ${(g as any).id._serialized}`));
          console.log('');
        } else if (attempt < 5) {
          tryListGroups(attempt + 1);
        } else {
          console.log('[Setup] No groups found after retries — send any message in a group to see its ID logged.');
        }
      }).catch(() => {
        if (attempt < 5) tryListGroups(attempt + 1);
      });
    }, delay);
  }
  tryListGroups(1);
});

// ── Log group IDs from ALL group messages (including your own) ────────────────
client.on('message', (msg) => {
  if (msg.from === 'status@broadcast') return;
  if (msg.from.endsWith('@g.us') && !process.env.FOOD_GROUP_ID) {
    console.log(`[Group ID] ${msg.from}  ← copy this to FOOD_GROUP_ID in .env`);
  }
});

client.on('message_create', (msg) => {
  if (msg.from === 'status@broadcast') return;
  if (msg.fromMe && msg.to.endsWith('@g.us') && !process.env.FOOD_GROUP_ID) {
    console.log(`[Group ID] ${msg.to}  ← copy this to FOOD_GROUP_ID in .env`);
  }
});

// ── Auth failure / disconnected ───────────────────────────────────────────────
client.on('auth_failure', () => {
  console.error('[Auth] Authentication failed — restarting in 5s…');
  setTimeout(() => client.initialize(), 5000);
});

client.on('disconnected', (reason) => {
  console.warn('[WhatsApp] Disconnected:', reason, '— reconnecting in 10s…');
  setTimeout(() => client.initialize(), 10000);
});

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('[Boot] Starting WhatsApp Bot…');
client.initialize();
