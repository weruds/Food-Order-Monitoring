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
  app.post('/notify-group', auth, async (_req: Request, res: Response) => {
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
`Hi Team, Food is now ready for Distribution. Please check your assignments and distribute in an orderly manner.

-admin`;

    try {
      await sock.sendMessage(groupId, { text: message });
      console.log('[API] Group distribution notification sent.');
      res.json({ ok: true });
    } catch (err) {
      console.error('[API] Failed to send group notification:', err);
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
