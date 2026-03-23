import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ── AuthProvider ────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      setProfile(data ?? null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    let settled = false;

    const finish = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    // Hard timeout — loading WILL end within 5 s no matter what
    const hardTimeout = setTimeout(finish, 5000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session?.user) {
        // Stale / invalid session — clear it and show login
        if (error) await supabase.auth.signOut().catch(() => {});
        setUser(null);
        setProfile(null);
        finish();
        return;
      }
      setUser(session.user);
      await Promise.race([
        fetchProfile(session.user.id),
        new Promise((res) => setTimeout(res, 5000)),
      ]);
      finish();
    }).catch(async () => {
      // getSession itself threw — clear stale auth and unblock UI
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
      setProfile(null);
      finish();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        // Also unblock loading if it was still waiting (e.g. SIGNED_OUT event)
        finish();
      }
    );

    return () => {
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = async (email, password, fullName, role) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    if (data.user) {
      // data.session is null when Supabase requires email confirmation.
      // In that case we cannot insert via RLS (no authenticated session),
      // so we skip and let the user sign in after confirming their email.
      if (data.session) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          role,
        });
        if (profileError) {
          // Profile insert failed — sign the user out and surface the error
          await supabase.auth.signOut();
          return { error: { message: 'Account created but profile setup failed: ' + profileError.message } };
        }
        // Manually set profile so UI updates instantly
        setProfile({ id: data.user.id, full_name: fullName, role });
      } else {
        // Email confirmation required — profile will be created after they confirm
        // and sign in (handled via the onAuthStateChange trigger below).
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
    // Force-clear local state first so UI reacts instantly
    setUser(null);
    setProfile(null);
    // Attempt server-side sign out (may fail if Supabase is unreachable — that's ok)
    await supabase.auth.signOut().catch(() => {});
    // Wipe any Supabase tokens left in localStorage as a safety net
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
    // Hard redirect to login
    window.location.href = '/login';
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
