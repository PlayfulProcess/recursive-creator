# Auth Implementation Plan: Magic Link + OTP Fallback

> Reliable authentication for Recursive.eco ecosystem
> Build once, copy everywhere

---

## The Problem

**Current state:**
- Magic links work on Gmail ✅
- Magic links fail on other providers (Outlook, Yahoo, ProtonMail) ❌
- Users get frustrated and can't log in

**Why magic links fail:**
- Aggressive spam filters
- Email clients blocking external links
- Corporate email security policies
- Delay in email delivery

---

## The Solution: Dual Auth in One Email

**Supabase supports sending BOTH in one email:**

```
📧 Email Subject: Sign in to Recursive.eco

Hi there!

Click this link to sign in:
→ https://recursive.eco/auth/callback?token=...

Or enter this code on the sign-in page:
→ 123456

This code expires in 1 hour.
```

**User experience:**
1. User enters email
2. ONE email arrives with BOTH options
3. Gmail users → click link ✅
4. Other users → type 6-digit code ✅
5. Everyone can log in!

---

## Technical Implementation

### 1. Supabase Configuration

**Email Template (Dashboard → Auth → Email Templates → Magic Link):**

```html
<h2>Sign in to Recursive.eco</h2>

<p>Hi there!</p>

<p><strong>Option 1: Click to sign in</strong></p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Recursive.eco</a></p>

<p><strong>Option 2: Enter this code</strong></p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
  {{ .Token }}
</p>

<p>This code expires in 1 hour.</p>

<p>If you didn't request this, you can safely ignore this email.</p>
```

**Settings (Dashboard → Auth → Providers → Email):**
- ✅ Enable email provider
- ✅ Confirm email: OFF (for passwordless, optional)
- ⏱️ OTP expiration: 3600 seconds (1 hour)
- ⏱️ Rate limit: 60 seconds between requests

---

### 2. Frontend Implementation

**Component: `src/components/auth/DualAuth.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type AuthMode = 'email' | 'verify';

export function DualAuth() {
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const supabase = createClient();

  // Step 1: Send email with magic link + OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // This will send BOTH magic link and OTP in one email
          shouldCreateUser: true, // Allow signup via auth
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Check your email! We sent you a magic link and a 6-digit code to ${email}`,
      });
      setMode('verify');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send email. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      // Success! User is now logged in
      window.location.href = '/dashboard';
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Invalid code. Please check and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'New code sent! Check your email.',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to resend. Please wait 60 seconds.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      {/* Step 1: Enter Email */}
      {mode === 'email' && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-600 text-sm">
              Enter your email to receive a magic link and verification code
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send Magic Link & Code'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            We'll send you an email with both a clickable link and a 6-digit code
          </p>
        </form>
      )}

      {/* Step 2: Verify OTP */}
      {mode === 'verify' && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 text-sm mb-4">
              We sent an email to <strong>{email}</strong>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2"><strong>Option 1:</strong> Click the magic link in the email</p>
              <p className="text-sm text-blue-800"><strong>Option 2:</strong> Enter the 6-digit code below</p>
            </div>
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              Enter 6-digit code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              maxLength={6}
              pattern="\d{6}"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setMode('email');
                setOtp('');
                setMessage(null);
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              Resend code
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Code expires in 1 hour • Can request new code after 60 seconds
          </p>
        </form>
      )}
    </div>
  );
}
```

---

### 3. Auth Callback Route

**File: `src/app/auth/callback/route.ts`**

This handles magic link clicks (OTP verification is handled client-side above).

```typescript
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (token_hash && type) {
    const supabase = createClient();

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      // Redirect to dashboard or specified next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If verification failed, redirect to error page
  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin));
}
```

---

### 4. Integration with Existing Auth Pattern

**Keep existing `AuthProvider` from recursive-channels-fresh:**

```typescript
// src/components/AuthProvider.tsx
// Copy from recursive-channels-fresh as-is

// Just replace MagicLinkAuth component with DualAuth
import { DualAuth } from '@/components/auth/DualAuth';

// Use DualAuth wherever you used MagicLinkAuth before
```

---

## User Experience Flow

### Happy Path (Magic Link Works):

```
1. User enters email
2. Email arrives (both magic link + OTP)
3. User clicks magic link
4. → Redirected to /auth/callback
5. → Verified and redirected to /dashboard
6. ✅ Logged in!
```

### Fallback Path (Magic Link Blocked):

```
1. User enters email
2. Email arrives (both magic link + OTP)
3. Magic link doesn't work (spam filter, etc.)
4. User sees 6-digit code in email: 123456
5. User types code on sign-in page
6. → Client-side OTP verification
7. ✅ Logged in!
```

### Edge Cases:

**Code expired:**
- User clicks "Resend code"
- New email sent (rate-limited to 60 seconds)

**Wrong code entered:**
- Error message: "Invalid code. Please check and try again."
- User can retry or request new code

**Email not received:**
- User clicks "Resend code" after 60 seconds
- Check spam folder (add to instructions)

---

## Testing Checklist

### Email Providers to Test:

- [ ] Gmail (magic link should work)
- [ ] Outlook (test both magic link and OTP)
- [ ] Yahoo (test both)
- [ ] ProtonMail (test both)
- [ ] Corporate email (if possible)
- [ ] Custom domain email

### Scenarios to Test:

- [ ] Fresh signup (new user)
- [ ] Returning user (existing user)
- [ ] Magic link works immediately
- [ ] Magic link fails, OTP works
- [ ] Code expires (wait 1 hour)
- [ ] Resend code (wait 60 seconds)
- [ ] Wrong code entered
- [ ] Multiple login attempts
- [ ] Logout and login again

---

## Copy to Other Projects

Once working in recursive-creator, copy to:

### recursive-channels-fresh
```bash
# Copy files:
src/components/auth/DualAuth.tsx
src/app/auth/callback/route.ts

# Replace MagicLinkAuth with DualAuth:
src/app/dashboard/page.tsx
src/app/page.tsx (anywhere auth is used)

# Update email template in Supabase Dashboard
```

### jongu-tool-best-possible-self
```bash
# Same process as above
# Ensure supabase client/server libs are up to date
```

### recursive-landing
```bash
# If adding auth to landing page (optional)
# Copy same files
```

---

## Configuration Per Project

**Supabase Email Template:**
Each project can customize the email, but structure is same:
- Magic link: `{{ .ConfirmationURL }}`
- OTP code: `{{ .Token }}`

**Redirect URLs:**
Update callback URLs in Supabase Dashboard → Auth → URL Configuration:
```
Redirect URLs:
https://creator.recursive.eco/auth/callback
https://channels.recursive.eco/auth/callback
https://journal.recursive.eco/auth/callback
http://localhost:3000/auth/callback (dev)
http://localhost:3001/auth/callback (dev)
http://localhost:3002/auth/callback (dev)
```

---

## Timeline

### Day 1: Core Implementation (4-6 hours)
- [ ] Create `DualAuth.tsx` component
- [ ] Create auth callback route
- [ ] Update email template in Supabase
- [ ] Test basic flow locally

### Day 2: Polish & Edge Cases (3-4 hours)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add resend functionality
- [ ] Style to match Recursive.eco design
- [ ] Add accessibility (keyboard nav, ARIA labels)

### Day 3: Testing (3-4 hours)
- [ ] Test across email providers
- [ ] Test edge cases (expired, wrong code, etc.)
- [ ] Test on mobile
- [ ] Test rate limiting

### Day 4: Documentation & Copying (2-3 hours)
- [ ] Document the pattern
- [ ] Create migration guide for other projects
- [ ] Copy to recursive-channels-fresh
- [ ] Test cross-project SSO

**Total: 3-4 days to bulletproof auth across all projects**

---

## Benefits of Doing This First

### Technical:
- ✅ Reliable auth = easier to test other features
- ✅ No refactoring later
- ✅ Session handling is solid from start
- ✅ Copy to all projects immediately

### User Experience:
- ✅ Works for Gmail users (magic link)
- ✅ Works for everyone else (OTP)
- ✅ One email, two options
- ✅ Clear instructions

### Development:
- ✅ Test dashboard features with working auth
- ✅ No frustration during development
- ✅ Build on solid foundation

---

## Alternative: Do Fun Stuff First

**If you really want to:**

You CAN build stories/playlists first and add OTP later. But:

⚠️ **Risks:**
- Testing is frustrating (magic links fail)
- Might discover auth issues late
- Harder to test private/public visibility
- Other projects stay broken for weeks

⏱️ **Timeline trade-off:**
- Save: 3-4 days now
- Cost: Potential 1-2 weeks debugging later + frustration

---

## My Recommendation

**Build auth first.** Here's why:

1. **3-4 days investment** → months of reliable auth
2. **Test fun features properly** with working auth
3. **Copy to all projects** immediately (fix channels/journal now)
4. **No refactoring risk** later
5. **Better developer experience** during implementation

**Once auth is solid:**
- Build stories with confidence ✅
- Test private/public properly ✅
- No login frustration ✅
- Clear path forward ✅

---

## Next Steps

**If you agree with auth-first approach:**

1. ✅ Approve this plan
2. 🔨 Initialize recursive-creator project
3. 🔨 Copy auth files from recursive-channels-fresh
4. 🔨 Implement DualAuth component
5. 🔨 Update Supabase email template
6. 🧪 Test across email providers
7. 📋 Then move to fun stuff (stories/playlists)

**If you prefer fun-first:**
- I'll start on story publisher immediately
- We'll add OTP in Phase 5 (week 9-10)
- Accept testing friction in the meantime

Let me know what you decide! 🚀
