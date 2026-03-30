import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Keep the Supabase connection alive — prevents stale connections
// that cause requests to hang after idle periods (e.g. 10+ min)
setInterval(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.refreshSession();
    }
  } catch {
    // Silently ignore — next user action will re-establish
  }
}, 4 * 60 * 1000); // every 4 minutes
