// lib/supabase/client.ts
// Browser-side Supabase client for use in Client Components ('use client')
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://civszbqmdhchmemuaqvo.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_KpSj3iMjxfEJG4LYU0rfYg_wNCcGvno';

  return createSupabaseClient(url, key);
}
