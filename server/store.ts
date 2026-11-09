import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import type { PortalProfile, WebsiteLink } from '../src/types/index.ts';
import { INITIAL_PROFILE } from '../src/db/defaults.ts';
import { generatePin, hashPin, randomSecret } from './auth.ts';
import { validateNewPin } from './validation.ts';

export interface CardData {
  profile: PortalProfile;
  links: WebsiteLink[];
  updatedAt: number;
}

export interface AuthData {
  pinHash: string;
  sessionSecret: string;
}

export interface CardStore {
  init(): Promise<void>;
  getCard(): Promise<CardData>;
  getAuth(): Promise<AuthData>;
  setPinHash(pinHash: string): Promise<void>;
  updateProfile(patch: Partial<PortalProfile>): Promise<PortalProfile>;
  upsertLink(link: Omit<WebsiteLink, 'clicks'>): Promise<WebsiteLink[]>;
  deleteLink(id: string): Promise<boolean>;
  incrementClicks(id: string): Promise<number | null>;
  /** Clears profile and links. The admin PIN is kept. */
  resetContent(): Promise<void>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Initial PIN for a fresh store: ADMIN_PIN if set, otherwise a random one printed to the logs.
 */
function initialPinHash(): string {
  if (process.env.ADMIN_PIN) return hashPin(validateNewPin(process.env.ADMIN_PIN));
  const pin = generatePin();
  console.warn(`[Card Backend] No ADMIN_PIN set. Generated admin PIN: ${pin}  (change it in the admin panel)`);
  return hashPin(pin);
}

/** ADMIN_PIN_RESET forces the stored PIN on every start. Meant for recovery; remove it afterwards. */
function resetPinHash(): string | null {
  if (!process.env.ADMIN_PIN_RESET) return null;
  console.warn('[Card Backend] ADMIN_PIN_RESET is set: admin PIN overwritten. Remove this variable after logging in.');
  return hashPin(validateNewPin(process.env.ADMIN_PIN_RESET));
}

// ---------------------------------------------------------------------------
// PostgreSQL store. All tables live in their own schema so the card can share
// a Postgres database with other apps without touching their tables.
// ---------------------------------------------------------------------------

interface LinkRow {
  id: string;
  data: Omit<WebsiteLink, 'id' | 'clicks' | 'createdAt'>;
  clicks: number;
  created_at: string;
}

export class PgStore implements CardStore {
  private settings: string;
  private links: string;

  constructor(private pool: pg.Pool, private schema: string) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error(`Invalid schema name: ${schema}`);
    this.settings = `"${schema}".settings`;
    this.links = `"${schema}".links`;
  }

  async init(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.settings} (
        id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        pin_hash text NOT NULL,
        session_secret text NOT NULL,
        profile jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.links} (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        clicks integer NOT NULL DEFAULT 0,
        created_at bigint NOT NULL
      )`);

    const existing = await this.pool.query(`SELECT 1 FROM ${this.settings} WHERE id = 1`);
    if (existing.rowCount === 0) {
      await this.pool.query(
        `INSERT INTO ${this.settings} (id, pin_hash, session_secret, profile)
         VALUES (1, $1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [initialPinHash(), randomSecret(), JSON.stringify(INITIAL_PROFILE)],
      );
      console.log(`[Card Backend] Initialized card tables in schema "${this.schema}"`);
    }
    const forced = resetPinHash();
    if (forced) await this.setPinHash(forced);
  }

  async getCard(): Promise<CardData> {
    const [settings, links] = await Promise.all([
      this.pool.query(`SELECT profile, updated_at FROM ${this.settings} WHERE id = 1`),
      this.pool.query<LinkRow>(`SELECT id, data, clicks, created_at FROM ${this.links} ORDER BY created_at, id`),
    ]);
    const row = settings.rows[0];
    return {
      profile: { ...INITIAL_PROFILE, ...(row?.profile ?? {}) },
      links: links.rows.map((r) => ({ ...r.data, id: r.id, clicks: r.clicks, createdAt: Number(r.created_at) })),
      updatedAt: row ? new Date(row.updated_at).getTime() : Date.now(),
    };
  }

  async getAuth(): Promise<AuthData> {
    const res = await this.pool.query(`SELECT pin_hash, session_secret FROM ${this.settings} WHERE id = 1`);
    if (!res.rows[0]) throw new Error('Card settings row missing; was init() called?');
    return { pinHash: res.rows[0].pin_hash, sessionSecret: res.rows[0].session_secret };
  }

  async setPinHash(pinHash: string): Promise<void> {
    await this.pool.query(`UPDATE ${this.settings} SET pin_hash = $1 WHERE id = 1`, [pinHash]);
  }

  async updateProfile(patch: Partial<PortalProfile>): Promise<PortalProfile> {
    const res = await this.pool.query(
      `UPDATE ${this.settings} SET profile = profile || $1::jsonb, updated_at = now() WHERE id = 1 RETURNING profile`,
      [JSON.stringify(patch)],
    );
    return { ...INITIAL_PROFILE, ...res.rows[0].profile };
  }

  async upsertLink(link: Omit<WebsiteLink, 'clicks'>): Promise<WebsiteLink[]> {
    const { id, createdAt, ...data } = link;
    await this.pool.query(
      `INSERT INTO ${this.links} (id, data, created_at) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, JSON.stringify(data), createdAt ?? Date.now()],
    );
    await this.touch();
    return (await this.getCard()).links;
  }

  async deleteLink(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM ${this.links} WHERE id = $1`, [id]);
    if (res.rowCount) await this.touch();
    return Boolean(res.rowCount);
  }

  async incrementClicks(id: string): Promise<number | null> {
    const res = await this.pool.query(
      `UPDATE ${this.links} SET clicks = clicks + 1 WHERE id = $1 RETURNING clicks`,
      [id],
    );
    return res.rows[0]?.clicks ?? null;
  }

  async resetContent(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM ${this.links}`);
      await client.query(`UPDATE ${this.settings} SET profile = $1, updated_at = now() WHERE id = 1`, [
        JSON.stringify(INITIAL_PROFILE),
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async touch(): Promise<void> {
    await this.pool.query(`UPDATE ${this.settings} SET updated_at = now() WHERE id = 1`);
  }
}

// ---------------------------------------------------------------------------
// JSON file store for local development and tests (not used in production).
// ---------------------------------------------------------------------------

interface FileData extends AuthData {
  profile: PortalProfile;
  links: WebsiteLink[];
  updatedAt: number;
}

export class FileStore implements CardStore {
  private data!: FileData;

  constructor(private file: string) {}

  async init(): Promise<void> {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf-8'));
    } else {
      this.data = {
        pinHash: initialPinHash(),
        sessionSecret: randomSecret(),
        profile: { ...INITIAL_PROFILE },
        links: [],
        updatedAt: Date.now(),
      };
    }
    const forced = resetPinHash();
    if (forced) this.data.pinHash = forced;
    this.save();
  }

  async getCard(): Promise<CardData> {
    return structuredClone({ profile: { ...INITIAL_PROFILE, ...this.data.profile }, links: this.data.links, updatedAt: this.data.updatedAt });
  }

  async getAuth(): Promise<AuthData> {
    return { pinHash: this.data.pinHash, sessionSecret: this.data.sessionSecret };
  }

  async setPinHash(pinHash: string): Promise<void> {
    this.data.pinHash = pinHash;
    this.save();
  }

  async updateProfile(patch: Partial<PortalProfile>): Promise<PortalProfile> {
    this.data.profile = { ...this.data.profile, ...patch };
    this.save(true);
    return { ...INITIAL_PROFILE, ...this.data.profile };
  }

  async upsertLink(link: Omit<WebsiteLink, 'clicks'>): Promise<WebsiteLink[]> {
    const index = this.data.links.findIndex((l) => l.id === link.id);
    if (index >= 0) {
      const existing = this.data.links[index];
      this.data.links[index] = { ...link, clicks: existing.clicks, createdAt: existing.createdAt };
    } else {
      this.data.links.push({ ...link, clicks: 0, createdAt: link.createdAt ?? Date.now() });
    }
    this.save(true);
    return structuredClone(this.data.links);
  }

  async deleteLink(id: string): Promise<boolean> {
    const before = this.data.links.length;
    this.data.links = this.data.links.filter((l) => l.id !== id);
    const deleted = this.data.links.length < before;
    if (deleted) this.save(true);
    return deleted;
  }

  async incrementClicks(id: string): Promise<number | null> {
    const link = this.data.links.find((l) => l.id === id);
    if (!link) return null;
    link.clicks = (link.clicks || 0) + 1;
    this.save();
    return link.clicks;
  }

  async resetContent(): Promise<void> {
    this.data.profile = { ...INITIAL_PROFILE };
    this.data.links = [];
    this.save(true);
  }

  async ping(): Promise<void> {}

  async close(): Promise<void> {}

  private save(touch = false): void {
    if (touch) this.data.updatedAt = Date.now();
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
    fs.renameSync(tmp, this.file);
  }
}

/**
 * Picks the store from the environment:
 * - DATABASE_URL set → PostgreSQL (schema from DB_SCHEMA, default "saphire_card")
 * - otherwise → local JSON file (refused when NODE_ENV=production, because
 *   hosts like Render wipe the disk on every deploy and restart)
 */
export function createStore(rootDir: string): CardStore {
  const url = process.env.DATABASE_URL;
  if (url) {
    const useSsl = process.env.DATABASE_SSL === 'true' || /\.render\.com/.test(url);
    const pool = new pg.Pool({
      connectionString: url,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
    pool.on('error', (err) => console.error('[Card Backend] Postgres pool error:', err));
    return new PgStore(pool, process.env.DB_SCHEMA || 'saphire_card');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. Refusing to start in production with file storage.');
  }
  return new FileStore(path.join(rootDir, 'data', 'dev-card.json'));
}
