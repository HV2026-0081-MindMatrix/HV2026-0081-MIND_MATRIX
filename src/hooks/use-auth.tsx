import { createContext, useContext, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

// Fixed guest identity — matches migration 002 (supabase/migrations/...002_remove_authentication.sql)
export const GUEST_USER_ID = '00000000-0000-4000-8000-000000000001';

const GUEST_USER = {
  id: GUEST_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'guest@mindmatrix.local',
  app_metadata: {},
  user_metadata: { full_name: 'Guest' },
  created_at: '1970-01-01T00:00:00.000Z',
  updated_at: '1970-01-01T00:00:00.000Z',
} as User;

const GUEST_PROFILE: Profile = {
  id: GUEST_USER_ID,
  user_id: GUEST_USER_ID,
  full_name: 'Guest',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthContextValue {
  session: Session | null;
  user: User;
  profile: Profile;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    session: null,
    user: GUEST_USER,
    profile: GUEST_PROFILE,
    loading: false,
    signOut: async () => {},
    refreshProfile: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
