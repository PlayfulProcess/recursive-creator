import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Environment-aware cookie configuration
  const isServer = typeof window === 'undefined';
  const hostname = isServer ? '' : window.location.hostname;
  const isProduction = hostname.endsWith('recursive.eco');

  // Only set domain for production .recursive.eco domains
  // Leave undefined for localhost and vercel.app (browser default)
  const cookieDomain = isProduction ? '.recursive.eco' : undefined;

  // Ensures session is persisted (not just in-memory)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'recursive-eco-auth'
      },
      cookieOptions: {
        domain: cookieDomain,
        maxAge: 100000000,
        path: '/',
        sameSite: 'lax',
        secure: isProduction, // Only require HTTPS on production
      },
    }
  )
}
