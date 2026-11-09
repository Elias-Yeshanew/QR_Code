import { useState, useEffect } from 'react';
import { db } from './cardStore';
import { WebsiteLink, PortalProfile } from '../types';

/**
 * Hook to subscribe to the in-memory links store.
 * Automatically updates when links are inserted, updated, or removed.
 */
export function useLinks(): WebsiteLink[] {
  const [links, setLinks] = useState<WebsiteLink[]>(() => db.getLinks());

  useEffect(() => {
    return db.subscribeLinks(setLinks);
  }, []);

  return links;
}

/**
 * Hook to subscribe to the in-memory profile store.
 * Automatically updates when profile is updated.
 */
export function useProfile(): PortalProfile {
  const [profile, setProfile] = useState<PortalProfile>(() => db.getProfile());

  useEffect(() => {
    return db.subscribeProfile(setProfile);
  }, []);

  return profile;
}
