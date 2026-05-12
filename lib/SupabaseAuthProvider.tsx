'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

type AuthContextType = {
  user: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Probeer eerst session te refreshen
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session error, attempting refresh:', error.message);
        // Probeer te refreshen als er een error is
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (mounted) {
          setUser(refreshData?.session?.user ?? null);
          setLoading(false);
        }
        return;
      }
      
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
      
      setUser(session?.user ?? null);
    });

    // Refresh session elke 10 minuten om uitloggen te voorkomen
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }
    }, 10 * 60 * 1000); // 10 minuten

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
