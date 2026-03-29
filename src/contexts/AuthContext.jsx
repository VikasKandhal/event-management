import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ── AuthProvider ────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchProfile = async (uid, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn(`fetchProfile attempt ${i + 1} failed:`, error.message);
      }

      if (data) {
        if (mountedRef.current) setProfile(data);
        return data;
      }

      // Wait before retrying (only if not last attempt)
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, 400));
      }
    }

    console.warn('fetchProfile: profile not found after retries for uid:', uid);
    if (mountedRef.current) setProfile(null);
    return null;
  };

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('getSession error:', error.message);
          return;
        }

        if (!session?.user) {
          if (mountedRef.current) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        if (mountedRef.current) setUser(session.user);
        await fetchProfile(session.user.id);
      } catch (err) {
        console.error('INIT ERROR:', err);
      } finally {
        // Always stop the loading spinner, regardless of success/failure
        if (mountedRef.current) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            if (mountedRef.current) setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            if (mountedRef.current) {
              setUser(null);
              setProfile(null);
            }
          }
        } catch (err) {
          console.error('AUTH CHANGE ERROR:', err);
        } finally {
          if (mountedRef.current) setLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = async (email, password, fullName, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    if (error) return { error };

    if (data.user) {
      if (data.session) {
        // Session available immediately (no email confirmation required).
        // The DB trigger should have already created the profile row,
        // but we do an upsert as a safety-net.
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            { id: data.user.id, full_name: fullName, role },
            { onConflict: 'id' }
          );
        if (profileError) {
          await supabase.auth.signOut();
          return { error: { message: 'Account created but profile setup failed: ' + profileError.message } };
        }
        setUser(data.user);
        setProfile({ id: data.user.id, full_name: fullName, role });
      } else {
        // Email confirmation required — the DB trigger will create the profile
        // when the user confirms and the auth.users row is fully activated.
        return {
          data,
          error: null,
          requiresEmailConfirmation: true,
        };
      }
    }
    return { data, error: null };
  };

  const signOut = async () => {
    // Clear local state first so UI reacts instantly
    setUser(null);
    setProfile(null);
    setLoading(false);
    // Attempt server-side sign out (may fail if Supabase is unreachable — that's ok)
    await supabase.auth.signOut().catch(() => {});
    // Wipe any Supabase tokens left in localStorage as a safety net
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── useAuth hook ─────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}
