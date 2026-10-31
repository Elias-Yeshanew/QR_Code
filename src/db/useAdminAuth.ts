import { useState, useEffect } from 'react';
import { db } from './inMemoryDb';

const ADMIN_STORAGE_KEY = 'saphire_admin_authenticated';
const ADMIN_PIN_KEY = 'saphire_current_pin';

type AuthListener = (isAdmin: boolean) => void;

class AdminAuthStore {
  private authenticated: boolean = false;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const fromLocal = window.localStorage ? localStorage.getItem(ADMIN_STORAGE_KEY) === 'true' : false;
        const fromSession = window.sessionStorage ? sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'true' : false;
        this.authenticated = fromLocal || fromSession;
      }
    } catch {
      this.authenticated = false;
    }
  }

  public getIsAdmin(): boolean {
    return this.authenticated;
  }

  public async login(pin: string): Promise<boolean> {
    const trimmed = pin.trim();
    let verified = false;

    // 1. Verify against central backend server
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      try {


        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            verified = true;
          }
        }
      } catch {
        // Fallback to local database if backend unreachable
        verified = db.verifyAdminPin(trimmed);
      }
    } else {
      verified = db.verifyAdminPin(trimmed);
    }

    if (verified) {
      this.authenticated = true;
      try {
        if (typeof window !== 'undefined') {
          if (window.localStorage) {
            localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
            localStorage.setItem(ADMIN_PIN_KEY, trimmed);
          }
          if (window.sessionStorage) {
            sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
            sessionStorage.setItem(ADMIN_PIN_KEY, trimmed);
          }
        }
      } catch {
        // ignore
      }
      this.notify();
      return true;
    }
    return false;
  }

  public logout(): void {
    this.authenticated = false;
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          localStorage.removeItem(ADMIN_PIN_KEY);
        }
        if (window.sessionStorage) {
          sessionStorage.removeItem(ADMIN_STORAGE_KEY);
          sessionStorage.removeItem(ADMIN_PIN_KEY);
        }
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.authenticated);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.authenticated;
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error notifying auth listener:', err);
      }
    });
  }
}

export const adminAuthStore = new AdminAuthStore();

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => adminAuthStore.getIsAdmin());

  useEffect(() => {
    return adminAuthStore.subscribe(setIsAdmin);
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    return adminAuthStore.login(pin);
  };

  const logout = (): void => {
    adminAuthStore.logout();
  };

  return { isAdmin, login, logout };
}
