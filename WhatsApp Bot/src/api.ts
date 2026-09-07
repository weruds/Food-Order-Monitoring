/**
 * ODC SEET Food Order Monitoring — WhatsApp Bot API
 * Developed and created by: Wilson Serquina
 * September 2026
 */
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { getSocket, getBotConnected } from './index';
import type { AnyMessageContent } from '@whiskeysockets/baileys';

dotenv.config();

const API_PORT   = parseInt(process.env.PORT ?? process.env.API_PORT ?? '3333', 10);
const API_SECRET = process.env.API_SECRET ?? '';

// ── Retry helper ─────────────────────────────────────────────────────────────
// Baileys can time out (408) resolving a recipient's devices, especially for
// DM sends. Retry up to maxAttempts times with an exponential back-off before
// giving up, and surface a 504 so the caller knows it was a gateway timeout.
const SEND_MAX_ATTEMPTS = 3;
const SEND_RETRY_DELAY_MS = 3000;

async function sendWithRetry(
  jid: string,
  content: AnyMessageContent,
  label: string,
): Promise<void> {
  const sock = getSocket();
  if (!sock) throw new Error('socket unavailable');

  for (let attempt = 1; attempt <= SEND_MAX_ATTEMPTS; attempt++) {
    try {
      await sock.sendMessage(jid, content);
      return; // success
    } catch (err: any) {
      const isTimeout =
        err?.output?.statusCode === 408 ||
        (err?.message ?? '').toLowerCase().includes('timed out');

      if (isTimeout && attempt < SEND_MAX_ATTEMPTS) {
        console.warn(
          `[API] ${label} — attempt ${attempt} timed out, retrying in ${SEND_RETRY_DELAY_MS}ms…`,
        );
        await new Promise(r => setTimeout(r, SEND_RETRY_DELAY_MS * attempt));
        continue;
      }
      throw err; // non-timeout error or final attempt — bubble up
    }
  }
}

export function startApi(): void {
  const app = express();
  app.use(express.json());

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-secret');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  // ── Auth middleware ───────────────────────────────────────────────────────────
  function auth(req: Request, res: Response, next: NextFunction): void {
    if (API_SECRET && req.headers['x-api-secret'] !== API_SECRET) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  }

  // ── POST /notify-assignee ─────────────────────────────────────────────────────
  // Body: { phone: "639XXXXXXXXX", name: "John Doe" }
  app.post('/notify-assignee', auth, async (req: Request, res: Response) => {
    const { phone, name } = req.body as { phone?: string; name?: string };
    if (!phone || !name) {
      res.status(400).json({ error: 'phone and name are required' });
      return;
    }

    const sock = getSocket();
    if (!sock || !getBotConnected()) {
      res.status(503).json({ error: 'WhatsApp bot not connected yet' });
      return;
    }

    const message =
`Hi ${name}, There are Food Orders currently assigned to you for Distribution in the Dashboard.

You can view them on Food Committee Assignment Tab

-admin`;

    try {
      const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
      await sendWithRetry(jid, { text: message }, `notify-assignee → ${name}`);
      console.log(`[API] Assignee notification sent → ${name} (${phone})`);
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[API] Failed to send assignee notification:', err);
      const isTimeout =
        err?.output?.statusCode === 408 ||
        (err?.message ?? '').toLowerCase().includes('timed out');
      res
        .status(isTimeout ? 504 : 500)
        .json({ error: isTimeout ? 'WhatsApp gateway timed out — please retry' : 'Failed to send message' });
    }
  });

  // ── POST /notify-group ────────────────────────────────────────────────────────
  // Body: { date: "September 4, 2026", assignees: [{ name: "John", orders: ["Alice - Meal A", "Bob - Meal B"] }] }
  app.post('/notify-group', auth, async (req: Request, res: Response) => {
    const groupId = process.env.FOOD_GROUP_ID;
    if (!groupId) {
      res.status(503).json({ error: 'FOOD_GROUP_ID not configured in .env' });
      return;
    }

    const sock = getSocket();
    if (!sock || !getBotConnected()) {
      res.status(503).json({ error: 'WhatsApp bot not connected yet' });
      return;
    }

    const { date, assignees } = req.body as {
      date?: string;
      assignees?: { name: string; orders: string[] }[];
    };

    const divider = '___________________';

    let assigneeBlock = '';
    if (assignees && assignees.length) {
      assigneeBlock = assignees.map(a => {
        const orderLines = a.orders.length
          ? a.orders.map(o => `  • ${o}`).join('\n')
          : '  (no orders assigned)';
        return `*${a.name}*\n${orderLines}`;
      }).join(`\n${divider}\n`);
    }

    const message =
`Hi Team! 😊 Here are your assignments for Lunch Distribution for today: *${date || new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}*

${divider}
${assigneeBlock}
${divider}

Another notification will be sent to you later on, so watch out! 👀

— *admin*`;

    try {
      await sendWithRetry(groupId, { text: message }, 'notify-group');
      console.log('[API] Group assignment notification sent.');
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[API] Failed to send group notification:', err);
      const isTimeout =
        err?.output?.statusCode === 408 ||
        (err?.message ?? '').toLowerCase().includes('timed out');
      res
        .status(isTimeout ? 504 : 500)
        .json({ error: isTimeout ? 'WhatsApp gateway timed out — please retry' : 'Failed to send message' });
    }
  });

  // ── POST /notify-distribution ─────────────────────────────────────────────────
  // Sent when distribution is actually ready. Simple "ready to go" message.
  app.post('/notify-distribution', auth, async (_req: Request, res: Response) => {
    const groupId = process.env.FOOD_GROUP_ID;
    if (!groupId) {
      res.status(503).json({ error: 'FOOD_GROUP_ID not configured in .env' });
      return;
    }

    const sock = getSocket();
    if (!sock || !getBotConnected()) {
      res.status(503).json({ error: 'WhatsApp bot not connected yet' });
      return;
    }

    const message =
`🍱 *Distribution is Ready to Go!*

Hey team, food is now ready for pick-up and distribution. Please proceed accordingly and distribute in an orderly manner. Let's go! 💪

— *admin*`;

    try {
      await sendWithRetry(groupId, { text: message }, 'notify-distribution');
      console.log('[API] Distribution-ready notification sent.');
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[API] Failed to send distribution-ready notification:', err);
      const isTimeout =
        err?.output?.statusCode === 408 ||
        (err?.message ?? '').toLowerCase().includes('timed out');
      res
        .status(isTimeout ? 504 : 500)
        .json({ error: isTimeout ? 'WhatsApp gateway timed out — please retry' : 'Failed to send message' });
    }
  });

  // ── Health check ──────────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', bot: getBotConnected() ? 'connected' : 'not ready' });
  });

  app.listen(API_PORT, '0.0.0.0', () => {
    console.log(`[API] HTTP server listening on 0.0.0.0:${API_PORT}`);
  });
}
