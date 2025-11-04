import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { confirmation_url, email, token, type } = body;

    console.log('🔐 Verification request:', {
      hasConfirmationUrl: !!confirmation_url,
      hasEmail: !!email,
      hasToken: !!token,
      type,
    });

    const supabase = await createClient();

    // Method 1: Magic link confirmation URL
    if (confirmation_url) {
      try {
        // Parse the confirmation URL to extract token_hash and type
        const url = new URL(confirmation_url);
        const token_hash = url.searchParams.get('token_hash');
        const urlType = url.searchParams.get('type');

        console.log('🔗 Extracted from URL:', { token_hash, urlType });

        if (!token_hash || !urlType) {
          return NextResponse.json(
            { error: 'Invalid confirmation URL format' },
            { status: 400 }
          );
        }

        // Verify the OTP using token_hash
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: urlType as 'email' | 'magiclink',
        });

        if (error) {
          console.error('❌ Magic link verification failed:', error);
          return NextResponse.json(
            { error: error.message || 'Verification failed' },
            { status: 400 }
          );
        }

        console.log('✅ Magic link verified successfully');

        return NextResponse.json({
          success: true,
          redirect: '/dashboard',
          user: data.user,
        });
      } catch (urlError) {
        console.error('❌ Error parsing confirmation URL:', urlError);
        return NextResponse.json(
          { error: 'Invalid confirmation URL' },
          { status: 400 }
        );
      }
    }

    // Method 2: Manual OTP code entry
    if (email && token && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type as 'email' | 'magiclink',
      });

      if (error) {
        console.error('❌ OTP verification failed:', error);
        return NextResponse.json(
          { error: error.message || 'Invalid code' },
          { status: 400 }
        );
      }

      console.log('✅ OTP verified successfully');

      return NextResponse.json({
        success: true,
        redirect: '/dashboard',
        user: data.user,
      });
    }

    // No valid verification method provided
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
