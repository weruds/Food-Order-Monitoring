import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { initDb } from './db/schema';
import { startScheduler } from './scheduler';
import { handleAttendanceReply } from './handlers/attendance';
import { handleFoodReply } from './handlers/foodCommittee';
import {
  handleGroupAdminQuery,
  handlePendingFoodSurveyInput,
} from './handlers/adminQuery';

dotenv.config();

// ── WhatsApp Client ───────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.SESSION_DATA_PATH ?? './.wwebjs_auth',
    clientId: 'wna-bot',                // stable session name — never changes
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',        // prevents crashes on low-memory machines
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
});

// ── QR Code ───────────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  console.log('\n[Auth] Scan this QR code with WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.on('ready', () => {
  console.log('[WhatsApp] Client is ready!');
  startScheduler(client);

  // Log group IDs on first run to help configure .env
  // Delay group ID discovery — WhatsApp needs a moment after ready before getChats() works
  setTimeout(() => {
    client.getChats().then(chats => {
      const groups = chats.filter(c => c.isGroup);
      if (groups.length > 0) {
        console.log('\n[Setup] Detected group chats (copy IDs to .env):');
        groups.forEach(g => console.log(`  ${g.name}  →  ${g.id._serialized}`));
        console.log('');
      }
    }).catch(() => {
      console.log('[Setup] Could not list groups yet — send any message in a group to discover its ID from incoming messages.');
    });
  }, 5000);
});

// ── Incoming Messages ─────────────────────────────────────────────────────────
client.on('message', async (msg) => {
  try {
    // 1. Ignore status broadcasts and self-messages
    if (msg.from === 'status@broadcast') return;
    if (msg.fromMe) return;

    const isGroup = msg.from.endsWith('@g.us');

    if (isGroup) {
      // Helper: log group IDs — msg.from already contains the group ID, no browser call needed
      if (!process.env.ATTENDANCE_GROUP_ID || !process.env.FOOD_GROUP_ID) {
        console.log(`[Group ID] ${msg.from}  ← copy this into .env`);
      }
      // Route group messages to admin query handler
      await handleGroupAdminQuery(client, msg);
      return;
    }

    // Private chat — check pending food survey input first
    const handledAsPendingFood = await handlePendingFoodSurveyInput(client, msg);
    if (handledAsPendingFood) return;

    // Try attendance reply
    const handledAsAttendance = await handleAttendanceReply(client, msg);
    if (handledAsAttendance) return;

    // Try food survey reply
    await handleFoodReply(client, msg);

  } catch (err) {
    console.error('[Message] Unhandled error:', err);
  }
});

// ── Auth failure / disconnected ───────────────────────────────────────────────
client.on('auth_failure', (msg) => {
  console.error('[Auth] Authentication failure:', msg);
  console.log('[Auth] Clearing session and restarting in 5 seconds...');
  setTimeout(() => {
    client.initialize();
  }, 5000);
});

client.on('disconnected', (reason) => {
  console.warn('[WhatsApp] Client disconnected:', reason);
  console.log('[WhatsApp] Attempting to reconnect in 10 seconds...');
  setTimeout(() => {
    client.initialize();
  }, 10000);
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function boot(): Promise<void> {
  console.log('[Boot] Starting WhatsApp Notification Assistant…');
  await initDb();
  client.initialize();
}

boot().catch(err => {
  console.error('[Boot] Fatal error:', err);
  process.exit(1);
});
