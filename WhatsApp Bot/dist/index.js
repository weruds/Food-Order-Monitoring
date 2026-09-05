"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = require("./api");
dotenv_1.default.config();
// ── WhatsApp Client ───────────────────────────────────────────────────────────
const client = new whatsapp_web_js_1.Client({
    authStrategy: new whatsapp_web_js_1.LocalAuth({
        dataPath: process.env.SESSION_DATA_PATH ?? './.wwebjs_auth',
        clientId: 'wa-bot',
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
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
    qrcode_terminal_1.default.generate(qr, { small: true });
});
// ── Ready ─────────────────────────────────────────────────────────────────────
client.on('ready', () => {
    console.log('[WhatsApp] Client is ready!');
    (0, api_1.startApi)(client);
    // Log all group IDs after boot so you can copy FOOD_GROUP_ID into .env
    setTimeout(() => {
        client.getChats().then(chats => {
            const groups = chats.filter(c => c.isGroup);
            if (groups.length) {
                console.log('\n[Setup] Group chats found (copy your food group ID to .env):');
                groups.forEach(g => console.log(`  "${g.name}"  →  ${g.id._serialized}`));
                console.log('');
            }
        }).catch(() => {
            console.log('[Setup] Could not list groups yet — send any message in a group to see its ID logged.');
        });
    }, 5000);
});
// ── Log group IDs from incoming messages too ──────────────────────────────────
client.on('message', (msg) => {
    if (msg.from === 'status@broadcast' || msg.fromMe)
        return;
    if (msg.from.endsWith('@g.us') && !process.env.FOOD_GROUP_ID) {
        console.log(`[Group ID] ${msg.from}  ← copy this to FOOD_GROUP_ID in .env`);
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
