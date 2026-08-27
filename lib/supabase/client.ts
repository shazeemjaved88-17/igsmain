// lib/supabase/client.ts
// Browser-side Supabase client for use in Client Components ('use client')
// Includes build-time guard for placeholder env vars during static prerendering
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // During build-time static generation, env vars may be placeholders.
  // Return a client with a valid-looking URL to prevent build crashes.
  // The client won't make real network calls during prerendering.
  if (!url.startsWith('http')) {
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
  }

  return createBrowserClient(url, key);
}
