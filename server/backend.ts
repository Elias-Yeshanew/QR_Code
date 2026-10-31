import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebsiteLink, PortalProfile } from '../src/types';
import { INITIAL_PROFILE } from '../src/db/inMemoryDb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Central server database file path (supports Render Persistent Disk via DATA_DIR)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'card_db.json');


export interface ServerCardDatabase {
  adminPin: string;
  profile: PortalProfile;
  links: WebsiteLink[];
  updatedAt: number;
}

const DEFAULT_DB: ServerCardDatabase = {
  adminPin: 'admin123',
  profile: { ...INITIAL_PROFILE },
  links: [],
  updatedAt: Date.now(),
};

class CentralDatabaseManager {
  private data: ServerCardDatabase = { ...DEFAULT_DB };

  constructor() {
    this.ensureDirectory();
    this.load();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          this.data = {
            adminPin: parsed.adminPin || 'admin123',
            profile: { ...INITIAL_PROFILE, ...(parsed.profile || {}) },
            links: Array.isArray(parsed.links) ? parsed.links : [],
            updatedAt: parsed.updatedAt || Date.now(),
          };
          return;
        }
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing clean database:', err);
    }

    // If file did not exist or was invalid, initialize with clean defaults
    this.save();
  }

  private save(): void {
    this.ensureDirectory();
    try {
      this.data.updatedAt = Date.now();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist central database to disk:', err);
    }
  }

  // --- Public Read/Write Operations ---

  public getPublicCardData() {
    return {
      profile: { ...this.data.profile },
      links: [...this.data.links],
      updatedAt: this.data.updatedAt,
    };
  }

  public verifyPin(pin: string): boolean {
    if (!pin) return false;
    return pin.trim() === this.data.adminPin;
  }

  public updatePin(currentPin: string, newPin: string): boolean {
    if (!this.verifyPin(currentPin)) return false;
    if (!newPin || newPin.trim().length < 3) return false;
    this.data.adminPin = newPin.trim();
    this.save();
    return true;
  }

  public updateProfile(patch: Partial<PortalProfile>): PortalProfile {
    this.data.profile = {
      ...this.data.profile,
      ...patch,
    };
    this.save();
    return { ...this.data.profile };
  }

  public insertOrUpdateLink(link: WebsiteLink): WebsiteLink[] {
    const existingIndex = this.data.links.findIndex((l) => l.id === link.id);
    if (existingIndex >= 0) {
      this.data.links[existingIndex] = { ...this.data.links[existingIndex], ...link };
    } else {
      this.data.links.push({ ...link });
    }
    this.save();
    return [...this.data.links];
  }

  public deleteLink(id: string): boolean {
    const initialLen = this.data.links.length;
    this.data.links = this.data.links.filter((l) => l.id !== id);
    const deleted = this.data.links.length < initialLen;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  public incrementClicks(id: string): number {
    const link = this.data.links.find((l) => l.id === id);
    if (link) {
      link.clicks = (link.clicks || 0) + 1;
      this.save();
      return link.clicks;
    }
    return 0;
  }

  public resetClean(): void {
    this.data = {
      adminPin: 'admin123',
      profile: { ...INITIAL_PROFILE },
      links: [],
      updatedAt: Date.now(),
    };
    this.save();
  }
}

export const serverDb = new CentralDatabaseManager();

// Create Express API router
export const apiRouter = express.Router();
apiRouter.use(express.json());

// Main Express app that augments req and res with Express methods
export const apiApp = express();
apiApp.use(express.json());
apiApp.use('/api', apiRouter);
apiApp.use(apiRouter);


// 1. GET /api/card - Publicly accessible by any phone or browser
apiRouter.get('/card', (_req: Request, res: Response) => {
  res.json(serverDb.getPublicCardData());
});

// 2. POST /api/auth/verify - Verify admin PIN
apiRouter.post('/auth/verify', (req: Request, res: Response): void => {
  const { pin } = req.body || {};
  const valid = serverDb.verifyPin(pin);
  if (valid) {
    res.json({ success: true, message: 'Admin verified successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid Admin PIN / Password' });
  }
});

// 3. POST /api/admin/profile - Update profile details
apiRouter.post('/admin/profile', (req: Request, res: Response): void => {
  const { pin, profile } = req.body || {};
  if (!serverDb.verifyPin(pin)) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin PIN' });
    return;
  }
  if (!profile || typeof profile !== 'object') {
    res.status(400).json({ success: false, message: 'Missing profile payload' });
    return;
  }

  const updatedProfile = serverDb.updateProfile(profile);
  res.json({ success: true, profile: updatedProfile });
});

// 4. POST /api/admin/links - Insert or update link
apiRouter.post('/admin/links', (req: Request, res: Response): void => {
  const { pin, link } = req.body || {};
  if (!serverDb.verifyPin(pin)) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin PIN' });
    return;
  }
  if (!link || !link.id || !link.title || !link.url) {
    res.status(400).json({ success: false, message: 'Invalid link payload' });
    return;
  }

  const updatedLinks = serverDb.insertOrUpdateLink(link);
  res.json({ success: true, links: updatedLinks });
});

// 5. DELETE /api/admin/links/:id - Delete link
apiRouter.delete('/admin/links/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const pin = (req.headers['x-admin-pin'] as string) || req.query.pin || req.body?.pin;

  if (!serverDb.verifyPin(pin)) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin PIN' });
    return;
  }

  const deleted = serverDb.deleteLink(id);
  res.json({ success: deleted, links: serverDb.getPublicCardData().links });
});

// 6. POST /api/links/:id/click - Increment public click count
apiRouter.post('/links/:id/click', (req: Request, res: Response): void => {
  const { id } = req.params;
  const clicks = serverDb.incrementClicks(id);
  res.json({ success: true, clicks });
});

// 7. POST /api/admin/pin - Change admin PIN
apiRouter.post('/admin/pin', (req: Request, res: Response): void => {
  const { currentPin, newPin } = req.body || {};
  if (!serverDb.verifyPin(currentPin)) {
    res.status(401).json({ success: false, message: 'Current Admin PIN is incorrect' });
    return;
  }

  const changed = serverDb.updatePin(currentPin, newPin);
  if (changed) {
    res.json({ success: true, message: 'Admin password updated successfully on server' });
  } else {
    res.status(400).json({ success: false, message: 'New PIN must be at least 3 characters' });
  }
});

// 8. POST /api/admin/reset - Reset to clean database
apiRouter.post('/admin/reset', (req: Request, res: Response): void => {
  const { pin } = req.body || {};
  if (!serverDb.verifyPin(pin)) {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin PIN' });
    return;
  }

  serverDb.resetClean();
  res.json({ success: true, ...serverDb.getPublicCardData() });
});
