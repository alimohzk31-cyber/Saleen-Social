import { createClient } from '@supabase/supabase-js';

// ---------- SECURITY PHASE 1 ----------
// Only publishable (anon) credentials live in the frontend.
// NEVER put a service_role key or a database password here.
// Identity comes from Supabase Auth (auth.uid()) — the forgeable
// client headers (x-owner-id / x-admin-mode) have been REMOVED.
// --------------------------------------
export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://nnxrjpitjxtceydlcxzm.supabase.co';
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueHJqcGl0anh0Y2V5ZGxjeHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDkyMjMsImV4cCI6MjA5MTIyNTIyM30.Ui1IQ4OOJ8wngBoNIBNe0nTCQgfm0q8P7AjrKhyAU4w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // keep the authenticated session across reloads
    autoRefreshToken: true,
    detectSessionInUrl: true,   // support email confirmation / OAuth redirects
  },
});

if (!(import.meta as any).env.VITE_SUPABASE_URL || !(import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
  console.warn("WARNING: Using hardcoded Supabase credentials because environment variables are missing.");
}
