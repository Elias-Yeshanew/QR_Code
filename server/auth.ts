import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

export function randomSecret(): string {
  return randomBytes(32).toString('hex');
}

/** Readable random PIN, used only when no ADMIN_PIN is configured on first start. */
export function generatePin(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// Session tokens are "<expiry>.<hmac>". The HMAC covers the current PIN hash,
// so changing the PIN invalidates every existing session.
function sign(secret: string, pinHash: string, exp: number): string {
  return createHmac('sha256', secret).update(`${exp}.${pinHash}`).digest('base64url');
}

export function createSessionToken(secret: string, pinHash: string, now = Date.now()): string {
  const exp = now + SESSION_TTL_MS;
  return `${exp}.${sign(secret, pinHash, exp)}`;
}

export function verifySessionToken(token: string, secret: string, pinHash: string, now = Date.now()): boolean {
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < now) return false;
  const expected = Buffer.from(sign(secret, pinHash, exp));
  const actual = Buffer.from(sig);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Simple fixed-window counter keyed by client (e.g. IP). Single-instance only. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private max: number, private windowMs: number) {}

  /** Returns true if the key is currently blocked. */
  isBlocked(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    return Boolean(entry && entry.resetAt > now && entry.count >= this.max);
  }

  hit(key: string, now = Date.now()): void {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    if (this.hits.size > 10_000) this.prune(now);
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}
