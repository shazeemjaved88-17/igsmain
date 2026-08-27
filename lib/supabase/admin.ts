// lib/supabase/admin.ts
// Service role Supabase client — for server-side only operations
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://civszbqmdhchmemuaqvo.supabase.co';

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServiceKeyValid =
    serviceRoleKey &&
    serviceRoleKey.trim() !== '' &&
    !serviceRoleKey.includes('your_supabase_service_role_key');

  const key = isServiceKeyValid
    ? serviceRoleKey
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_KpSj3iMjxfEJG4LYU0rfYg_wNCcGvno';

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
