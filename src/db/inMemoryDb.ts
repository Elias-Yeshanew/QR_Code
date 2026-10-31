import { WebsiteLink, PortalProfile } from '../types/index.ts';


type Listener<T> = (data: T) => void;

export const INITIAL_PROFILE: PortalProfile = {
  title: 'Alex Morgan',
  tagline: 'Senior Technology Consultant • Saphire',
  bio: '',
  avatarUrl: '', // empty defaults to glowing Saphire company logo
  verified: true,
  theme: 'midnight',
  socials: [],
};

const STORAGE_KEY_LINKS = 'saphire_db_links';
const STORAGE_KEY_PROFILE = 'saphire_db_profile';
const STORAGE_KEY_PIN = 'saphire_db_admin_pin';

/**
 * Central-Synchronized In-Memory Database
 * - Synchronizes with central backend server (/api/card) so all phones/browsers see updates in real time.
 * - Stores state in-memory for instant reactive UI updates with zero lag.
 * - Automatically writes changes to central server file storage (data/card_db.json) and browser localStorage.
 */
class InMemoryDatabase {
  private linkStore = new Map<string, WebsiteLink>();
  private profileStore: PortalProfile = { ...INITIAL_PROFILE };
  private adminPin: string = 'admin123';
  private serverSynced: boolean = false;

  private linkListeners = new Set<Listener<WebsiteLink[]>>();
  private profileListeners = new Set<Listener<PortalProfile>>();

  constructor() {
    this.loadFromLocalStorage();
    this.setupStorageListener();
    this.syncFromServer();
  }

  /**
   * Helper to get current admin PIN for authenticated API requests
   */
  private getAuthPin(): string {
    if (typeof window !== 'undefined') {
      try {
        const sessionPin = sessionStorage.getItem('saphire_current_pin');
        if (sessionPin) return sessionPin;
        const localPin = localStorage.getItem('saphire_current_pin');
        if (localPin) return localPin;
      } catch {
        // ignore
      }
    }
    return this.adminPin;
  }

  /**
   * Fetch central database from the backend server so ANY browser or phone
   * scanning the QR code loads the exact same customized profile & links.
   */
  public async syncFromServer(): Promise<void> {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') return;
    try {

      const res = await fetch('/api/card');

      if (res.ok) {
        const data = await res.json();
        if (data && data.profile) {
          this.profileStore = { ...INITIAL_PROFILE, ...data.profile };
          this.saveProfileToLocalStorage();
          this.notifyProfile();
        }
        if (data && Array.isArray(data.links)) {
          this.linkStore.clear();
          for (const item of data.links) {
            if (item && item.id) {
              this.linkStore.set(item.id, item);
            }
          }
          this.saveLinksToLocalStorage();
          this.notifyLinks();
        }
        this.serverSynced = true;
      }
    } catch (e) {
      // Offline fallback: keep in-memory / local storage data
      console.warn('Backend server not reachable, using local storage fallback:', e);
    }
  }

  /**
   * Hydrate in-memory state from local browser storage as fast initial cache
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const storedPin = window.localStorage.getItem(STORAGE_KEY_PIN);
      if (storedPin && storedPin.trim().length >= 3) {
        this.adminPin = storedPin.trim();
      }

      const storedProfile = window.localStorage.getItem(STORAGE_KEY_PROFILE);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        if (parsed && typeof parsed === 'object') {
          this.profileStore = { ...INITIAL_PROFILE, ...parsed };
        }
      }

      const storedLinks = window.localStorage.getItem(STORAGE_KEY_LINKS);
      if (storedLinks) {
        const parsed = JSON.parse(storedLinks);
        if (Array.isArray(parsed)) {
          this.linkStore.clear();
          for (const item of parsed) {
            if (item && item.id) {
              this.linkStore.set(item.id, item);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not load database from persistent storage:', e);
    }
  }

  private setupStorageListener(): void {
    if (typeof window === 'undefined') return;
    try {
      window.addEventListener('storage', (e) => {
        if (
          e.key === STORAGE_KEY_LINKS ||
          e.key === STORAGE_KEY_PROFILE ||
          e.key === STORAGE_KEY_PIN
        ) {
          this.loadFromLocalStorage();
          this.notifyLinks();
          this.notifyProfile();
        }
      });
    } catch {
      // ignore
    }
  }

  private saveLinksToLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const links = Array.from(this.linkStore.values());
      window.localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(links));
    } catch (e) {
      console.error('Failed to persist links to storage:', e);
    }
  }

  private saveProfileToLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(this.profileStore));
    } catch (e) {
      console.error('Failed to persist profile to storage:', e);
    }
  }

  private savePinToLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_PIN, this.adminPin);
    } catch (e) {
      console.error('Failed to persist admin PIN to storage:', e);
    }
  }

  // --- Links Table Operations ---

  public getLinks(): WebsiteLink[] {
    return Array.from(this.linkStore.values());
  }

  public getLinkById(id: string): WebsiteLink | undefined {
    const item = this.linkStore.get(id);
    return item ? { ...item } : undefined;
  }

  public insertLink(link: WebsiteLink): WebsiteLink {
    if (this.linkStore.has(link.id)) {
      throw new Error(`Link with ID "${link.id}" already exists.`);
    }
    const record = { ...link };
    this.linkStore.set(link.id, record);
    this.saveLinksToLocalStorage();
    this.notifyLinks();

    // Push to central backend server
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: this.getAuthPin(), link: record }),
      }).catch((err) => console.warn('Could not sync inserted link to server:', err));
    }

    return record;
  }

  public updateLink(id: string, patch: Partial<WebsiteLink>): WebsiteLink | undefined {
    const existing = this.linkStore.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id };
    this.linkStore.set(id, updated);
    this.saveLinksToLocalStorage();
    this.notifyLinks();

    // Push to central backend server
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: this.getAuthPin(), link: updated }),
      }).catch((err) => console.warn('Could not sync updated link to server:', err));
    }

    return updated;
  }

  public deleteLink(id: string): boolean {
    const deleted = this.linkStore.delete(id);
    if (deleted) {
      this.saveLinksToLocalStorage();
      this.notifyLinks();

      // Push delete to central backend server
      if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
        fetch(`/api/admin/links/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pin': this.getAuthPin(),
          },
        }).catch((err) => console.warn('Could not sync deleted link to server:', err));
      }
    }
    return deleted;
  }

  public incrementClicks(id: string): WebsiteLink | undefined {
    const link = this.linkStore.get(id);
    if (!link) return undefined;
    const updated = { ...link, clicks: (link.clicks || 0) + 1 };
    this.linkStore.set(id, updated);
    this.saveLinksToLocalStorage();
    this.notifyLinks();

    // Sync click count to central server
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      fetch(`/api/links/${encodeURIComponent(id)}/click`, {
        method: 'POST',
      }).catch(() => {});
    }

    return updated;
  }

  public clearLinks(): void {
    this.linkStore.clear();
    this.saveLinksToLocalStorage();
    this.notifyLinks();
  }

  public subscribeLinks(listener: Listener<WebsiteLink[]>): () => void {
    this.linkListeners.add(listener);
    listener(this.getLinks());
    return () => {
      this.linkListeners.delete(listener);
    };
  }

  private notifyLinks(): void {
    const items = this.getLinks();
    this.linkListeners.forEach((l) => l(items));
  }

  // --- Profile Record Operations ---

  public getProfile(): PortalProfile {
    return { ...this.profileStore };
  }

  public updateProfile(patch: Partial<PortalProfile>): PortalProfile {
    this.profileStore = { ...this.profileStore, ...patch };
    this.saveProfileToLocalStorage();
    this.notifyProfile();

    // Push profile update to central backend server
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: this.getAuthPin(), profile: patch }),
      }).catch((err) => console.warn('Could not sync profile to central server:', err));
    }

    return this.getProfile();
  }

  public subscribeProfile(listener: Listener<PortalProfile>): () => void {
    this.profileListeners.add(listener);
    listener(this.getProfile());
    return () => {
      this.profileListeners.delete(listener);
    };
  }

  private notifyProfile(): void {
    const p = this.getProfile();
    this.profileListeners.forEach((l) => l(p));
  }

  // --- Admin Authentication & Password ---

  public verifyAdminPin(inputPin: string): boolean {
    return inputPin.trim() === this.adminPin;
  }

  public async updateAdminPin(newPin: string): Promise<boolean> {
    if (!newPin || newPin.trim().length < 3) return false;
    const currentPin = this.getAuthPin();

    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      try {
        const res = await fetch('/api/admin/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPin, newPin: newPin.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            this.adminPin = newPin.trim();
            this.savePinToLocalStorage();
            try {
              sessionStorage.setItem('saphire_current_pin', this.adminPin);
              localStorage.setItem('saphire_current_pin', this.adminPin);
            } catch {
              // ignore
            }
            return true;
          }
        }
      } catch (err) {
        console.warn('Could not update PIN on central server:', err);
      }
    }

    // Local in-memory update
    this.adminPin = newPin.trim();
    this.savePinToLocalStorage();
    return true;
  }

  public getAdminPin(): string {
    return this.adminPin;
  }

  // --- Clean Database Reset ---

  public resetClean(): void {
    const currentPin = this.getAuthPin();
    this.linkStore.clear();
    this.profileStore = { ...INITIAL_PROFILE };
    this.adminPin = 'admin123';

    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        try {
          window.localStorage.removeItem(STORAGE_KEY_LINKS);
          window.localStorage.removeItem(STORAGE_KEY_PROFILE);
          window.localStorage.removeItem(STORAGE_KEY_PIN);
          window.localStorage.removeItem('saphire_current_pin');
        } catch {
          // ignore
        }
      }
      if (typeof window.location !== 'undefined') {
        fetch('/api/admin/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: currentPin }),
        }).catch(() => {});
      }
    }

    this.notifyLinks();
    this.notifyProfile();
  }


}

// Global In-Memory Database Instance with Central Server Sync
export const db = new InMemoryDatabase();
