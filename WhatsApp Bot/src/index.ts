import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import dotenv from 'dotenv';
import path from 'path';
import pino from 'pino';
import { startApi } from './api';

dotenv.config();

const SESSION_DIR = path.resolve(process.env.SESSION_DATA_PATH ?? './.wwebjs_auth');
const logger = pino({ level: 'silent' }); // suppress Baileys internal logs

let sock: WASocket | null = null;
let isConnected = false;

export function getSocket(): WASocket | null { return sock; }
export function getBotConnected(): boolean { return isConnected; }

async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false, // we handle QR ourselves
    browser: ['Food Committee Bot', 'Chrome', '120.0'],
    generateHighQualityLinkPreview: false,
  });

  // ── Save credentials on update ───────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Connection state handler ──────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const encoded = encodeURIComponent(qr);
      console.log('\n[Auth] ══════════════════════════════════════════════');
      console.log('[Auth] Open this URL in your browser to scan the QR:');
      console.log(`[Auth] https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`);
      console.log('[Auth] ══════════════════════════════════════════════\n');
    }

    if (connection === 'open') {
      isConnected = true;
      console.log('[WhatsApp] Client is ready!');
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.warn(`[WhatsApp] Disconnected (code ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => connect(), 5000);
      } else {
        console.error('[WhatsApp] Logged out — delete session folder and restart to re-authenticate.');
      }
    }
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
console.log('[Boot] Starting WhatsApp Bot (Baileys)…');
startApi();
connect().catch(err => {
  console.error('[Boot] Fatal error:', err);
  process.exit(1);
});
