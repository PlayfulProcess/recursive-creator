# feedback from user

Actually, can you make it so that the user can save a draft without a title?

ANd the box with the URL to Published project to appear below the button of publishing as the user would not know where to find it. 


THe numbered approach almost worked! You need to enlarge the link box to fit the numbered frame. Right now it is about haf the size



# Context for Claude Code: Recursive Creator Project

> **Last Updated:** 2025-11-13 (Session 11 - Phase 7 Complete & Deployed!)
> **Current Phase:** Phase 7 COMPLETE - Drive Folder Import Live in Production
> **Status:** All phases complete, unified sequence creator deployed and tested on Vercel
> **Next Steps:** Production use, gather user feedback, iterate on features

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

1. **Content Sequence Creator** - Parents/creators upload image stories + curated YouTube playlists with narrative context
   - Stories: Image sequences with text (children's books, visual narratives)
   - Playlists: YouTube videos wrapped in safer, calmer UX with narrative pauses
   - **Unified Viewer**: Both use same beautiful viewer (images + videos mixed together)

2. **YouTube Wrapper Value** - Why wrap playlists instead of using native YouTube?
   - 🎭 **Narrative Context**: Add story pages before/after videos, create "chapters"
   - 🧹 **Clean Embeds**: Hide related videos, remove search, no autoplay chaos
   - 🛡️ **Safer for Kids**: Bounded experience, can't click away to random videos
   - 💬 **Community Reviews**: Trusted recommendations within recursive.eco (future)

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

### 3. Unified Content Viewer Architecture (DECIDED 2025-11-11) ✅

**Question:** Should stories and playlists have separate viewers, or one unified viewer?

**Answer:** Unified viewer! Both are just sequences of content.

**Why (Toolmaker Perspective):**
- ✅ **Same essence**: Stories = image sequences, Playlists = video sequences
- ✅ **Future-proof**: Can mix images + videos in same sequence later
- ✅ **One codebase**: Update viewer once, benefits all content types
- ✅ **Consistent UX**: Users learn one interface, works for everything
- ✅ **Mobile-optimized**: Responsive design for both images and videos
- ✅ **Solves CORS**: Iframe loads from recursive.eco domain (not creator.recursive.eco)

**Solution:**
- **recursive-landing dev branch**: Build unified content viewer at `dev.recursive.eco`
- **Viewer features**: Fullscreen, swipe, keyboard nav, wheel scroll (existing)
- **Video support**: YouTube nocookie embeds (rel=0, modestbranding=1)
- **Supabase integration**: Fetch content via `?id=uuid&type=story|playlist`
- **Clean YouTube UX**: Hide recommendations, no search, bounded experience

**Data Structure (Keep Separate for MVP):**
```json
{
  "document_type": "story" | "playlist",
  "document_data": {
    "pages": [...],    // For stories
    "videos": [...]    // For playlists
  }
}
```

**Future Enhancement (Unified Items Array):**
```json
{
  "document_type": "sequence",
  "document_data": {
    "items": [
      { "type": "image", "image_url": "...", "text": "..." },
      { "type": "video", "video_id": "...", "title": "..." },
      { "type": "image", "image_url": "...", "text": "..." }
    ]
  }
}
```

**Development Workflow:**
1. Create `dev-unified-viewer` branch in recursive-landing
2. Copy `pages/stories/viewer.html` → `pages/content/viewer.html`
3. Add video support + Supabase client
4. Deploy dev branch to `dev.recursive.eco`
5. Update recursive-creator preview iframes to point to dev viewer
6. Test Drive/Imgur images + YouTube videos
7. Merge to main when stable

**YouTube Wrapper Benefits:**
1. 🎭 **Narrative Context** - Add story pages between videos
2. 🧹 **Clean Embeds** - No related videos at end (youtube-nocookie.com)
3. 🛡️ **Safer for Kids** - Can't navigate to random YouTube content
4. 💬 **Community Reviews** - Trusted recommendations (future)

### 4. Design Philosophy: Forges for Mortals

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

### ✅ Completed (Phase 1 - Story Architecture & Migration):
- [x] **Consulted Supabase AI** about approval workflow design
  - Documented in: `supabase-ai-prompt.md`
  - Received comprehensive migration SQL + recommendations
- [x] **PIVOTED:** Discovered existing tools/channels pattern
  - Tools/channels use JSONB-heavy approach: `is_active` controls visibility
  - Original Supabase AI proposal was over-engineered (didn't know our codebase)
  - Revised to match existing pattern exactly
- [x] **Created APPROVAL_PATTERN.md** - Documents the Recursive.eco approval pattern
  - How tools/channels handle approval (JSONB-heavy, simple)
  - Why stories should follow the same pattern
  - Data structure, queries, RLS policies
  - Comparison of approaches
- [x] **Created revised migration SQL** - `supabase/migrations/001-story-approval-revised.sql`
  - Adds 'story' to document_type
  - Optional story_slug column for fast lookups
  - Everything in document_data JSONB (consistent with tools)
  - Uses `is_active: "false"` (pending) → `is_active: "true"` (public)
  - Creates indexes for fast JSONB queries
  - Creates is_admin_user() helper function
  - Adds RLS policies (owner, admin, public)
  - Creates story-images storage bucket
- [x] **Created RECOMMENDATION-REVISED.md** - Why the revision is better
  - Explains the pivot from columns to JSONB
  - Compares original vs revised approaches
  - Shows why consistency with existing code > generic best practices
- [x] **Created revised migration guide** - `supabase/migrations/README-REVISED.md`
  - Step-by-step instructions for running migration
  - Admin bootstrap SQL
  - Test queries for verification
  - Approval/rejection workflows
  - Troubleshooting guide
- [x] **Created BACKLOG_DB_OPTIMIZATIONS.md** - Future improvements
  - Generic approval system
  - Audit trail system
  - Unified content visibility
  - 10 optimization opportunities with priority levels
- [x] **Migration RUN** - User ran migration and bootstrapped admin user (pp@playfulprocess.com)
  - story-images storage bucket created
  - RLS policies active
  - is_admin_user() function working

### ✅ Completed (Phase 1 - Story Upload Forge):
- [x] **Built story creation page** - `/dashboard/stories/new` (3.9 kB)
  - Title, subtitle, author name fields
  - Dark mode UI (bg-gray-900, bg-gray-800)
  - Form validation and error handling
  - Success states with auto-redirect
- [x] **Image upload functionality**
  - Multiple image selection with file picker
  - Client-side image preview with object URLs
  - File type validation (images only)
  - Upload to Supabase Storage (`story-images/{user_id}/{doc_id}/page-X.ext`)
  - Public URL generation for stored images
- [x] **Page management**
  - Reorder pages with up/down arrows
  - Remove pages with confirmation
  - Alt text input for accessibility
  - Narration textarea for each page
  - Real-time preview thumbnails (24x24)
- [x] **Save flow**
  - Creates story document in `user_documents` table
  - Uploads images to storage
  - Updates document with pages array
  - Sets `is_active: 'false'` (pending approval)
  - Sets `reviewed: 'false'`
- [x] **Dashboard navigation**
  - Added "Create New Story" button on `/dashboard`
  - Links to story creation page
  - "My Stories" section for future list
- [x] **Build tested and passing** ✅
- [x] **Pushed to GitHub** (commits 846e6ac, f9f2364)

### 🔨 Next Steps (Phase 1 - Complete the Forge):

**What's Working Now:**
✅ Story creation form with title, subtitle, author
✅ Multiple image upload with previews
✅ Page reordering and removal
✅ Alt text and narration fields
✅ Save to Supabase (user_documents + storage)
✅ Dashboard navigation

**What's Left:**

- [ ] **Add iframe preview to story creation page**
  - Embed recursive-landing viewer in creation UI
  - Show live preview as creator adds pages
  - WYSIWYG experience (see exactly what will be published)
  - Update preview when pages are reordered/edited

- [ ] **Update recursive-landing viewer** to support Supabase
  - Add `?story_id=uuid` parameter support
  - Add `?preview=true` mode for drafts (creator sees before publishing)
  - Keep backward compatibility with `?story=slug` (local JSON files)
  - Fetch from Supabase when story_id provided
  - Beautiful experience (gods deserve beauty)

- [ ] **Add "My Stories" list to dashboard**
  - Query user's stories from user_documents
  - Show title, status (draft/pending/approved), created date
  - Link to edit story
  - Link to preview story
  - Delete story option

- [ ] **Build admin dashboard** (`/admin/stories`)
  - Check if current user is admin (is_admin_user())
  - List pending stories (is_active='false', reviewed='false')
  - Preview in iframe (same viewer as public)
  - Approve/Reject buttons
  - Show story metadata (title, author, created date)

- [ ] **Create Edge Function** for approval actions
  - Route: `supabase/functions/approve-story/`
  - Validates admin JWT
  - Updates approval fields in document_data:
    - `is_active: 'true'` (for approve)
    - `reviewed: 'true'`
    - `approved_at: now()`
    - `approved_by: 'admin'`
  - Returns success/error

- [ ] **Test with non-technical creators** - parents, not devs
  - Can they create a story in < 10 minutes?
  - Is the preview inspiring?
  - Does submission → approval → publish workflow work smoothly?

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
3. **APPROVAL_PATTERN.md** - ⭐ The Recursive.eco approval pattern (READ THIS!)
4. **RECOMMENDATION-REVISED.md** - Why we revised from Supabase AI's approach
5. **supabase-ai-prompt.md** - Full Supabase AI consultation (reference only)
6. **AUTH_PORTABILITY.md** - How to copy auth to other projects

### Migration Files (Ready to Run):
1. **supabase/migrations/001-story-approval-revised.sql** - ⭐ USE THIS (revised)
2. **supabase/migrations/README-REVISED.md** - ⭐ Step-by-step guide (revised)
3. ~~001-story-approval.sql~~ - Original (deprecated, don't use)
4. ~~README.md~~ - Original guide (deprecated, don't use)

### Optimization Documentation:
1. **z.Supabase/BACKLOG_DB_OPTIMIZATIONS.md** - Future improvements (don't over-engineer!)

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

## Current Session Context (Session 11 - Phase 7 Implementation & Deployment)

**Date:** 2025-11-13
**Focus:** Implement Drive folder batch upload, deploy to Vercel, fix bugs

### What We Accomplished:

**Phase 7: Drive Folder Import** ✅ COMPLETE
- Created backend API route `/api/import-drive-folder`
- Uses Google Drive API v3 with API key (no OAuth needed!)
- Filters for images and videos, sorts alphabetically by filename
- Frontend: Added "📁 Import Folder" button + modal
- Auto-populates bulk textarea with imported URLs
- Works with publicly shared Drive folders
- **Implementation time:** ~2 hours (as estimated)

**Deployment to Vercel** ✅
- Merged dev → main, force pushed to trigger deployment
- Fixed old commit issue (was deploying 58 commits behind!)
- Domain configuration verified (creator.recursive.eco)
- Deployed commit: b7e2aff
- **Status:** Live and working in production!

**Bug Fixes Based on User Feedback** ✅
1. **Save button:** Added better error validation and logging
2. **Alphabetical sorting:** Imported files now sorted by filename
3. **CSP errors:** Documented as expected (Google Drive security)

**Testing Results:**
- ✅ Drive folder import working
- ✅ Alphabetical sorting working
- ✅ Save button working
- ✅ All features tested and confirmed by user

**Key Files:**
- `/app/api/import-drive-folder/route.ts` - Backend API (133 lines)
- `/app/dashboard/sequences/new/page.tsx` - Frontend UI updates
- **Commits:** 03a95a6 (Phase 7), d6e0dd3 (trigger deploy), b7e2aff (bug fixes)

**Environment Variables Needed:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_DRIVE_API_KEY` (new!)

**Lessons Learned:**
- Vercel can deploy old commits if not monitored carefully
- Public Drive folders don't require OAuth (huge simplification!)
- Force redeploy: empty commit or Vercel dashboard
- CSP errors for Google Drive framing are expected and normal

---

## Previous Session Context (Session 10 - Phase 6 Cleanup & Drive Folder Research)

**Date:** 2025-11-13
**Focus:** Clean up unused stories/playlists code, research Gmail/Drive folder batch upload feature

### What We Completed:

**Phase 6 Cleanup** ✅
- Removed all unused stories and playlists code from dashboard
- Deleted `/dashboard/stories/new/page.tsx` (replaced by sequences)
- Deleted `/dashboard/playlists/new/page.tsx` (replaced by sequences)
- Removed Story and Playlist TypeScript interfaces
- Removed stories/playlists state variables and fetch functions
- Removed dashboard JSX sections for stories and playlists
- Updated `getStatusBadge()` to use Sequence type
- **Result:** Dashboard now shows only "My Projects" (sequences section)
- **Removed:** 1,150 lines of unused code
- **Build:** Tested and passing ✅
- **Committed:** 47e220a - "Phase 6 cleanup: Remove unused stories and playlists code"

**Drive Folder Batch Upload Research** ✅
- Researched Google Drive API v3 for folder file listing
- **Key Finding:** Public folders DON'T require OAuth! (Can use API key only)
- **Implementation Estimate:** 2-3 hours (not 2-3 days as initially thought)
- **Documented in:** PROJECT_PLAN.md Phase 7
- **User Need:** Currently tedious to add 10+ images (must share each file individually)
- **Solution:** Paste ONE folder link, app extracts all file URLs automatically

**Technical Approach Documented:**
- Backend API route: `/api/import-drive-folder`
- Google Drive API v3 with API key (read-only)
- Filter files by mimeType (images + videos)
- Convert to direct URLs (Drive format: `uc?export=view&id=FILE_ID`)
- Auto-populate bulk textarea for review before import
- **Limitation:** Only works with publicly shared folders
- **Priority:** Medium (nice-to-have, not critical)

**Next Steps:**
- Phase 6 testing on Vercel (user tests)
- Optionally implement Phase 7 (Drive folder import) if desired

---

## Previous Session Context (Session 9 - Unified Sequence Creator Implementation)

**Date:** 2025-11-12
**Focus:** Build unified sequence creator (mix images + videos), mobile-first viewer, NO database changes

**Major Accomplishment:** Completed Phases 1-4 of unified sequence creator!

### What We Built:

**Phase 1: Backend (NO DB CHANGES!)** ✅
- Use existing `document_type: 'creative_work'` (already in database)
- Identify sequences with `tool_slug: 'sequence'`
- Zero migrations needed - works with existing schema!

**Phase 2: Unified Creator UI** ✅
- Created `/dashboard/sequences/new` - mix images AND videos
- **Dropdown menu:** Add Image or Add Video
- Type-specific inputs (alt text for images, title for videos)
- Auto-convert Drive URLs → `uc?export=view&id=FILE_ID` format ✅ (user confirmed working!)
- Auto-extract YouTube video IDs from any URL format
- Reorder items with up/down arrows
- Live thumbnails for both types
- Proxy wrapping for CORS on Drive images

**Phase 3: Mobile-First React Viewer** ✅
- Created `/components/viewers/SequenceViewer.tsx`
- **Design principle:** "If you can swipe through it like Instagram stories, it's simple enough"
- Primary interaction: **Swipe left/right** (mobile)
- Secondary: Keyboard arrows (desktop)
- Large touch targets (56px buttons) - avoid hamburger menu issues
- Minimal UI: page counter + fullscreen button at bottom
- No complex overlays or menus in viewer
- YouTube nocookie embeds with clean UI (`rel=0`, `modestbranding=1`)
- Site header/navigation unchanged (hamburger stays for site nav)

**Phase 4: Dashboard Integration** ✅
- Added "My Sequences" section to dashboard (top, green highlight)
- Fetch sequences: `tool_slug='sequence'` + `document_type='creative_work'`
- Create/Edit/Delete functionality
- Shows item count, date, status badges
- Old stories/playlists sections still exist (safety net for Phase 6 testing)

**Key Technical Decisions:**
1. **NO database changes** - use existing creative_work type
2. **Mobile-first viewer** - gestures > buttons, avoid touch issues
3. **Test before cleanup** - keep old tools until sequences proven working
4. **Drive format that works:** `https://drive.google.com/uc?export=view&id=FILE_ID`

**Drive URL Fix (Session 9 start):**
- Reset to bc6a9f9, then updated to use `uc?export=view` format
- Removed Imgur references (focus on Drive)
- User confirmed: "The google links are working!"

**Current State:**
- **Phases 1-4:** Complete and pushed to dev
- **Phase 5:** Pending - cleanup old story/playlist files
- **Phase 6:** Pending - testing on Vercel
- **Strategy:** Test first, cleanup after (safety net approach)

**Files Created:**
- `/app/dashboard/sequences/new/page.tsx` - Unified creator (562 lines)
- `/components/viewers/SequenceViewer.tsx` - Mobile-first viewer (229 lines)

**Files Modified:**
- `/app/dashboard/page.tsx` - Added sequences section
- `/app/api/proxy-image/route.ts` - Removed Imgur, kept Drive
- `/PROJECT_PLAN.md` - Documented full plan with 6 phases

**Next Steps (Phase 6 Testing):**
1. ✅ Commit and push to dev
2. ✅ Update CLAUDE.md
3. ⏳ User tests on Vercel
4. ⏳ Verify Drive images load through proxy
5. ⏳ Verify YouTube embeds work
6. ⏳ Test mobile swipe navigation
7. ⏳ If all good → Phase 5 cleanup (remove old files)
8. ⏳ If issues → debug with safety net (old code still exists)

---

## Previous Session Context (Session 8 - Unified Viewer Architecture)

**Date:** 2025-11-11
**Focus:** Pivot from Supabase Storage to URL-based approach, build YouTube playlist creator, plan unified viewer

**Previous Session Summary (Session 7):**
- ✅ Built story/playlist upload forges with URL-based storage (no file uploads!)
- ✅ Added Google Drive URL auto-conversion
- ✅ Created YouTube playlist wrapper with video embeds
- ✅ Added 'playlist' to document_types (migration 002-add-playlist-type.sql)
- ✅ Dashboard shows both stories and playlists

**Session 8 Accomplishments:**
- ✅ **PIVOTED from Supabase Storage to URL-based approach** (Session 7)
  - Users provide image URLs (Google Drive, Imgur, etc.)
  - No hosting costs, users own their data
  - Auto-converts Drive sharing links to direct image URLs
- ✅ **Built YouTube playlist creator** (`/dashboard/playlists/new`) (Session 7)
  - Auto-extracts video IDs from any YouTube URL format
  - YouTube nocookie embeds (privacy-enhanced)
  - Same approval workflow as stories
- ✅ **Auto-show preview after saving** (Session 8)
  - Preview automatically appears with `setShowPreview(true)`
  - WYSIWYG experience for creators
- ✅ **Investigated image rendering issues** (Session 8)
  - No old Supabase Storage code found (completely URL-based)
  - CORS issues with Drive/Imgur likely cause of rendering failures
  - Iframe approach should solve this
- ✅ **UNIFIED VIEWER ARCHITECTURE DECIDED** (Session 8)
  - Stories + playlists merge into one content viewer
  - Both are just "sequences of content" (images vs videos)
  - Build in recursive-landing dev branch, iframe from creator
- ✅ **Built unified content viewer** (`recursive-landing/pages/content/viewer.html`)
  - Supports both Supabase (`?id=uuid&type=story|playlist`) and local JSON (`?story=slug`)
  - Auto-detects content type: renders images OR videos
  - YouTube nocookie embeds with `rel=0`, `modestbranding=1`
  - All existing features: fullscreen, swipe, keyboard, wheel navigation
  - 480 lines of vanilla JS with Supabase client integration
- ✅ **Updated recursive-creator preview iframes**
  - Story preview: Points to `dev.recursive.eco/pages/content/viewer.html?id={id}&type=story`
  - Playlist preview: Points to `dev.recursive.eco/pages/content/viewer.html?id={id}&type=playlist`
  - Replaced ~105 lines of inline preview code with ~12 lines of iframe
  - Cleaner codebase, single source of truth for rendering
- ✅ **Deployed dev branch to dev.recursive.eco**
  - Dev branch `dev-unified-viewer` created and pushed
  - Production stays stable on main branch
  - Ready for testing

**Key Insight:**
Both stories and playlists are **sequences of content**. Instead of separate viewers:
- One unified viewer handles images AND videos
- YouTube wrapper provides: narrative context, clean embeds, safer UX, community reviews
- Future: Mix images + videos in same sequence (story page → video → story page)

**YouTube Wrapper Value Proposition:**
1. 🎭 **Narrative Context** - Add story pages before/after videos as "chapters"
2. 🧹 **Clean YouTube Embeds** - Hide related videos (youtube-nocookie.com, rel=0)
3. 🛡️ **Safer for Kids** - Bounded experience, can't navigate away
4. 💬 **Community Reviews** - Trusted recommendations (future)

**Session 8 Testing Instructions (PLEASE TEST!):**

The unified viewer architecture is complete and deployed to `dev.recursive.eco`. Here's what to test:

**Test 1: Story Creation with Drive/Imgur Images**
1. Go to `creator.recursive.eco/dashboard/stories/new`
2. Create a new story with:
   - Title: "Test Story"
   - Subtitle: "Testing Drive/Imgur images"
   - Author: Your name
3. Add pages with image URLs from:
   - Google Drive (sharing link format)
   - Imgur (direct link)
   - Any other image hosting service
4. Click "Save New Draft"
5. **Check:** Does the preview automatically appear? ✅/❌
6. **Check:** Do the images render correctly in the preview iframe? ✅/❌
7. **Check:** Can you navigate between pages (swipe, arrows, keyboard)? ✅/❌
8. **Check:** Does fullscreen mode work? ✅/❌

**Test 2: Playlist Creation with YouTube Videos**
1. Go to `creator.recursive.eco/dashboard/playlists/new`
2. Create a new playlist with:
   - Title: "Test Playlist"
   - Description: "Testing YouTube embeds"
   - Category: "Kids"
3. Add videos with various YouTube URL formats:
   - `https://youtube.com/watch?v=VIDEO_ID`
   - `https://youtu.be/VIDEO_ID`
   - Direct video ID: `VIDEO_ID`
4. Click "Save Playlist"
5. **Check:** Does the preview automatically appear? ✅/❌
6. **Check:** Do the videos embed correctly? ✅/❌
7. **Check:** Are related videos hidden (clean YouTube UX)? ✅/❌
8. **Check:** Can you navigate between videos? ✅/❌

**Test 3: CORS Issue Resolution**
1. Use a Google Drive image that previously failed to render
2. Create a story with that image
3. **Check:** Does it render in the iframe preview? ✅/❌
4. **Expected:** Iframe should solve CORS issues (if not, we'll need proxy)

**Test 4: Navigation & UX**
1. In both story and playlist previews:
2. **Check:** Swipe left/right works on mobile? ✅/❌
3. **Check:** Keyboard arrow keys work? ✅/❌
4. **Check:** Mouse wheel scrolling works? ✅/❌
5. **Check:** Fullscreen button works? ✅/❌
6. **Check:** Page counter shows correctly? ✅/❌

**Expected Results:**
- ✅ Preview auto-shows after saving
- ✅ Drive/Imgur images render (CORS solved by iframe)
- ✅ YouTube videos embed cleanly (no related videos)
- ✅ All navigation methods work (swipe, keyboard, wheel)
- ✅ Fullscreen mode works
- ✅ Mobile-responsive design

**If Issues Found:**
1. Take screenshots of errors
2. Check browser console for error messages
3. Note which specific images/videos fail
4. We'll debug together in next session

**Next Steps After Testing:**
1. If all tests pass → Merge dev branch to main in recursive-landing
2. Update iframe URLs in recursive-creator to point to main (recursive.eco)
3. Deploy to production
4. Move to Phase 2: Admin dashboard for story approval

**Current Files:**
- ✅ `app/dashboard/stories/new/page.tsx` - URL-based story creator
- ✅ `app/dashboard/playlists/new/page.tsx` - YouTube playlist creator
- ✅ `app/dashboard/page.tsx` - Dashboard with both stories and playlists
- ✅ `supabase/migrations/002-add-playlist-type.sql` - Playlist document type
- ⏳ `recursive-landing/pages/content/viewer.html` - To be created in dev branch

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

## Phase 8: Publishing Workflow & Licensing (NEXT)

**Date:** 2025-11-19
**Status:** Planning
**Goal:** Implement clear publishing workflow with licensing, terms, and channel submission

**Dev Branch Name:** `feature/publishing-workflow-20251119` (across all repos)

---

### Overview: Gateway Building with Clear Legal Framework

Before opening to community, we need:
1. ✅ Clear licensing for user-generated content
2. ✅ Terms of use that protect the platform
3. ✅ Smooth workflow from create → publish → share to channels
4. ✅ "Recursive.eco links only" policy for channels (quality control + legal clarity)

---

### Phase 8.1: Legal Foundation & Terms (Week 1)

#### **A) Update About Page Terms** (`recursive-landing/pages/about.html`)

**Location:** Add new subsection at line ~520 (after "Your Content & Responsibilities")

**Content:**
```html
<!-- User-Generated Content & Licensing -->
<div class="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
    <h3 class="text-xl font-bold text-gray-900 mb-3 flex items-center">
        <span class="mr-2">📖</span>
        Content You Create & Publish
    </h3>
    <p class="text-gray-800 mb-3 leading-relaxed">
        When you publish content on Recursive.eco (stories, curated playlists, or mixed sequences),
        all <strong>original content you create</strong>—images, text, narration—is automatically
        licensed under
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener"
           class="text-blue-600 hover:text-blue-800 underline font-semibold">
            Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
        </a>.
    </p>
    <p class="text-gray-800 mb-3 leading-relaxed">
        <strong>What this means:</strong>
    </p>
    <ul class="list-disc list-inside text-gray-800 space-y-1 mb-3">
        <li>✅ Anyone can view, share, and adapt your original content</li>
        <li>✅ They must give you credit (attribution)</li>
        <li>✅ Adaptations must use the same license (share-alike)</li>
        <li>✅ Commercial use is allowed (aligns with Free Software values)</li>
    </ul>
    <p class="text-gray-800 mb-3 leading-relaxed">
        <strong>External content (YouTube videos, etc.):</strong> If you include links to external
        content, those remain under their original creators' terms. You're curating a collection,
        not licensing content you don't own.
    </p>
    <p class="text-gray-800 mb-3 leading-relaxed">
        <strong>Your rights:</strong> You retain copyright to your original work. The CC BY-SA 4.0
        license is a <em>non-exclusive</em> license—you can still use your content elsewhere,
        sell it, or license it differently. You simply can't revoke the public's right to use
        what you've already shared under CC BY-SA 4.0.
    </p>
    <p class="text-gray-800 leading-relaxed">
        <strong>Important:</strong> You represent that you own or have permission to use all content
        you publish. Do not upload copyrighted material without permission. We reserve the right to
        remove content that violates copyright or community standards.
    </p>
</div>
```

**Why this approach:**
- ✅ Generic message works for stories, playlists, AND mixed sequences
- ✅ External link to official CC license (no need to copy full legal text)
- ✅ Clear: "Your stuff = CC BY-SA, External links = not yours"
- ✅ Lives in existing legal section where users expect it

---

#### **B) Add License Checkbox at Publish Time** (`recursive-creator/app/dashboard/sequences/new/page.tsx`)

**Location:** Before "Save & Publish" button (around line 400-500)

**Implementation:**
```tsx
{/* License Agreement - Show before publishing */}
{!isPublished && (
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">
      📖 Publishing Your Content
    </h3>
    <p className="text-gray-700 text-sm mb-4">
      When you publish, all <strong>original content you create</strong>
      (images, text, narration) will be licensed under{' '}
      <a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noopener"
        className="text-purple-600 hover:text-purple-700 underline font-semibold"
      >
        Creative Commons BY-SA 4.0
      </a>.
    </p>
    <p className="text-gray-700 text-sm mb-4">
      If you include links to external content (like YouTube videos),
      those remain under their original creators' terms—you're simply
      curating a collection.
    </p>

    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={licenseAgreed}
        onChange={(e) => setLicenseAgreed(e.target.checked)}
        className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
      />
      <span className="text-sm text-gray-800">
        I confirm that I own or have permission to use all original content
        in this project, and I agree to license it under CC BY-SA 4.0.
        I have read the{' '}
        <a
          href="https://recursive.eco/pages/about.html#terms"
          target="_blank"
          rel="noopener"
          className="text-purple-600 hover:text-purple-700 underline"
        >
          Terms of Use
        </a>.
      </span>
    </label>
  </div>
)}

{/* Update publish button to require license agreement */}
<button
  onClick={handleSaveDraft}
  disabled={saving || !title || items.length === 0 || !licenseAgreed}
  className="..."
>
  {isPublished ? 'Update Published Content' : 'Save & Publish'}
</button>
```

**Key Features:**
- ✅ Same message for ALL content types (stories, playlists, mixed)
- ✅ Checkbox required to publish (enforced via disabled button)
- ✅ Link to Terms of Use for full details
- ✅ External link to CC BY-SA 4.0 license

**State to add:**
```tsx
const [licenseAgreed, setLicenseAgreed] = useState(false);
```

---

### Phase 8.2: Submit to Community Button (Week 1) 🔄 CURRENT

**Goal:** Test the publish → submit → channels workflow BEFORE adding link restrictions

**Strategy:** Pre-fill channels submission form from creator success modal

**Why This Order:**
- ✅ Test happy path first (make sure workflow works)
- ✅ Then add restrictions (link validation)
- ✅ Avoid debugging workflow issues while also dealing with validation errors

---

#### **Implementation: Pre-filled Submission Flow**

**File:** `recursive-creator/app/dashboard/sequences/new/page.tsx`

Add after successful publish:

```tsx
{/* Success message with channel submission */}
{success && isPublished && publishedUrl && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
    <h3 className="text-xl font-bold text-gray-900 mb-3">
      🎉 Published Successfully!
    </h3>
    <p className="text-gray-700 mb-4">
      Your content is now live at:{' '}
      <a
        href={publishedUrl}
        target="_blank"
        rel="noopener"
        className="text-purple-600 hover:text-purple-700 underline font-semibold"
      >
        {publishedUrl}
      </a>
    </p>

    {/* Submit to Community Channel button */}
    <div className="bg-white border border-purple-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-2">
        📢 Share with the Community
      </h4>
      <p className="text-sm text-gray-700 mb-3">
        Submit your content to the Kids Stories channel so other families can discover it!
      </p>
      <p className="text-xs text-gray-600 mb-3 italic">
        💡 You can also share links from trusted sources like Goodreads (book recommendations),
        Claude/ChatGPT (AI tools), Amazon (products), or Google Drive (shared files).
      </p>
      <a
        href={buildChannelSubmitUrl(publishedUrl, title, description)}
        target="_blank"
        rel="noopener"
        className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
      >
        Submit to Community Stories →
      </a>
      <p className="text-xs text-gray-500 mt-2">
        Opens in channels.recursive.eco with your content pre-filled.
        You can review before submitting.
      </p>
    </div>
  </div>
)}

// Helper function
const buildChannelSubmitUrl = (link: string, title: string, desc: string) => {
  const url = new URL('https://channels.recursive.eco/submit');
  url.searchParams.set('link', link);
  url.searchParams.set('title', title);
  url.searchParams.set('description', desc || '');
  url.searchParams.set('channel', 'kids-stories');
  return url.toString();
};
```

---

### Phase 8.3: Link Validation for Channels (Week 2) - AFTER 8.2 Works

**Goal:** Add link validation to channels, but allow multiple trusted domains (not just recursive.eco)

**Strategy:** Test workflow first (8.2), then add smart validation that supports content curation

**Allowed Domains:**
- `recursive.eco` (all subdomains) - Own content
- `goodreads.com` - Book recommendations
- `claude.ai` - AI tools/resources
- `chatgpt.com` / `openai.com` - AI tools/resources
- `amazon.com` - Product recommendations
- `drive.google.com` - Shared documents, images, files

**Rationale:**
- Support content curation from trusted platforms
- Still maintain quality control (no random spam sites)
- Flexible enough for different content types
- Google Drive allows sharing resources without self-hosting

---

#### **Implementation: Multi-Domain Validation**

**File:** `recursive-channels-fresh/app/submit/page.tsx` (or wherever submit form lives)

```tsx
// Allowed domains for channel submissions
const ALLOWED_DOMAINS = [
  'recursive.eco',
  'goodreads.com',
  'claude.ai',
  'chatgpt.com',
  'openai.com',
  'amazon.com',
  'drive.google.com'
];

// Validate that submitted link is from allowed domain
const isValidLink = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Check if hostname matches any allowed domain (including subdomains)
    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

// Show helpful error if link not allowed
{linkUrl && !isValidLink(linkUrl) && (
  <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
    <p className="text-sm text-red-800 mb-2">
      <strong>Link not from allowed domain.</strong>
    </p>
    <p className="text-sm text-gray-700 mb-2">
      For quality control, we only accept links from these trusted sources:
    </p>
    <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
      <li><strong>recursive.eco</strong> - Your own published content</li>
      <li><strong>goodreads.com</strong> - Book recommendations</li>
      <li><strong>claude.ai, chatgpt.com</strong> - AI tools & resources</li>
      <li><strong>amazon.com</strong> - Product recommendations</li>
      <li><strong>drive.google.com</strong> - Shared documents & files</li>
    </ul>
    <p className="text-sm text-gray-700 mt-2">
      To share your own content, publish it at{' '}
      <a href="https://creator.recursive.eco" className="text-blue-600 underline">
        creator.recursive.eco
      </a>{' '}
      first, then submit the recursive.eco/view/... link here.
    </p>
  </div>
)}

// Also disable submit button if link invalid
<button
  onClick={handleSubmit}
  disabled={submitting || !linkUrl || !isValidLink(linkUrl)}
  className="..."
>
  Submit to Channel
</button>
```

---

### Phase 8.4: Call-to-Action Banner (Later)

**Location:** `recursive-landing/view.html` (or wherever the viewer lives)

**Implementation:**
```html
<!-- CTA Banner - Show above content (hero section) -->
<div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 text-center mb-8 rounded-lg">
  <h3 class="text-xl font-bold mb-2">✨ Create Your Own Story</h3>
  <p class="text-sm mb-4 opacity-90">
    Share stories that reflect your family's experiences and culture
  </p>
  <a
    href="https://creator.recursive.eco/dashboard/sequences/new"
    class="inline-block px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
  >
    Start Creating →
  </a>
</div>

<!-- Optional: Hide CTA if viewing own content -->
<script>
  // Check if viewer is the creator (via URL param or session)
  const urlParams = new URLSearchParams(window.location.search);
  const isOwnContent = urlParams.get('preview') === 'true'; // or other logic

  if (isOwnContent) {
    document.querySelector('.cta-banner')?.remove();
  }
</script>
```

---

### Phase 8.5: Dev Branch Strategy (Cross-Repo Coordination)

**Branch Name:** `feature/publishing-workflow-20251119`

**Affected Repositories:**
1. **recursive-landing** - About page terms update
2. **recursive-creator** - License checkbox + channel submission button
3. **recursive-channels-fresh** - Submit form validation (recursive.eco links only)

**Workflow:**

```bash
# Step 1: Create branches in all repos
cd recursive-landing
git checkout -b feature/publishing-workflow-20251119

cd ../recursive-creator
git checkout -b feature/publishing-workflow-20251119

cd ../recursive-channels-fresh
git checkout -b feature/publishing-workflow-20251119

# Step 2: Make changes in parallel
# - Landing: Update about.html (add licensing section)
# - Creator: Add license checkbox + success modal with channel submit button
# - Channels: Add link validation (recursive.eco only)

# Step 3: Test locally with all 3 running
npm run dev # In each repo on different ports

# Step 4: Commit and push
git add .
git commit -m "feat: implement publishing workflow with licensing and channel submission"
git push origin feature/publishing-workflow-20251119

# Step 5: Deploy to dev/staging for testing

# Step 6: Merge to main after testing
git checkout main
git merge feature/publishing-workflow-20251119
git push origin main
```

**Testing Checklist:**
- [ ] About page shows new licensing section with CC BY-SA 4.0 link
- [ ] Creator dashboard requires license checkbox to publish
- [ ] Success modal appears after publishing with channel submit button
- [ ] Channel submit button opens channels.recursive.eco with pre-filled form
- [ ] Channels form accepts pre-filled query params
- [ ] Channels form rejects non-recursive.eco links
- [ ] Full workflow: create → publish → submit → approve works end-to-end

---

### Implementation Priority (REVISED 2025-11-19)

**Phase 8.1: Legal Foundation** ✅ COMPLETE
1. ✅ Update about.html with licensing section
2. ✅ Add license checkbox to creator dashboard

**Phase 8.2: Submit to Community Button** 🔄 NEXT (Test workflow FIRST)
3. ⏳ Add "Submit to Community" success modal in creator
4. ⏳ Verify channels submit form accepts query params
5. ⏳ Test full workflow: publish → submit → appears in channels
   - **Goal:** Ensure basic workflow works before adding restrictions

**Phase 8.3: Link Validation** (AFTER 8.2 works)
6. ⏳ Add link validation to channels (allow multiple trusted domains)
   - **Allowed domains:**
     - `recursive.eco` (all subdomains)
     - `goodreads.com`
     - `claude.ai`
     - `chatgpt.com` / `openai.com`
     - `amazon.com`
   - **Rationale:** Support content curation from trusted platforms
   - Show helpful error if domain not allowed - provide contact pp@playfulprocess to ask for a different domain to be included 

**Phase 8.4: CTA Banner** (Later)
7. ⏳ Add CTA banner to viewer
8. ⏳ Hide CTA when viewing own content - This is not necessary, we can add the CTA always with cleaner code 

**Phase 8.5: Testing & Refinement**
9. ⏳ Test full workflow end-to-end
10. ⏳ Gather feedback from test users
11. ⏳ Refine UX based on feedback

---

## Phase 9: YouTube Playlist Batch Import (OPTIONAL ENHANCEMENT)

**Date:** TBD (After Phase 8 complete)
**Status:** Future Planning
**Goal:** Allow batch import of all videos from a YouTube playlist URL

**Priority:** Low (nice-to-have after basic publishing workflow is solid)

---

### Feature Overview

**Current State:** Users can add YouTube videos one-by-one by pasting individual URLs

**Desired State:** Paste ONE YouTube playlist URL → automatically import all video IDs (up to 50)

**Similar to:** Drive folder import (Phase 7) - same pattern, different API

---

### Implementation Plan

#### **A) Backend API Route**

**File:** `recursive-creator/app/api/extract-playlist/route.ts` (new)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { playlistUrl } = await request.json();

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid YouTube playlist URL' },
        { status: 400 }
      );
    }

    // Use YouTube Data API v3 to fetch all videos in playlist
    const apiKey = process.env.GOOGLE_YOUTUBE_API_KEY;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?` +
      `part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();

    // Extract video IDs and titles
    const videos = data.items.map((item: any) => ({
      video_id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      url: `https://youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      thumbnail: item.snippet.thumbnails.default.url
    }));

    return NextResponse.json({ videos, count: videos.length });
  } catch (error) {
    console.error('Playlist extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract playlist videos' },
      { status: 500 }
    );
  }
}

function extractPlaylistId(url: string): string | null {
  // Handle various YouTube playlist URL formats
  const patterns = [
    /[?&]list=([^&]+)/,           // ?list=PLxxx
    /\/playlist\?list=([^&]+)/,   // /playlist?list=PLxxx
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

---

#### **B) Frontend UI Addition**

**File:** `recursive-creator/app/dashboard/sequences/new/page.tsx`

Add next to Drive folder import button:

```tsx
{/* YouTube Playlist Import Button */}
<button
  onClick={() => setShowPlaylistModal(true)}
  className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
>
  🎬 Import YouTube Playlist
</button>

{/* Playlist Import Modal */}
{showPlaylistModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Import YouTube Playlist
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Paste a YouTube playlist URL to import all videos at once (max 50 videos).
      </p>

      <input
        type="text"
        value={playlistUrl}
        onChange={(e) => setPlaylistUrl(e.target.value)}
        placeholder="https://youtube.com/playlist?list=PLxxx..."
        className="w-full px-4 py-2 border border-gray-300 rounded mb-4"
      />

      {playlistError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-800">{playlistError}</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setShowPlaylistModal(false);
            setPlaylistUrl('');
            setPlaylistError(null);
          }}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleImportPlaylist}
          disabled={importingPlaylist || !playlistUrl}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {importingPlaylist ? 'Importing...' : 'Import Videos'}
        </button>
      </div>
    </div>
  </div>
)}
```

**Handler function:**

```tsx
const handleImportPlaylist = async () => {
  setImportingPlaylist(true);
  setPlaylistError(null);

  try {
    const response = await fetch('/api/extract-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistUrl })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to import playlist');
    }

    // Add all videos to items array
    const newItems: SequenceItem[] = data.videos.map((video: any, index: number) => ({
      position: items.length + index + 1,
      type: 'video' as ItemType,
      video_id: video.video_id,
      url: video.url,
      title: video.title
    }));

    setItems([...items, ...newItems]);
    setShowPlaylistModal(false);
    setPlaylistUrl('');

    // Success message
    alert(`Successfully imported ${data.count} videos!`);
  } catch (err: any) {
    setPlaylistError(err.message || 'Failed to import playlist');
  } finally {
    setImportingPlaylist(false);
  }
};
```

**State to add:**

```tsx
const [showPlaylistModal, setShowPlaylistModal] = useState(false);
const [playlistUrl, setPlaylistUrl] = useState('');
const [importingPlaylist, setImportingPlaylist] = useState(false);
const [playlistError, setPlaylistError] = useState<string | null>(null);
```

---

### Technical Details

**Dependencies:**
- Google YouTube Data API key (same as Drive API key - `GOOGLE_YOUTUBE_API_KEY`)
- Can reuse existing API key if you have one
- Free tier: 10,000 quota units/day
- Playlist request costs: ~3 units (1 for list + 2 for snippet data)

**Limitations:**
- Only works with PUBLIC playlists
- Max 50 videos per request (YouTube API limit)
- If playlist has >50 videos, need pagination (future enhancement)
- Quota limits: ~3,000 playlist imports per day on free tier

**User Flow:**
1. User clicks "🎬 Import YouTube Playlist"
2. Modal appears with input field
3. User pastes playlist URL (e.g., `https://youtube.com/playlist?list=PLxxx`)
4. System validates URL format
5. Backend calls YouTube Data API
6. Returns array of video IDs and titles
7. Frontend adds all videos to items array
8. User can review, reorder, remove, or edit titles
9. Save as normal sequence

---

### Estimated Time & Priority

**Time Estimate:** 2-3 hours (similar to Drive folder import complexity)

**Priority:** **LOW** - Optional enhancement after core publishing workflow (Phase 8) is complete

**When to implement:**
- ✅ Phase 8 (publishing workflow + licensing) is complete
- ✅ Users are actively creating playlists
- ✅ Users request this feature (measure demand first!)

**Why low priority:**
- Current workflow (one-by-one) works fine for most use cases
- Playlists are typically 5-10 videos, not 50
- Can add later based on user feedback

---

## Phase 10: Content Reporting & Auto-Moderation (FUTURE)

**Problem:** Need way for viewers to report inappropriate content while preventing abuse

**Solution:** Automatic moderation with appeals process (no manual dashboard needed!)

**Location:** `/view.html` (recursive-landing)

**UI:**
```html
<!-- Discreet button in viewer controls -->
<div class="viewer-controls">
  <button id="prev-btn">← Previous</button>
  <button id="fullscreen-btn">⛶ Fullscreen</button>
  <button id="next-btn">Next →</button>

  <!-- NEW: Report button (subtle, not prominent) -->
  <button id="report-btn" class="text-red-600 text-sm ml-4">
    ⚠ Report
  </button>
</div>
```

**Auto-Moderation Flow:**

**1. First Report (on any content):**
```javascript
async function submitReport() {
  // POST /api/report-content
  const response = await fetch('/api/report-content', {
    method: 'POST',
    body: JSON.stringify({
      content_id: storyId,
      reason: selectedReason, // explicit/violence/hate/other
      details: optionalText
    })
  });

  // AUTOMATIC ACTIONS:
  // 1. Unpublish the reported content (set is_public = false)
  // 2. Increment report_count on that content
  // 3. Increment total_reports_received on creator's profile
  // 4. Send email to creator: "Your story was reported and unpublished. Reply to appeal."
  // 5. Send email to admin: "Content reported and auto-unpublished. Details: [reason]"
  // 6. Show "Thank you" to reporter
}
```

**2. Third Report (across all user's content):**
```javascript
// When total_reports_received >= 3:
// AUTOMATIC ACTIONS:
// 1. Set account_status = 'on_hold' in profiles
// 2. Unpublish ALL their content
// 3. Block new publishing (show message: "Account on hold, contact support")
// 4. Send email to creator: "Your account is on hold due to multiple reports. You may appeal by replying to this email with your explanation."
// 5. Send email to admin: "User account on hold after 3 reports. Awaiting your review of appeals."
```

**3. Appeals Process:**
- Creator replies to email with explanation
- You manually review the appeal
- Options:
  - **Restore:** Change account_status back to 'active', allow republishing
  - **Ban:** Change account_status to 'banned', permanent restriction
  - **Partial restore:** Restore account but keep specific content unpublished

**Database Structure:**
```sql
-- Add to user_documents
ALTER TABLE user_documents ADD COLUMN report_count INTEGER DEFAULT 0;

-- Add to profiles
ALTER TABLE profiles ADD COLUMN account_status TEXT DEFAULT 'active'; -- 'active' | 'on_hold' | 'banned'
ALTER TABLE profiles ADD COLUMN total_reports_received INTEGER DEFAULT 0;
```

**Benefits:**
- ✅ Immediate action on reports (safety first)
- ✅ No moderation dashboard needed initially
- ✅ Prevents abuse (manual appeals review catches false reports)
- ✅ Scales with community (only review appeals, not every report)
- ✅ Email-based workflow (simple, no new UI needed)

**When to implement:** After Phase 8 is complete and community features are active

---

**END OF CONTEXT FILE**
