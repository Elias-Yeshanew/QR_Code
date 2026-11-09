import type { PortalProfile, WebsiteLink } from '../types/index.ts';
import { INITIAL_PROFILE } from './defaults.ts';

type Listener<T> = (data: T) => void;

const CACHE_KEY = 'saphire_card_cache';
const TOKEN_KEY = 'saphire_admin_token';
// Keys written by older versions (they stored the PIN itself). Removed on load.
const LEGACY_KEYS = [
  'saphire_db_links',
  'saphire_db_profile',
  'saphire_db_admin_pin',
  'saphire_current_pin',
  'saphire_admin_authenticated',
];

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Client-side view of the card. The server is the source of truth: every write
 * goes to the API first and the local state only changes once it succeeds.
 * localStorage holds a read-only cache of the public card for a fast first paint.
 */
export class CardStore {
  private links: WebsiteLink[] = [];
  private profile: PortalProfile = { ...INITIAL_PROFILE };
  private token: string | null = null;

  private linkListeners = new Set<Listener<WebsiteLink[]>>();
  private profileListeners = new Set<Listener<PortalProfile>>();
  private authListeners = new Set<Listener<boolean>>();

  constructor(private fetchImpl: typeof fetch = (...args) => fetch(...args)) {
    const local = storage('local');
    try {
      LEGACY_KEYS.forEach((k) => {
        local?.removeItem(k);
        storage('session')?.removeItem(k);
      });
      this.token = local?.getItem(TOKEN_KEY) || null;
      const cached = local?.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.profile) this.profile = { ...INITIAL_PROFILE, ...parsed.profile };
        if (Array.isArray(parsed?.links)) this.links = parsed.links;
      }
    } catch {
      // Corrupt cache or blocked storage: start from defaults.
    }
  }

  // --- HTTP -----------------------------------------------------------------

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let res: Response;
    try {
      res = await this.fetchImpl(path, { ...init, headers: { ...headers, ...(init.headers as object) } });
    } catch {
      throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
    }
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON response
    }
    if (!res.ok) {
      if (res.status === 401 && this.token && path !== '/api/auth/login') this.clearSession();
      throw new ApiError(body?.message || `Request failed (${res.status})`, res.status);
    }
    return body as T;
  }

  // --- Public card ----------------------------------------------------------

  async refresh(): Promise<void> {
    const data = await this.request<{ profile: PortalProfile; links: WebsiteLink[] }>('/api/card');
    this.setProfile(data.profile);
    this.setLinks(data.links);
  }

  getLinks(): WebsiteLink[] {
    return [...this.links];
  }

  getLinkById(id: string): WebsiteLink | undefined {
    const link = this.links.find((l) => l.id === id);
    return link ? { ...link } : undefined;
  }

  getProfile(): PortalProfile {
    return { ...this.profile };
  }

  /** Counts a visit. Fire-and-forget: a failure must never block navigation. */
  recordClick(id: string): void {
    this.request(`/api/links/${encodeURIComponent(id)}/click`, { method: 'POST' })
      .then((res: any) => {
        if (res?.counted && typeof res.clicks === 'number') {
          this.setLinks(this.links.map((l) => (l.id === id ? { ...l, clicks: res.clicks } : l)));
        }
      })
      .catch(() => {});
  }

  // --- Admin writes (throw ApiError on failure) ------------------------------

  async saveProfile(patch: Partial<PortalProfile>): Promise<PortalProfile> {
    const res = await this.request<{ profile: PortalProfile }>('/api/admin/profile', {
      method: 'POST',
      body: JSON.stringify({ profile: patch }),
    });
    this.setProfile(res.profile);
    return this.getProfile();
  }

  async saveLink(link: Omit<WebsiteLink, 'clicks'> & { clicks?: number }): Promise<void> {
    const res = await this.request<{ links: WebsiteLink[] }>('/api/admin/links', {
      method: 'POST',
      body: JSON.stringify({ link }),
    });
    this.setLinks(res.links);
  }

  async deleteLink(id: string): Promise<void> {
    const res = await this.request<{ links: WebsiteLink[] }>(`/api/admin/links/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    this.setLinks(res.links);
  }

  async resetContent(): Promise<void> {
    const res = await this.request<{ profile: PortalProfile; links: WebsiteLink[] }>('/api/admin/reset', {
      method: 'POST',
    });
    this.setProfile(res.profile);
    this.setLinks(res.links);
  }

  async changePin(currentPin: string, newPin: string): Promise<void> {
    const res = await this.request<{ token: string }>('/api/admin/pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    });
    this.setToken(res.token);
  }

  // --- Auth -------------------------------------------------------------------

  isAdmin(): boolean {
    return this.token !== null;
  }

  /** Returns false for a wrong PIN; throws ApiError for rate limits and network errors. */
  async login(pin: string): Promise<boolean> {
    try {
      const res = await this.request<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pin: pin.trim() }),
      });
      this.setToken(res.token);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      throw err;
    }
  }

  logout(): void {
    this.clearSession();
  }

  /** Drops a stored session that the server no longer accepts (expired or PIN changed). */
  async validateSession(): Promise<void> {
    if (!this.token) return;
    try {
      await this.request('/api/auth/session');
    } catch {
      // 401 already cleared the session; network errors keep it for now.
    }
  }

  // --- Subscriptions --------------------------------------------------------

  subscribeLinks(listener: Listener<WebsiteLink[]>): () => void {
    this.linkListeners.add(listener);
    listener(this.getLinks());
    return () => this.linkListeners.delete(listener);
  }

  subscribeProfile(listener: Listener<PortalProfile>): () => void {
    this.profileListeners.add(listener);
    listener(this.getProfile());
    return () => this.profileListeners.delete(listener);
  }

  subscribeAuth(listener: Listener<boolean>): () => void {
    this.authListeners.add(listener);
    listener(this.isAdmin());
    return () => this.authListeners.delete(listener);
  }

  // --- Internal state -------------------------------------------------------

  private setLinks(links: WebsiteLink[]): void {
    this.links = links;
    this.writeCache();
    const snapshot = this.getLinks();
    this.linkListeners.forEach((l) => l(snapshot));
  }

  private setProfile(profile: PortalProfile): void {
    this.profile = { ...INITIAL_PROFILE, ...profile };
    this.writeCache();
    const snapshot = this.getProfile();
    this.profileListeners.forEach((l) => l(snapshot));
  }

  private setToken(token: string): void {
    this.token = token;
    try {
      storage('local')?.setItem(TOKEN_KEY, token);
    } catch {
      // Session still works for this page load.
    }
    this.authListeners.forEach((l) => l(true));
  }

  private clearSession(): void {
    this.token = null;
    try {
      storage('local')?.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    this.authListeners.forEach((l) => l(false));
  }

  private writeCache(): void {
    try {
      storage('local')?.setItem(CACHE_KEY, JSON.stringify({ profile: this.profile, links: this.links }));
    } catch {
      // Cache is optional.
    }
  }
}

export const db = new CardStore();

if (typeof window !== 'undefined') {
  db.refresh().catch((err) => console.warn('Could not load card from server, showing cached copy:', err));
  db.validateSession();
}
