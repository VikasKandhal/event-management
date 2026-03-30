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
      try {
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
      } catch (err) {
        console.warn(`fetchProfile attempt ${i + 1} threw:`, err.message);
      }

      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, 500 * Math.pow(2, i)));
      }
    }

    // Profile row doesn't exist — auto-create it from auth user metadata
    console.warn('fetchProfile: profile not found, attempting auto-create for uid:', uid);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata || {};
      const fullName = meta.full_name || meta.name || authUser?.email?.split('@')[0] || 'User';
      const role = meta.role || 'organizer';

      const { data: newProfile, error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: uid, full_name: fullName, role }, { onConflict: 'id' })
        .select()
        .single();

      if (upsertErr) {
        console.error('Auto-create profile failed:', upsertErr.message);
        if (mountedRef.current) setProfile(null);
        return null;
      }

      console.log('Auto-created profile:', newProfile);
      if (mountedRef.current) setProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error('Auto-create profile threw:', err);
      if (mountedRef.current) setProfile(null);
      return null;
    }
  };

  // Exposed so UI can offer a "Retry" button
  const refetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    await fetchProfile(user.id);
    setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Safety-net: if auth hasn't resolved in 8 seconds, force loading off
    // (shows login page so the user isn't stuck)
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('Auth safety timeout — forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    // Use onAuthStateChange as the SOLE source of truth.
    // Supabase fires INITIAL_SESSION immediately (sync) with the cached session,
    // so we don't need getSession() which can hang on token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        try {
          if (session?.user) {
            if (mountedRef.current) setUser(session.user);

            // Fetch profile with a 10s timeout so it can never hang forever
            const profilePromise = fetchProfile(session.user.id);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
            );

            try {
              await Promise.race([profilePromise, timeoutPromise]);
            } catch (err) {
              console.warn('Profile fetch timed out or errored:', err.message);
              // Profile couldn't be loaded, but user IS authenticated
              // — the ProtectedRoute will show the Retry button
            }
          } else {
            if (mountedRef.current) {
              setUser(null);
              setProfile(null);
            }
          }
        } catch (err) {
          console.error('AUTH CHANGE ERROR:', err);
        } finally {
          clearTimeout(safetyTimeout);
          if (mountedRef.current) setLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── useAuth hook ─────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}
