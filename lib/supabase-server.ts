import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const headersList = await headers()

  // Environment-aware cookie configuration
  const host = headersList.get('host') || '';
  const isProduction = host.endsWith('recursive.eco');

  // Only set domain for production .recursive.eco domains
  // Leave undefined for localhost and vercel.app
  const cookieDomain = isProduction ? '.recursive.eco' : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'recursive-eco-auth'
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Environment-aware cookie options
              const cookieOptions = {
                ...options,
                domain: cookieDomain,
                path: '/',
                sameSite: 'lax' as const,
                secure: isProduction, // Only require HTTPS on production
              };
              cookieStore.set(name, value, cookieOptions);
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
