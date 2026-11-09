import type { PortalProfile, SocialLink, ThemeType, WebsiteLink } from '../src/types/index.ts';

const THEMES: ThemeType[] = ['midnight', 'aurora', 'emerald', 'sunset', 'clean-light', 'neo-dark'];
const SOCIAL_PLATFORMS: SocialLink['platform'][] = [
  'github', 'x', 'linkedin', 'instagram', 'youtube', 'email', 'discord', 'website',
];
const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

export class ValidationError extends Error {}

function str(value: unknown, field: string, max: number, opts: { required?: boolean } = {}): string {
  if (value === undefined || value === null) {
    if (opts.required) throw new ValidationError(`${field} is required`);
    return '';
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (opts.required && !trimmed) throw new ValidationError(`${field} is required`);
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

/** Returns the URL if it parses and uses an allowed scheme, otherwise throws. */
export function safeUrl(value: unknown, field: string, protocols = LINK_PROTOCOLS): string {
  const raw = str(value, field, 2000, { required: true });
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ValidationError(`${field} is not a valid URL`);
  }
  if (!protocols.has(parsed.protocol)) {
    throw new ValidationError(`${field} must use one of: ${[...protocols].join(', ')}`);
  }
  return raw;
}

/** Validates a partial profile update. Unknown keys are dropped. */
export function sanitizeProfilePatch(input: unknown): Partial<PortalProfile> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('profile must be an object');
  }
  const p = input as Record<string, unknown>;
  const out: Partial<PortalProfile> = {};

  if ('title' in p) out.title = str(p.title, 'title', 100, { required: true });
  if ('tagline' in p) out.tagline = str(p.tagline, 'tagline', 200);
  if ('bio' in p) out.bio = str(p.bio, 'bio', 1000);
  if ('avatarUrl' in p) {
    out.avatarUrl = p.avatarUrl ? safeUrl(p.avatarUrl, 'avatarUrl', IMAGE_PROTOCOLS) : '';
  }
  if ('customLandingUrl' in p) {
    out.customLandingUrl = p.customLandingUrl ? safeUrl(p.customLandingUrl, 'customLandingUrl') : '';
  }
  if ('verified' in p) {
    if (typeof p.verified !== 'boolean') throw new ValidationError('verified must be a boolean');
    out.verified = p.verified;
  }
  if ('theme' in p) {
    if (!THEMES.includes(p.theme as ThemeType)) throw new ValidationError('theme is not supported');
    out.theme = p.theme as ThemeType;
  }
  if ('socials' in p) {
    if (!Array.isArray(p.socials) || p.socials.length > 20) {
      throw new ValidationError('socials must be an array of at most 20 items');
    }
    out.socials = p.socials.map((s, i) => {
      if (!s || typeof s !== 'object') throw new ValidationError(`socials[${i}] must be an object`);
      const { platform, url } = s as Record<string, unknown>;
      if (!SOCIAL_PLATFORMS.includes(platform as SocialLink['platform'])) {
        throw new ValidationError(`socials[${i}].platform is not supported`);
      }
      return { platform: platform as SocialLink['platform'], url: safeUrl(url, `socials[${i}].url`) };
    });
  }
  return out;
}

/** Validates a full link record coming from the admin UI. Click counts are server-owned and ignored. */
export function sanitizeLink(input: unknown): Omit<WebsiteLink, 'clicks'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('link must be an object');
  }
  const l = input as Record<string, unknown>;
  const id = str(l.id, 'id', 64, { required: true });
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new ValidationError('id contains invalid characters');

  const link: Omit<WebsiteLink, 'clicks'> = {
    id,
    title: str(l.title, 'title', 120, { required: true }),
    url: safeUrl(l.url, 'url'),
    description: str(l.description, 'description', 500),
    category: str(l.category, 'category', 50) || 'General',
    icon: str(l.icon, 'icon', 40) || 'globe',
    featured: Boolean(l.featured),
  };
  const badge = str(l.badge, 'badge', 40);
  if (badge) link.badge = badge;
  const accent = str(l.accentColor, 'accentColor', 30);
  if (accent) link.accentColor = accent;
  if (l.createdAt !== undefined) {
    if (typeof l.createdAt !== 'number' || !Number.isFinite(l.createdAt)) {
      throw new ValidationError('createdAt must be a number');
    }
    link.createdAt = Math.trunc(l.createdAt);
  } else {
    link.createdAt = Date.now();
  }
  return link;
}

export const MIN_PIN_LENGTH = 6;

export function validateNewPin(pin: unknown): string {
  if (typeof pin !== 'string') throw new ValidationError('PIN must be a string');
  const trimmed = pin.trim();
  if (trimmed.length < MIN_PIN_LENGTH) {
    throw new ValidationError(`PIN must be at least ${MIN_PIN_LENGTH} characters`);
  }
  if (trimmed.length > 128) throw new ValidationError('PIN must be at most 128 characters');
  return trimmed;
}
