# SafeLinks Mitigation: Intermediate Landing Page

## Problem

Microsoft SafeLinks (and similar corporate email security tools) automatically scan and follow links in emails. This causes two major issues with authentication:

1. **Magic Links:** Scanners consume the one-time token before the user clicks
2. **OTP Codes:** Even OTP can fail if scanners modify email content

Example of rewritten link:
```
https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fevixjvagwjmjdjpbazuj.supabase.co%2Fauth%2Fv1%2Fverify...
```

## Solution: Intermediate Landing Page

Instead of sending the Supabase verification URL directly, send users to a landing page on your domain that requires a button click to complete verification.

**Flow:**
1. User receives email with link to your landing page
2. Scanner prefetches the landing page (no harm done)
3. User opens page and sees explanation + button
4. Scanner doesn't click buttons (they just fetch pages)
5. User clicks button → verification happens server-side
6. User is redirected to dashboard

## Implementation

### 1. Landing Page

**File:** `app/confirm-email/page.tsx`

**Features:**
- Displays clear instructions
- Requires button click (scanners won't click)
- Fallback OTP input field
- Server-side verification via API route
- Dark mode support

**URL format:**
```
https://creator.recursive.eco/confirm-email?confirmation_url={{ .ConfirmationURL }}
```

### 2. Server-Side API Route

**File:** `app/api/auth/verify/route.ts`

**What it does:**
- Accepts POST requests with `confirmation_url` or `email + token`
- Extracts `token_hash` from confirmation URL
- Calls Supabase `verifyOtp` server-side
- Returns success + redirect URL
- Logs all attempts for debugging

**Advantages of server-side:**
- Token never exposed in client JavaScript
- Session handling is secure
- Can set HttpOnly cookies if needed
- Better logging and error handling

### 3. Updated Email Template

**Supabase Dashboard → Authentication → Email Templates → Magic Link**

Replace the template with this:

```html
<h2>Sign in to Recursive.eco</h2>

<p>Click the button below to complete your sign in:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="https://creator.recursive.eco/confirm-email?confirmation_url={{ .ConfirmationURL }}&email={{ .Email }}"
     style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
    Complete Sign In
  </a>
</p>

<div style="margin-top: 20px; padding: 15px; background-color: #DBEAFE; border-left: 4px solid #3B82F6; font-size: 14px;">
  <p style="color: #1E40AF; margin: 0;"><strong>Two ways to sign in:</strong></p>
  <ul style="color: #1E3A8A; margin: 10px 0;">
    <li><strong>Option 1:</strong> Click the button above</li>
    <li><strong>Option 2:</strong> Use this 6-digit code: <strong style="font-size: 24px; font-family: monospace; letter-spacing: 3px;">{{ .Token }}</strong></li>
  </ul>
  <p style="color: #1E3A8A; margin: 10px 0 0 0;">
    If you're using corporate email (Outlook, etc.), the 6-digit code is most reliable.
  </p>
</div>

<p style="font-size: 12px; color: #666; margin-top: 20px;">
  This code expires in 1 hour.<br>
  If you didn&apos;t request this, you can safely ignore it.
</p>

<p style="font-size: 12px; color: #999; margin-top: 20px;">
  <strong>Why an extra step?</strong> This landing page protects your sign-in from being scanned by corporate email security tools.
</p>
```

**Key changes:**
1. Link goes to `/confirm-email` instead of Supabase directly
2. Both confirmation URL and email are passed as parameters
3. OTP code is prominently displayed as fallback
4. Clear explanation of why this approach is used

### 4. Redirect URLs in Supabase

**Supabase Dashboard → Authentication → URL Configuration**

Add these redirect URLs:
- `https://creator.recursive.eco/confirm-email` (production)
- `https://*.vercel.app/confirm-email` (Vercel previews)
- `http://localhost:3012/confirm-email` (local dev)

## Testing

### Test with Corporate Email

1. **Send test email** to a corporate address (Outlook, PepsiCo, etc.)
2. **Check email** - should see button and OTP code
3. **Click link** - should open landing page (not directly to Supabase)
4. **Wait 5 seconds** - scanner may have prefetched page
5. **Click "Complete Sign In" button** - should verify and redirect
6. **If button fails** - try entering the 6-digit OTP code

### Test Locally

```bash
cd recursive-creator
npm run dev -- --port 3012

# Visit: http://localhost:3012/confirm-email?confirmation_url=https://...
```

### Debugging

Check logs in Vercel or terminal for:
```
🔐 Verification request: { hasConfirmationUrl: true, ... }
🔗 Extracted from URL: { token_hash: '...', urlType: 'magiclink' }
✅ Magic link verified successfully
```

## Why This Works

### Problem: Scanner Consumes Token
**Before:**
```
Email → [SafeLinks Scanner] → Supabase verify URL → Token consumed → User can't log in
```

**After:**
```
Email → [SafeLinks Scanner] → Landing page (harmless prefetch)
User clicks button → API route → Supabase verify URL → Token consumed by real user → Success!
```

### Key Insight

Scanners will:
- ✅ Follow links (prefetch pages)
- ✅ Download HTML
- ❌ NOT click buttons
- ❌ NOT submit forms
- ❌ NOT execute JavaScript that requires user interaction

So the landing page gets scanned harmlessly, but the verification only happens when the user clicks.

## Advanced: Alternative Approaches

### Option A: Disable Link Tracking on SMTP

If you use a custom SMTP provider (SendGrid, Postmark, etc.):
1. Go to provider settings
2. Disable "click tracking" for transactional emails
3. Disable "link rewriting"

This prevents the provider from wrapping your links, but doesn't solve SafeLinks.

### Option C: OTP Only (No Magic Link)

Simplest approach:
1. Only send {{ .Token }} in email
2. User must type code manually
3. No links for scanners to follow

This works but has worse UX for non-corporate users.

## Migration Plan

### For Existing Projects

1. **Copy files to other projects:**
   ```bash
   # Copy landing page
   cp recursive-creator/app/confirm-email/page.tsx your-project/app/confirm-email/

   # Copy API route
   cp recursive-creator/app/api/auth/verify/route.ts your-project/app/api/auth/verify/
   ```

2. **Update Supabase email template** (same for all projects)

3. **Update redirect URLs** in Supabase for each domain

4. **Test with corporate email**

### Rollout Strategy

1. **Week 1:** Deploy to recursive-creator (proof of concept)
2. **Week 2:** Test with multiple corporate email providers
3. **Week 3:** Roll out to recursive-channels-fresh
4. **Week 4:** Roll out to jongu-tool-best-possible-self

## Monitoring

### Success Metrics

- % of users who complete verification (should increase)
- Time to verify (should decrease - no waiting for support)
- Support tickets about "link doesn't work" (should decrease)

### Logs to Watch

In Vercel logs or server logs:
```
✅ Magic link verified successfully      # Good!
✅ OTP verified successfully             # Good! (fallback worked)
❌ OTP verification failed: invalid      # User error (wrong code)
❌ Magic link verification failed: expired # Token too old
```

## FAQ

### Q: Won't this slow down sign-in?

A: Only by 1-2 seconds (one extra page load). The benefit (working auth for corporate users) far outweighs this minor inconvenience.

### Q: Can I skip this for Gmail users?

A: Technically yes, but then you need two different email templates. Simpler to use one approach for all users.

### Q: What if the landing page also gets scanned?

A: Scanners only prefetch pages, they don't click buttons or submit forms. The verification only happens when the user interacts.

### Q: Is this secure?

A: Yes! Server-side verification means the token never enters client JavaScript. The API route validates the token with Supabase before redirecting.

### Q: Do I need a service role key?

A: No! The regular supabase-server client works fine. Service role is only needed for admin operations.

## Support

If users report issues:

1. **Check Vercel logs** for verification attempts
2. **Ask them to try OTP** instead of magic link
3. **Verify email template** has correct URL
4. **Check redirect URLs** in Supabase are whitelisted
5. **Test with their email provider** (some corporate setups are very strict)

## Resources

- [Supabase Auth with OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Microsoft SafeLinks Documentation](https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/safe-links-about)

## Conclusion

The intermediate landing page approach solves the SafeLinks problem elegantly:
- ✅ Works with all email providers (corporate or personal)
- ✅ Scanners can't consume tokens
- ✅ Provides OTP fallback
- ✅ Better UX (explains what's happening)
- ✅ Secure (server-side verification)
- ✅ Easy to implement
- ✅ Easy to maintain

This is now the recommended authentication flow for all Recursive.eco projects.
