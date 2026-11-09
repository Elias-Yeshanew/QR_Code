import { useEffect, useState } from 'react';
import { db } from './cardStore';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => db.isAdmin());

  useEffect(() => db.subscribeAuth(setIsAdmin), []);

  return {
    isAdmin,
    login: (pin: string) => db.login(pin),
    logout: () => db.logout(),
  };
}
