# Auth Portability Guide

## TL;DR: Copy 4 Files, Done in 30 Minutes

All projects share the same Supabase instance → Auth automatically works across all!

---

## What Needs to Be Copied

### Files to Copy (4 files total):

```
FROM: recursive-creator/
TO: recursive-channels-fresh/ OR jongu-tool-best-possible-self/

1. src/components/auth/DualAuth.tsx        → Auth modal component
2. src/app/auth/callback/route.ts          → Magic link handler
3. src/lib/supabase-client.ts              → (already exists, verify version)
4. src/lib/supabase-server.ts              → (already exists, verify version)
```

### Files to Update:

```
5. Any page using auth → Replace MagicLinkAuth with DualAuth
   Example: src/app/dashboard/page.tsx
```

---

## Why It's So Easy

**Single Supabase Project:**
```
All apps use: https://yoursrpohfbpxoalyoeg.supabase.co
             ↓
        One auth system
        One user table
        One session store
             ↓
    Cookie-based SSO works automatically!
```

**What's Shared:**
- ✅ User accounts (auth.users)
- ✅ Sessions (stored in Supabase)
- ✅ Auth cookies (set by middleware)
- ✅ Email templates (configured once)

**What's Project-Specific:**
- ❌ Only the UI components (React components)
- ❌ Auth callback routes (but same logic)

---

## Step-by-Step Migration

### For recursive-channels-fresh:

**Step 1: Copy Component**
```bash
# From recursive-creator to recursive-channels-fresh
cp recursive-creator/src/components/auth/DualAuth.tsx \
   recursive-channels-fresh/src/components/auth/DualAuth.tsx
```

**Step 2: Copy Callback Route**
```bash
cp recursive-creator/src/app/auth/callback/route.ts \
   recursive-channels-fresh/src/app/auth/callback/route.ts
```

**Step 3: Update Dashboard**
```typescript
// recursive-channels-fresh/src/app/dashboard/page.tsx

// BEFORE:
import { MagicLinkAuth } from '@/components/MagicLinkAuth';

// AFTER:
import { DualAuth } from '@/components/auth/DualAuth';

// Replace usage:
<MagicLinkAuth isOpen={showAuth} onClose={...} />
// becomes:
<DualAuth />
```

**Step 4: Test**
```bash
cd recursive-channels-fresh
npm run dev
# Visit http://localhost:3003/dashboard
# Try logging in with OTP
```

**Total time: ~15 minutes**

---

### For jongu-tool-best-possible-self:

**Same process as above!**

1. Copy `DualAuth.tsx`
2. Copy `auth/callback/route.ts`
3. Replace `MagicLinkAuth` with `DualAuth`
4. Test

**Total time: ~15 minutes**

---

## Supabase Configuration (One-Time)

**Only needs to be done ONCE for all projects:**

### Update Email Template:

1. Go to Supabase Dashboard → Auth → Email Templates → Magic Link
2. Update template to include `{{ .Token }}` for OTP code:

```html
<h2>Sign in to Recursive.eco</h2>

<p><strong>Option 1: Click to sign in</strong></p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>

<p><strong>Option 2: Enter this code</strong></p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">
  {{ .Token }}
</p>

<p>Code expires in 1 hour.</p>
```

3. Save

### Update Redirect URLs:

Auth → URL Configuration → Redirect URLs:
```
https://creator.recursive.eco/auth/callback
https://channels.recursive.eco/auth/callback
https://journal.recursive.eco/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback
http://localhost:3003/auth/callback
```

**That's it!** All projects now use dual auth.

---

## Testing Across Projects

### Test SSO (Single Sign-On):

1. Log in on channels.recursive.eco
2. Visit creator.recursive.eco
3. → Should already be logged in! ✅

**Why it works:**
- Same Supabase project
- Same auth cookies
- Same user account
- Cross-domain SSO already configured

---

## Timeline Summary

| Task | Time |
|------|------|
| Copy files to channels | 15 min |
| Copy files to journal | 15 min |
| Update Supabase email template | 5 min |
| Test all projects | 15 min |
| **Total** | **50 min** |

---

## Benefits

**For Users:**
- ✅ One account across all Recursive.eco apps
- ✅ Login once, access everything
- ✅ Magic link OR OTP (their choice)

**For You:**
- ✅ No per-project auth config
- ✅ Fix auth once, fixed everywhere
- ✅ Single source of truth
- ✅ Easy to maintain

---

## Future Projects

When you create a new Recursive.eco project:

1. Copy same 4 auth files
2. Add callback URL to Supabase
3. Done!

**Time: ~10 minutes per new project**

---

## Conclusion

**Auth portability = TRIVIAL** because:
- Single Supabase instance
- Cookie-based SSO
- Just copy components
- No configuration per project
- Test once, works everywhere

**You made the right decision using shared Supabase!** 🎉
