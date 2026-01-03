import { createClient } from '@supabase/supabase-js';

// Helper to safely read runtime env (works in browser/runtime only)
function readRuntimeEnv(key) {
  if (typeof window === 'undefined') return undefined;
  return window?.[key] || window?.PUBLIC_ENV?.[key] || undefined;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || readRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || readRuntimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let supabase = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    // Fallback to a harmless placeholder so Next.js build does not throw when env is missing.
    // Note: app features that depend on Supabase will be disabled until real env vars are provided.
    const placeholderUrl = 'https://example.supabase.co';
    const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
    supabase = createClient(placeholderUrl, placeholderKey);
    // Disable all network calls on the placeholder client to prevent misuse in dev without envs.
    supabase.removeAllSubscriptions?.();
  }
} catch (e) {
  // If creation still fails, keep supabase null so callers can gate on its presence.
  supabase = null;
}

export { supabase };
export default supabase;
