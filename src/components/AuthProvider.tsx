'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Session } from '@supabase/supabase-js';

type AppUser = {
  id: string;
  role: 'parent' | 'child';
  display_name: string;
};

type AuthContextType = {
  session: Session | null;
  userProfile: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  userProfile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = supabaseBrowser();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data as AppUser;
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
