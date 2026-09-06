import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { getSocket, getBotConnected } from './index';

dotenv.config();

const API_PORT   = parseInt(process.env.PORT ?? process.env.API_PORT ?? '3333', 10);
const API_SECRET = process.env.API_SECRET ?? '';

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
      await sock.sendMessage(jid, { text: message });
      console.log(`[API] Assignee notification sent → ${name} (${phone})`);
      res.json({ ok: true });
    } catch (err) {
      console.error('[API] Failed to send assignee notification:', err);
      res.status(500).json({ error: 'Failed to send message' });
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
      await sock.sendMessage(groupId, { text: message });
      console.log('[API] Group assignment notification sent.');
      res.json({ ok: true });
    } catch (err) {
      console.error('[API] Failed to send group notification:', err);
      res.status(500).json({ error: 'Failed to send message' });
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
      await sock.sendMessage(groupId, { text: message });
      console.log('[API] Distribution-ready notification sent.');
      res.json({ ok: true });
    } catch (err) {
      console.error('[API] Failed to send distribution-ready notification:', err);
      res.status(500).json({ error: 'Failed to send message' });
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
