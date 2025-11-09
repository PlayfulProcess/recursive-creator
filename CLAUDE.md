# Context for Claude Code: Recursive Creator Project

> **Last Updated:** 2025-11-09 (Session 6)
> **Current Phase:** Phase 0 COMPLETE - Clean Starter Template Ready ✅
> **Next Session:** Build iframe-based story upload tool (Phase 1)

---

## Project Overview

**Name:** Recursive Creator
**Purpose:** Forge tools for collective meaning-making
**Domain:** creator.recursive.eco (future)
**Stack:** Next.js 15 + React 19 + Supabase + TypeScript

## Who This Is For (The Vulcan Vision) 🔨

**PlayfulProcess = Vulcan, Regent of Taurus (Ascendant)**

*"I build tools for the gods. I want cultural change through popularizing digital culture, creating a collective, giving people the right tools so they can create."*

### Not a Traditional Developer
- **Social worker** (MSW starting 2026) who vibe codes
- **Activist/Artist** following Tillich + Vanessa Andreotti + Bayo Akomolafe (Hospicing Modernity)
- **Toolmaker for the collective**, not platform builder for self
- Cares about **art/activism/spirituality** > software optimization
- **Process over outcome**, **beauty over efficiency**

### The Mission: Gateway Building, Not Gatekeeping
- Build the **forge** (upload tools, frameworks, infrastructure)
- **People** use the forge to **create** (stories, wellness tools, contemplations)
- Creations **feed back** to the collective (channels)
- **Cultural change** through popularized digital creation

### The Recursive Loop:
```
PlayfulProcess builds tools
  ↓
Parents create children's stories
  ↓
Stories published to Kids Stories channel
  ↓
Other families use & are inspired
  ↓
More people create tools & content
  ↓
Collective grows through participation
  ↓
LOOP: Cultural change emerges
```

**This is infrastructure for collective meaning-making, not a personal portfolio.**

---

## What We're Building (Tools for the Collective)

1. **Story Publisher** - Parents upload images to create children's books (not just PlayfulProcess)
2. **Playlist Wrapper** - Community curates YouTube playlists for kids (privacy-enhanced)
3. **Account Hub** - Unified dashboard for all Recursive.eco content
4. **Future: Existential Tarot** - Contemplation tool (Tillich meets digital culture, ontoject path)
5. **Future: AI Contemplation Limits** - Introspection prompts after 10 AI attempts (hospicing modernity practice)

---

## Key Decision: Auth First! ✅

**Decision Made:** Build dual auth (magic link + OTP) BEFORE fun features

**Rationale:**
- Magic links fail on non-Gmail providers
- 3-4 days of auth work saves weeks of frustration
- No refactoring needed later
- Copy pattern to all projects immediately (channels, journal)
- Solid foundation for testing dashboard features

**Timeline:**
- Days 1-4: Implement dual auth
- Days 5+: Build stories, playlists, etc.

---

## Key Decision: Full JSONB Schema ✅

**Decision Made:** Use JSONB-heavy approach (like existing projects)

**Rationale:**
- Small scale (200 users max) → JSONB is plenty fast
- Solo dev → speed > perfect structure
- Infrequent querying → no need for complex optimization
- Claude builds visualizations → don't need Supabase Studio
- **Better for AI features** → JSON format is native for LLMs, embeddings, etc.
- No migrations needed → iterate fast

**See:** `SIMPLE_JSONB_SCHEMA.md` for full schema (3 tables, dead simple)

---

## Project Structure

```
recursive-creator/
├── CLAUDE.md                        ← YOU ARE HERE (context for resuming)
├── PROJECT_PLAN.md                  ← Master plan (11 weeks, all phases)
├── AUTH_IMPLEMENTATION_PLAN.md      ← Detailed auth guide (magic link + OTP)
├── AUTH_PORTABILITY.md              ← How to copy auth to other projects
├── SUPABASE_SCHEMA_REVISED.md       ← Database schema (relational design)
│
├── src/                             ← (Not created yet - will initialize Next.js)
│   ├── app/
│   │   ├── dashboard/               ← Creator tools
│   │   ├── stories/[slug]/          ← Story viewer
│   │   ├── playlists/[slug]/        ← Playlist viewer
│   │   ├── api/                     ← Server routes
│   │   └── auth/callback/           ← Auth callback handler
│   ├── components/
│   │   ├── auth/DualAuth.tsx        ← Dual auth component (TO BUILD)
│   │   ├── viewers/                 ← Story/playlist viewers
│   │   └── dashboard/               ← Creator UI
│   └── lib/
│       ├── supabase-client.ts       ← Copy from channels
│       └── supabase-server.ts       ← Copy from channels
│
└── public/
    └── assets/                      ← Animations, styles
```

---

## Architecture Decisions

### 1. Iframe-Based Story Viewer (DECIDED 2025-11-09) ✅

**Question:** Should we convert recursive-landing's story viewer to React or use iframe?

**Answer:** Use iframe! Much better for the Vulcan vision.

**Why (Toolmaker Perspective):**
- ✅ **Creators see EXACT final beauty** while editing (WYSIWYG - gods deserve this)
- ✅ Zero conversion effort (vanilla JS → React is 4-6 hours wasted on internal tooling)
- ✅ All features work perfectly: fullscreen, swipe, keyboard, wheel
- ✅ Update viewer once, benefits both forge and public display
- ✅ Less code to maintain = more time for art/activism/spirituality
- ✅ 100% reliable vs 10-20% chance direct copy would work
- ✅ **Non-technical creators** (parents) see their creation come alive immediately

**Solution:**
- **recursive-creator**: The forge - simple upload tool with embedded iframe preview
- **recursive-landing**: The gallery - beautiful viewer where all stories live publicly
- **Communication**: URL params (`?story_id=123&preview=true`)
- **Philosophy**: Separate creation tool (utilitarian) from display (artistic)

### 2. Story Viewer Architecture

**Upload Tool (recursive-creator/dashboard/stories/new):**
```
┌─────────────────────────────────────┐
│ Story Upload Form                   │
│ - Title                            │
│ - Subtitle                         │
│ - Upload images (drag & drop)      │
│ - Reorder pages                    │
│                                    │
│ [Save Draft] [Preview] [Publish]   │
└─────────────────────────────────────┘

When clicking [Preview]:
┌─────────────────────────────────────┐
│ LIVE PREVIEW (iframe)               │
│ ┌─────────────────────────────────┐ │
│ │ https://recursive.eco/pages/    │ │
│ │ stories/viewer.html              │ │
│ │ ?story_id=123&preview=true       │ │
│ │                                 │ │
│ │ [Story loads from Supabase]     │ │
│ └─────────────────────────────────┘ │
│                                    │
│ ← Back to Edit    [Publish Now]    │
└─────────────────────────────────────┘
```

**Viewer (recursive-landing/pages/stories/viewer.html):**
```javascript
// Support both local files AND Supabase
const storyId = urlParams.get('story_id');  // NEW: Supabase ID
const storySlug = urlParams.get('story');   // Existing: local file
const isPreview = urlParams.get('preview'); // NEW: draft mode

if (storyId) {
  // Fetch from Supabase
  const { data } = await supabase
    .from('stories')
    .select('*, story_pages(*)')
    .eq('id', storyId);

  // If preview mode, check user owns it
  if (isPreview) {
    // Verify current user is owner
  }
} else if (storySlug) {
  // Existing: fetch local JSON
  const response = await fetch(`${storySlug}/story.json`);
}
```

### 3. Design Philosophy: Forges for Mortals

**The Vulcan Principle:** Tools must be simple enough for non-technical creators to wield.

**Design Constraints for All Forges:**
- ✅ **< 10 minutes** to create something meaningful
- ✅ **No technical jargon** - labels a parent understands
- ✅ **Immediate preview** - see beauty come alive
- ✅ **Forgiving UX** - mistakes are easy to fix
- ✅ **Optional complexity** - advanced features hidden until needed
- ✅ **Mobile-friendly** - create on phone while kids nap
- ✅ **Inspiring** - using the tool feels playful, not bureaucratic

**Anti-patterns to Avoid:**
- ❌ Dev-focused UI (no "deploy," use "publish")
- ❌ Multi-step wizards (everything on one screen if possible)
- ❌ Hidden features (preview always visible)
- ❌ Overwhelming options (start simple, add complexity later)
- ❌ Ugly internal tools (even forges deserve beauty)

**The Test:**
Could a parent who's never coded before create a story for their child in under 10 minutes, while feeling inspired rather than frustrated?

If no → simplify the forge.

### 4. Visibility & Access (Donations-Only Philosophy)

**Requirement:** Gateway building, not gatekeeping

**Solution:**
- Visibility in story_data JSONB: `"visibility": "public"` or `"private"`
- NO paywalls - all published stories accessible to everyone
- Optional donation prompts (gentle, not pushy)
- Creators own their content
- Preview mode for drafts (creator sees before publishing)
- RLS policies enforce creator-only editing, public viewing

### 3. Auth Portability

**Requirement:** Copy auth to channels and journal projects

**Solution:**
- All projects share same Supabase instance
- Copy 4 files, update Supabase email template once
- Works across all projects in ~50 minutes
- See: `AUTH_PORTABILITY.md`

---

## Current State

### ✅ Completed (Phase 0 - Clean Starter Template):
- [x] Project planning documents created
- [x] Architecture decisions finalized
- [x] Next.js 15 project initialized with clean structure
- [x] **Removed npm package dependency** (@playful_process/components)
- [x] **All components now local**: Header, Footer, AuthProvider, DualAuth, PageModals
- [x] **Updated DualAuth** with latest from recursive-channels-fresh
  - Supports "Already have a code? Enter it here" direct OTP entry
  - Three modes: email, verify, direct-verify
- [x] **Removed spiral animation** from footer (now uses static SVG)
- [x] **Updated logo** to match recursive-channels-fresh (clean SVG, no rotation)
- [x] **Pushed to recursive-starter main** - Clean starter template ready
- [x] **Merged dev to main** in recursive-creator
- [x] **Iframe-based story architecture decided** (WYSIWYG preview)
- [x] Auth fully working with dual auth (magic link + OTP)
- [x] Build tested and passing ✅

### 🔨 Next Steps (Phase 1 - Forge the Story Creation Tool):

**Goal:** Enable ANYONE (especially parents) to create beautiful children's stories and publish to the collective.

**The Forge Architecture:**
- Simple form (title, subtitle, author name)
- Drag & drop images (low barrier to entry)
- Live iframe preview (see the beauty immediately)
- Publish to Kids Stories channel (collective contribution)
- Donations-only model (no paywalls, gateway building)

**Implementation:**
- [ ] **Create Supabase JSONB schema** for stories (SIMPLE_JSONB_SCHEMA.md)
  - `stories` table (id, slug, story_data jsonb)
  - `story_pages` table (story_id, page_number, page_data jsonb)
  - Storage bucket 'story-images'
  - RLS policies (creator can edit, everyone can view published)
  - `visibility` field for donations-only philosophy

- [ ] **Update recursive-landing viewer** to support Supabase
  - Add `?story_id=uuid` parameter support
  - Add `?preview=true` mode for drafts (creator sees before publishing)
  - Keep backward compatibility with `?story=slug` (local JSON files)
  - Fetch from Supabase when story_id provided
  - Beautiful experience (gods deserve beauty)

- [ ] **Build the forge** in recursive-creator (`/dashboard/stories/new`)
  - Simple form: title, subtitle, author
  - **Drag & drop images** - mortals can wield this tool
  - **Page reordering** - intuitive, no technical knowledge needed
  - **Iframe preview embedded** - shows recursive.eco viewer in real-time (WYSIWYG)
  - **Save draft / Publish** workflow - iterate before sharing
  - Updates story_data JSONB (flexible for future fields)
  - Publishes to Kids Stories channel (collective grows)

- [ ] **Test with non-technical creators** - parents, not devs
  - Can they create a story in < 10 minutes?
  - Is the preview inspiring?
  - Does publish to channel work smoothly?

### 📋 Future Forges (Tools for Cultural Change):
- [ ] **Phase 2:** Playlist wrapper - Community curates kid-friendly YouTube playlists
- [ ] **Phase 3:** Existential Tarot - Contemplation tool (Tillich + Hospicing Modernity)
  - Ontoject path (beyond subject/object)
  - Existential exploration, not divination
  - Integration with Best Possible Self journaling
  - AI contemplation with introspection limits
- [ ] **Phase 4:** AI Contemplation Limits - Prompts for introspection after 10 AI attempts
  - Hospicing modernity practice
  - Call for self-reflection
  - Gateway to deeper contemplation
- [ ] **Phase 5:** Account hub - Unified dashboard for all tools
- [ ] **Phase 6:** Vibe coding course integration - Teach others to build their own forges

---

## Technical Context

### Supabase Connection

**Project:** Shared across all Recursive.eco apps
**URL:** https://yoursrpohfbpxoalyoeg.supabase.co (check .env)

**Existing Tables:**
- `channels` - Wellness/creative/learning channels
- `tools` - Community tools (JSONB-heavy, keep as-is)
- `profiles` - User profiles (JSONB-heavy, keep as-is)
- `journal_templates` - Journaling prompts
- `user_documents` - Generic user data (JSONB-heavy, keep as-is)
- `newsletter_subscribers` - Email signups

**New Tables (To Create for Phase 1):**

Using **JSONB-heavy approach** for simplicity (see SIMPLE_JSONB_SCHEMA.md):

```sql
-- Stories (everything in JSONB)
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  story_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stories_creator ON stories ((story_data->>'creator_id'));
CREATE INDEX idx_stories_visibility ON stories ((story_data->>'visibility'));

-- Story pages (minimal structure)
CREATE TABLE story_pages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  page_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, page_number)
);

-- RLS Policies
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public published stories"
  ON stories FOR SELECT
  USING (
    story_data->>'visibility' = 'public'
    AND story_data->>'published' = 'true'
  );

CREATE POLICY "Users can view their own stories"
  ON stories FOR SELECT
  USING (story_data->>'creator_id' = auth.uid()::text);

CREATE POLICY "Users can create stories"
  ON stories FOR INSERT
  WITH CHECK (story_data->>'creator_id' = auth.uid()::text);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  USING (story_data->>'creator_id' = auth.uid()::text);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (story_data->>'creator_id' = auth.uid()::text);

CREATE POLICY "Story pages visible to story viewers"
  ON story_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_pages.story_id
      AND (
        (story_data->>'visibility' = 'public' AND story_data->>'published' = 'true')
        OR story_data->>'creator_id' = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can manage their story pages"
  ON story_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_pages.story_id
      AND story_data->>'creator_id' = auth.uid()::text
    )
  );

-- Storage bucket for story images
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT DO NOTHING;
```

**story_data structure:**
```json
{
  "title": "The Nest Knows Best",
  "subtitle": "For Little Ones Learning to Sleep",
  "author": "PlayfulProcess",
  "cover_image_url": "story-images/user-id/story-id/cover.png",
  "visibility": "private",
  "published": false,
  "creator_id": "user-uuid-here"
}
```

**page_data structure:**
```json
{
  "image_url": "story-images/user-id/story-id/page-1.png",
  "alt_text": "Bunny sitting under a tree",
  "narration": "Once upon a time..."
}
```

**Future Tables (Phase 2):**
- `playlists` table (same JSONB approach)

**Schema Location:** See `SIMPLE_JSONB_SCHEMA.md` for complete copy-paste ready schema

### Auth Setup

**Current Status:** ✅ Dual auth implemented + bugs fixed

**Implementation Complete:**
1. ✅ `DualAuth.tsx` component (two-step flow: email → OTP)
2. ✅ Auth callback route (`app/auth/callback/route.ts`)
3. ✅ Error page with OTP fallback (`app/auth/error/page.tsx`)
4. ✅ **CRITICAL BUG FIXED:** Cookie domain configuration

**Remaining:**
1. ⏳ Update Supabase email template (include `{{ .Token }}`)
2. ⏳ Test across email providers and environments

**See:** `AUTH_IMPLEMENTATION_PLAN.md` for complete code

---

## Session 3-4 Updates: Auth Debugging Journey

### Bug #1: Cookie Domain Configuration (Fixed - Best Practice)

**Initial Problem:**
Hardcoded `domain: '.recursive.eco'` doesn't work on localhost or Vercel previews.

**Solution:**
Environment-aware cookie configuration:
```typescript
const isProduction = hostname.endsWith('recursive.eco');
const cookieDomain = isProduction ? '.recursive.eco' : undefined;
```

**Files:** `lib/supabase-client.ts`, `lib/supabase-server.ts`

### Bug #2: CRITICAL - Wrong Callback Logic (ACTUAL ROOT CAUSE)

**The Real Problem (discovered via Vercel logs):**
```
❌ Missing token_hash or type in callback
fullUrl: 'https://creator.recursive.eco/auth/callback?code=af540734-95db-4ab9-ba31-3283f66cc36e'
```

Supabase was sending a `code` parameter (PKCE flow), but the callback was ONLY looking for `token_hash` + `type`.

**Why This Happened:**
- I wrote callback logic from scratch instead of copying from recursive-channels-fresh
- recursive-channels-fresh handles BOTH flows (old magic link + new PKCE)
- I only implemented the old flow

**Solution:**
Copied EXACT callback logic from recursive-channels-fresh:

```typescript
// Handle magic link tokens (old flow)
if (token_hash && type === 'magiclink') {
  await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
}

// Handle PKCE code exchange (new flow) ← THIS WAS MISSING!
if (code) {
  await supabase.auth.exchangeCodeForSession(code)
}
```

**File:** `app/auth/callback/route.ts`

**Key Lesson:** ALWAYS copy working code from recursive-channels-fresh as the reference implementation!

### Dark Mode Implementation

**All auth pages converted to dark theme:**
- `app/page.tsx` - Main landing page (bg-gray-900)
- `components/auth/DualAuth.tsx` - Auth form (bg-gray-800 cards)
- `app/auth/error/page.tsx` - Error page (dark theme + OTP input)

**Design choices:**
- Background: `bg-gray-900` (main page), `bg-gray-800` (cards)
- Text: `text-white` (headings), `text-gray-400` (body)
- Inputs: `bg-gray-700` with `border-gray-600`
- Success/Error messages: Semi-transparent backgrounds with colored borders
- Buttons: Blue primary (`bg-blue-600`) for consistency

### OTP Fallback on Error Page

**New functionality added to `/auth/error`:**
- Initial view shows error message + "Enter 6-Digit Code" button
- Clicking button reveals full OTP verification form
- Form includes email input + OTP input (6 digits)
- Successfully verifies and logs user in if OTP is valid
- Provides fallback if magic link fails

**User flow:**
1. Magic link fails → redirected to `/auth/error`
2. User sees error explanation + OTP option
3. User clicks "Enter 6-Digit Code"
4. User enters email + 6-digit code from email
5. System verifies OTP → redirects to dashboard

**File:** `app/auth/error/page.tsx` - Now client component with state management

---

## Session 5 Updates: Corporate Email & Supabase Configuration

### The Final Auth Issue: 403 Forbidden on OTP Verification

**Problem:** After implementing dual auth, Gmail worked perfectly but corporate email (Pepsico/Outlook) failed with:
```
POST https://evixjvagwjmjdjpbazuj.supabase.co/auth/v1/verify 403 (Forbidden)
```

### Discovery Process:

**Initial Theory: Outlook SafeLinks Breaking Auth**
- Corporate emails wrap links in SafeLinks: `https://nam12.safelinks.protection.outlook.com/?url=...`
- This breaks PKCE flow because code_verifier cookie gets lost through the redirect chain
- ✅ This explained why magic links failed
- ❌ But didn't explain why OTP also failed (OTP bypasses callbacks entirely!)

**Key Insight: Testing on Multiple Devices**
- Tried OTP on corporate computer → 403 error
- Tried OTP on personal computer → **SAME 403 error!**
- This ruled out corporate firewall/security as the cause

**The Root Cause: Supabase "Confirm Email" Setting**

When "Confirm Email" is ENABLED in Supabase:
1. **First-time users** get "Confirm your signup" email (NO OTP code)
2. Must click confirmation link to activate account
3. **Only then** can use OTP for future logins
4. If user exists but is UNCONFIRMED → OTP returns 403 Forbidden

**What Was Happening:**
- Gmail user: Already confirmed (from earlier testing) → OTP worked ✅
- Pepsico user: Created while email confirmation was ON → stuck in unconfirmed state → OTP failed ❌

### The Solution:

**Step 1: Disable Email Confirmation**
- Go to Supabase Dashboard → Authentication → Providers → Email
- Set **"Enable email confirmation"** to **OFF**
- Rationale: OTP already verifies email ownership, no need for separate confirmation

**Step 2: Delete & Recreate Unconfirmed Users**
- Users created BEFORE disabling confirmation are stuck with `email_confirmed_at: null`
- Must delete these users from Supabase Dashboard → Authentication → Users
- User signs up again → now works immediately with OTP

### Critical Supabase Configuration for Dual Auth:

**Authentication → Providers → Email:**
- ✅ Enable email provider: **ON**
- ✅ Confirm email: **OFF** (critical for OTP-only flow)

**Authentication → URL Configuration:**
- Site URL: `https://creator.recursive.eco`
- Redirect URLs:
  - `https://creator.recursive.eco/auth/callback`
  - `https://*.vercel.app/auth/callback`
  - `http://localhost:3001/auth/callback`

**Email Templates → Magic Link:**
Must include BOTH magic link AND OTP code:
```html
<h2>Sign in to Recursive.eco</h2>
<p><strong>Option 1: Click to sign in</strong></p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Recursive.eco</a></p>

<p><strong>Option 2: Enter this code</strong></p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
  {{ .Token }}
</p>
```

### Why Corporate Email Still Works with OTP:

**Magic Link Flow (Broken by SafeLinks):**
1. Supabase generates: `https://supabase.co/auth/v1/verify?token=pkce_...&redirect_to=creator.recursive.eco`
2. Outlook wraps it: `https://safelinks.protection.outlook.com/?url=...`
3. User clicks → goes through Outlook's server first
4. PKCE code_verifier cookie lost in redirect chain
5. Callback receives code but no verifier → fails ❌

**OTP Flow (Works Perfectly):**
1. User receives 6-digit code in email
2. Types code directly in browser (on creator.recursive.eco)
3. Browser → Supabase API directly (no redirects, no callbacks, no cookies needed)
4. Supabase verifies code → creates session → success ✅

### Debugging Added (Console Logs):

Added comprehensive logging to help diagnose OTP issues:

```typescript
console.log('🔢 Attempting OTP verification:', { email, otpLength, otpValue })
console.log('🔢 OTP verification response:', { success, error, hasSession })
```

**Files updated:**
- `components/auth/DualAuth.tsx` - OTP verification with logging
- `app/auth/error/page.tsx` - Error page OTP with logging

### Testing Status:

✅ **Gmail** - Magic link + OTP both work
✅ **Corporate Email (Outlook/Pepsico)** - OTP works (magic link expected to fail)
✅ **Dark mode** implemented across all auth pages
✅ **Auto-prefilled email** on error page via sessionStorage
✅ **PKCE + Magic Link** flows both supported in callback

### Key Lessons Learned:

1. **Supabase email confirmation MUST be disabled for OTP-only flows**
2. **Corporate email SafeLinks break magic links** - OTP is the solution
3. **403 errors often mean "user not confirmed"** not "wrong credentials"
4. **Always check Supabase Dashboard → Users** to see confirmation status
5. **Vercel logs show server-side (callbacks)**, **Browser console shows client-side (OTP)**

---

## Related Projects

### recursive-channels-fresh
- **Location:** `../recursive-channels-fresh/`
- **URL:** https://channels.recursive.eco/
- **Auth Pattern:** Copy FROM here (MagicLinkAuth component)
- **Then:** Copy DualAuth BACK to here

### jongu-tool-best-possible-self
- **Location:** `../jongu-tool-best-possible-self/`
- **URL:** https://journal.recursive.eco/
- **Auth Pattern:** Copy DualAuth TO here

### recursive-landing
- **Location:** `../recursive-landing/`
- **URL:** https://www.recursive.eco/
- **Viewer Pattern:** Copy FROM here (vanilla HTML story viewer)
- **Adapt:** Convert to React component for auth checks

---

## User Context (PlayfulProcess)

**Background:**
- Philosophy + future LCSW (MSW starting Jan 2026)
- Building open-source psychoeducation tools
- "Gateway building, not gatekeeping" ethos
- Inspired by virtue ethics, process philosophy

**Mission:**
- Create spaces for recursive meaning-making
- Support parents with wellness tools + kids content
- Teach "vibe coding" (building with AI/Claude)
- Join Free Software movement (not start new movement)

**Design Principles:**
- Minimal, grounded (not overly promotional)
- No emojis unless requested
- Process over outcome
- Community contribution encouraged
- Open source, forkable

**See:** `../mission-statement.md` for full philosophy

---

## Compliance Considerations

### COPPA (Children's Privacy):
- ✅ Service is parent-facing (not child-directed)
- ✅ No accounts for children
- ✅ Adult affirmation gate on kid content
- ✅ Privacy notice: "We don't collect children's data"

### YouTube Terms:
- ✅ Use `youtube-nocookie.com` (privacy-enhanced)
- ✅ Keep YouTube branding visible
- ✅ No downloading/scraping
- ✅ Clear attribution

### GDPR:
- ✅ Data export already implemented (channels)
- ✅ Account deletion already implemented
- ✅ Copy pattern to creator hub

**See:** `PROJECT_PLAN.md` section on compliance

---

## Key Files to Reference

### Planning Documents (Read These First):
1. **PROJECT_PLAN.md** - Master plan, all phases, timeline
2. **AUTH_IMPLEMENTATION_PLAN.md** - Complete auth code + guide
3. **SUPABASE_SCHEMA_REVISED.md** - Database design (relational)
4. **AUTH_PORTABILITY.md** - How to copy to other projects

### Existing Code (Reference Implementation):
1. **components/auth/DualAuth.tsx** - ✅ Dual auth (magic link + OTP) + sessionStorage email
2. **lib/supabase-client.ts** - ✅ Environment-aware cookies (best practice)
3. **lib/supabase-server.ts** - ✅ Environment-aware cookies (best practice)
4. **app/auth/callback/route.ts** - ✅ CRITICAL - Handles BOTH PKCE + magic link flows
5. **app/auth/error/page.tsx** - ✅ Dark mode + OTP fallback + auto-prefilled email
6. **middleware.ts** - Cookie handling (already existed)

### Code to Copy TO Other Projects:
When copying auth to recursive-channels-fresh and jongu-tool-best-possible-self:
1. ✅ `app/auth/callback/route.ts` - Already matches channels (we copied FROM there!)
2. ⚠️ `lib/supabase-client.ts` - Copy environment-aware version TO channels
3. ⚠️ `lib/supabase-server.ts` - Copy environment-aware version TO channels
4. ⚠️ `components/auth/DualAuth.tsx` - Copy dual auth TO channels
5. ⚠️ `app/auth/error/page.tsx` - Copy error page with OTP TO channels

**IMPORTANT:** The callback route here is now identical to recursive-channels-fresh (we copied it). The ONLY improvements to share are:
- Environment-aware cookies
- DualAuth component with sessionStorage
- Enhanced error page

### Context Documents:
1. **../README.md** - Ecosystem overview
2. **../mission-statement.md** - Philosophy + goals
3. **../z.Supabase/README.md** - Database context
4. **../z.Supabase/schema_20251030.sql** - Current schema

---

## Common Commands

### Development:
```bash
# Start recursive-creator (port 3000)
cd recursive-creator
npm run dev

# Start channels (port 3003)
cd recursive-channels-fresh
npm run dev

# Start journal (port 3002)
cd jongu-tool-best-possible-self
npm run dev
```

### Supabase:
```bash
# Export schema
cd recursive-channels-fresh
npx supabase db dump --schema public > ../z.Supabase/schema_$(date +%Y%m%d).sql

# Run migrations
npx supabase migration new <name>
npx supabase db push
```

---

## Quick Start (Resuming Development)

### If Starting Fresh Session:

**Step 1: Read Context (5 min)**
- Read this file (CLAUDE.md)
- Skim PROJECT_PLAN.md
- Check "Current State" section above

**Step 2: Check Phase**
- Look at "Current State" → what's done, what's next
- If Phase 0 (auth): Read AUTH_IMPLEMENTATION_PLAN.md
- If Phase 1+ (features): Read PROJECT_PLAN.md

**Step 3: Ask User**
- "Ready to continue with [current task]?"
- Confirm any decisions if unclear

**Step 4: Continue**
- Pick up where we left off
- Use TodoWrite to track progress
- Update this file when major decisions are made

### If User Says "Continue" or "Let's go":
- Check "Next Steps" in "Current State" section
- Start with first unchecked task
- Create todos with TodoWrite
- Begin implementation

---

## Important Notes


### Always Do:
- ✅ Use TodoWrite for multi-step tasks
- ✅ Mark todos complete as you finish
- ✅ Copy proven patterns (don't reinvent)
- ✅ Test across email providers (Gmail, Outlook, etc.)
- ✅ Ask for clarification if ambiguous

### Code Style:
- TypeScript (strict mode)
- Tailwind CSS (utility-first)
- Server components by default (use 'use client' when needed)
- Descriptive variable names
- Comments for complex logic

---

## Debugging Tips

### If Auth Issues:

**1. Check Vercel Logs FIRST!**
- Go to Vercel Dashboard → Project → Logs → Real-time
- Look for auth callback logs with 🔐 emoji
- Check what parameters Supabase is sending: `code`, `token_hash`, or `type`?
- This tells you which flow Supabase is using

**2. Common Auth Failures:**

**"Missing token_hash or type"** → Callback not handling PKCE flow
- Supabase sends `code` parameter (PKCE)
- Callback needs `exchangeCodeForSession(code)`
- Solution: Copy callback from recursive-channels-fresh

**"Token has expired or is invalid"** → Multiple possible causes
- Check Vercel logs for actual error
- Could be expired link (1 hour timeout)
- Could be wrong redirect URL in Supabase
- Could be cookie domain issues

**"Code exchange failed"** → Redirect URL mismatch
- Check Supabase Dashboard → Authentication → URL Configuration
- Ensure callback URLs are whitelisted for your domain
- Need: `https://creator.recursive.eco/auth/callback`

**3. Cookie Domain Check:**
- Browser dev tools → Application → Cookies
- localhost should have NO domain attribute
- production should have `domain=.recursive.eco`
- Look for cookies like `sb-*-auth-token`

**4. Test Both Auth Methods:**
- Click magic link (should redirect to /dashboard)
- If that fails, use OTP on error page
- OTP bypasses the callback flow entirely

### If Database Issues:
- Check RLS policies (common source of "no rows" errors)
- Verify foreign keys exist
- Look at Supabase logs in dashboard
- Test queries in SQL Editor

### If Build Issues:
- Check Next.js version (15.4.3)
- Verify all imports
- Check middleware.ts path config
- Clear .next folder and rebuild

---

## When to Update This File

**Update CLAUDE.md when:**
- ✅ Major phase completed (e.g., "Phase 0 complete: Auth working")
- ✅ Architecture decision changed
- ✅ New tables added to Supabase
- ✅ New key files created
- ✅ Moving to next phase

**How to Update:**
- User will say: "Update CLAUDE.md"
- Update "Current State" section
- Update "Next Steps"
- Add any new decisions/context
- Increment "Last Updated" date

---

## Current Session Context (Session 3)

**Date:** 2025-11-03
**Focus:** Debug auth failures + implement dark mode + OTP fallback
**Accomplishments:**
- ✅ Diagnosed root cause: cookie domain configuration bug
- ✅ Fixed cookie domain logic in client + server files
- ✅ Converted all auth pages to dark mode
- ✅ Added OTP input fallback to error page
- ✅ Dev server tested locally (port 3001)

**What User Needs to Do Next:**
1. **Update Supabase Email Template** (see template below)
2. Test auth flow locally with real email
3. Deploy to Vercel and test on production domain
4. If working, copy auth pattern to other projects

**Supabase Email Template (Magic Link + OTP):**

Go to: Supabase Dashboard → Authentication → Email Templates → Magic Link

```html
<h2>Sign in to Recursive.eco</h2>

<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>

<p><strong>Or enter this 6-digit code:</strong></p>
<p style="font-size: 24px; font-weight: bold; font-family: monospace;">{{ .Token }}</p>

<p style="font-size: 12px; color: #666;">
  This code expires in 1 hour.<br>
  If you didn't request this, you can safely ignore it.
</p>
```

**Key:** The `{{ .Token }}` variable includes the 6-digit OTP code

**Redirect URLs to Whitelist in Supabase:**
- Local: `http://localhost:3001/auth/callback`
- Preview: `https://*.vercel.app/auth/callback`
- Production: `https://creator.recursive.eco/auth/callback`

**Current Development Server:**
- Running on port 3001 (port 3000 was in use)
- Access at: http://localhost:3001
- Ready for testing with updated email template

---

## Questions to Ask User (If Resuming and Unclear)

1. "What phase are we on?" (Check Current State)
2. "Should I continue with [next task]?" (Check Next Steps)
3. "Any decisions changed since last session?" (Validate context)
4. "Ready to start implementation?" (Get confirmation)

**If user says "continue," "let's go," or similar:**
→ Check Next Steps, create todos, start work!

---

## Quick Reference: What Changed in Sessions 3-4

### Files Modified:
1. `lib/supabase-client.ts` - Environment-aware cookie domain (best practice)
2. `lib/supabase-server.ts` - Environment-aware cookie domain (best practice)
3. `app/page.tsx` - Dark mode (bg-gray-900)
4. `components/auth/DualAuth.tsx` - Dark mode + sessionStorage for email
5. `app/auth/error/page.tsx` - Dark mode + OTP form + auto-prefilled email
6. `app/auth/callback/route.ts` - **CRITICAL FIX:** Now handles PKCE code exchange

### Critical Bug Fixed:
**Missing PKCE Code Handler** - Supabase sends `code` parameter (PKCE flow), but callback only handled `token_hash` + `type` (old magic link flow). Fixed by copying EXACT callback logic from recursive-channels-fresh which handles BOTH flows.

### How We Found It:
Vercel logs showed:
```
fullUrl: '...?code=af540734-95db-4ab9-ba31-3283f66cc36e'
❌ Missing token_hash or type in callback
```

This revealed callback was ignoring the `code` parameter completely.

### Features Added:
1. **Dark mode** across all auth pages
2. **OTP fallback** with sessionStorage email prefill
3. **Environment-aware cookies** (localhost, Vercel, production)
4. **PKCE code exchange** support (the missing piece!)

### Testing Status:
- ✅ All code matches working recursive-channels-fresh
- ✅ Supabase email template includes `{{ .Token }}`
- ⏳ Awaiting production test (should work now!)

### Next Session:
- Test auth on https://creator.recursive.eco/
- If working, copy improvements to other projects
- Start Phase 1 (story publisher features)

---

**END OF CONTEXT FILE**

*This file will be updated as we progress. Always read this first when resuming!*
