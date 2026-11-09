import express, { NextFunction, Request, Response } from 'express';
import { createSessionToken, hashPin, RateLimiter, verifyPin, verifySessionToken } from './auth.ts';
import type { CardStore } from './store.ts';
import { sanitizeLink, sanitizeProfilePatch, validateNewPin, ValidationError } from './validation.ts';

type Handler = (req: Request, res: Response) => Promise<void>;

/** Forwards async errors to the Express error handler. */
const route = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

export interface ApiOptions {
  /** Failed PIN attempts allowed per client per window. */
  loginMaxFailures?: number;
  loginWindowMs?: number;
}

export function createApi(store: CardStore, options: ApiOptions = {}) {
  const loginLimiter = new RateLimiter(options.loginMaxFailures ?? 5, options.loginWindowMs ?? 15 * 60 * 1000);
  // One counted click per client per link every 30 seconds.
  const clickLimiter = new RateLimiter(1, 30 * 1000);

  const api = express.Router();
  api.use(express.json({ limit: '32kb' }));
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  const clientKey = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

  async function isAuthorized(req: Request): Promise<boolean> {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return false;
    const { pinHash, sessionSecret } = await store.getAuth();
    return verifySessionToken(token, sessionSecret, pinHash);
  }

  /** Route that requires a valid admin session token. */
  const adminRoute = (fn: Handler) =>
    route(async (req, res) => {
      if (!(await isAuthorized(req))) {
        res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
        return;
      }
      await fn(req, res);
    });

  api.get('/health', route(async (_req, res) => {
    await store.ping();
    res.json({ ok: true });
  }));

  // Public card data, read by every phone that scans the QR code.
  api.get('/card', route(async (_req, res) => {
    res.json(await store.getCard());
  }));

  api.post('/auth/login', route(async (req, res) => {
    const key = clientKey(req);
    if (loginLimiter.isBlocked(key)) {
      res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });
      return;
    }
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const { pinHash, sessionSecret } = await store.getAuth();
    if (!pin || !verifyPin(pin, pinHash)) {
      loginLimiter.hit(key);
      res.status(401).json({ success: false, message: 'Incorrect admin PIN.' });
      return;
    }
    loginLimiter.reset(key);
    res.json({ success: true, token: createSessionToken(sessionSecret, pinHash) });
  }));

  api.get('/auth/session', adminRoute(async (_req, res) => {
    res.json({ success: true });
  }));

  api.post('/admin/profile', adminRoute(async (req, res) => {
    const patch = sanitizeProfilePatch(req.body?.profile);
    res.json({ success: true, profile: await store.updateProfile(patch) });
  }));

  api.post('/admin/links', adminRoute(async (req, res) => {
    const link = sanitizeLink(req.body?.link);
    res.json({ success: true, links: await store.upsertLink(link) });
  }));

  api.delete('/admin/links/:id', adminRoute(async (req, res) => {
    const deleted = await store.deleteLink(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Link not found' });
      return;
    }
    res.json({ success: true, links: (await store.getCard()).links });
  }));

  api.post('/admin/pin', adminRoute(async (req, res) => {
    const key = clientKey(req);
    if (loginLimiter.isBlocked(key)) {
      res.status(429).json({ success: false, message: 'Too many failed attempts. Try again in 15 minutes.' });
      return;
    }
    const currentPin = typeof req.body?.currentPin === 'string' ? req.body.currentPin.trim() : '';
    const auth = await store.getAuth();
    if (!currentPin || !verifyPin(currentPin, auth.pinHash)) {
      loginLimiter.hit(key);
      res.status(403).json({ success: false, message: 'Current PIN is incorrect.' });
      return;
    }
    const newHash = hashPin(validateNewPin(req.body?.newPin));
    await store.setPinHash(newHash);
    // Old sessions are now invalid; hand this client a fresh token.
    res.json({ success: true, token: createSessionToken(auth.sessionSecret, newHash) });
  }));

  api.post('/admin/reset', adminRoute(async (_req, res) => {
    await store.resetContent();
    res.json({ success: true, ...(await store.getCard()) });
  }));

  api.post('/links/:id/click', route(async (req, res) => {
    const key = `${clientKey(req)}|${req.params.id}`;
    if (clickLimiter.isBlocked(key)) {
      res.json({ success: true, counted: false });
      return;
    }
    clickLimiter.hit(key);
    const clicks = await store.incrementClicks(req.params.id);
    res.json({ success: clicks !== null, counted: clicks !== null, clicks });
  }));

  api.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ success: false, message: err.message });
      return;
    }
    const status = (err as { status?: number; type?: string })?.status;
    if (status && status >= 400 && status < 500) {
      res.status(status).json({ success: false, message: 'Invalid request body' });
      return;
    }
    console.error('[Card Backend] Request failed:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  });

  const app = express();
  app.set('trust proxy', 1); // Render puts one proxy in front of the app; needed for per-client rate limits.
  app.disable('x-powered-by');
  app.use('/api', api);
  return app;
}
