import express, { Request, Response, NextFunction } from 'express';
import { Client } from 'whatsapp-web.js';
import dotenv from 'dotenv';

dotenv.config();

const API_PORT   = parseInt(process.env.API_PORT   ?? '3333', 10);
const API_SECRET = process.env.API_SECRET ?? '';

export function startApi(client: Client): void {
  const app = express();
  app.use(express.json());

  // ── CORS — allow the Firebase hosted dashboard to call this local server ─────
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    const message =
`Hi ${name}, There are Food Orders currently assigned to you for Distribution in the Dashboard.

You can view them on Food Committee Assignment Tab

-admin`;

    try {
      const chatId = `${phone.replace(/\D/g, '')}@c.us`;
      await client.sendMessage(chatId, message);
      console.log(`[API] Assignee notification sent → ${name} (${phone})`);
      res.json({ ok: true });
    } catch (err) {
      console.error('[API] Failed to send assignee notification:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // ── POST /notify-group ────────────────────────────────────────────────────────
  // Body: {} — sends "Distribution Ready" to FOOD_GROUP_ID
  app.post('/notify-group', auth, async (_req: Request, res: Response) => {
    const groupId = process.env.FOOD_GROUP_ID;
    if (!groupId) {
      res.status(503).json({ error: 'FOOD_GROUP_ID not configured in .env' });
      return;
    }
    const message =
`Hi Team, Food is now ready for Distribution. Please check your assignments and distribute in an orderly manner.

-admin`;

    try {
      await client.sendMessage(groupId, message);
      console.log('[API] Group distribution notification sent.');
      res.json({ ok: true });
    } catch (err) {
      console.error('[API] Failed to send group notification:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // ── Health check ──────────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', bot: (client as any).info ? 'connected' : 'not ready' });
  });

  app.listen(API_PORT, () => {
    console.log(`[API] HTTP server listening on http://localhost:${API_PORT}`);
  });
}
