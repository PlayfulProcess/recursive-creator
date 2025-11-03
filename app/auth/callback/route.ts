import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  console.log('🔐 Auth callback received:', {
    token_hash: token_hash ? 'present' : 'missing',
    type,
    origin: requestUrl.origin,
    fullUrl: requestUrl.href
  });

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error && data.user) {
      console.log('✅ Auth successful for user:', data.user.email);
      // Redirect to dashboard or specified next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error('❌ Auth verification failed:', error?.message || 'Unknown error');

    // Pass error details to error page
    const errorUrl = new URL('/auth/error', requestUrl.origin);
    errorUrl.searchParams.set('error', error?.message || 'Authentication failed');
    return NextResponse.redirect(errorUrl);
  }

  console.error('❌ Missing token_hash or type in callback');
  // If verification failed, redirect to error page
  const errorUrl = new URL('/auth/error', requestUrl.origin);
  errorUrl.searchParams.set('error', 'Missing authentication parameters');
  return NextResponse.redirect(errorUrl);
}
