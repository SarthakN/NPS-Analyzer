import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Signs in anonymously when no session exists.
 * Enables full app functionality without requiring user sign-in.
 */
export const AuthInit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        try {
          await supabase.auth.signInAnonymously();
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Anonymous auth not available:', err);
        }
      }
    };
    initAuth();
  }, []);

  return <>{children}</>;
};
