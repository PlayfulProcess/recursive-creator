# Context for Claude Code: Recursive Creator Project

> **Last Updated:** 2025-11-03
> **Current Phase:** Phase 0 - Project Setup & Auth Implementation
> **Next Session:** Initialize Next.js project and implement dual auth

---

## Project Overview

**Name:** Recursive Creator
**Purpose:** Unified creator hub for Recursive.eco ecosystem
**Domain:** creator.recursive.eco (future)
**Stack:** Next.js 15 + React 19 + Supabase + TypeScript

**What We're Building:**
1. **Story Publisher** - Parents upload images to create children's books
2. **Playlist Wrapper** - Curated YouTube playlists for kids (privacy-enhanced)
3. **Account Hub** - Unified dashboard for all Recursive.eco content

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

## Key Decision: Relational Schema ✅

**Decision Made:** Use proper relational design, NOT JSONB-heavy

**Rationale:**
- Current approach (channels/journal) uses JSONB heavily → hard to query
- Supabase AI now helps with schema design
- Easier to navigate in Studio
- Better for joins and complex queries
- Cleaner RLS policies

**See:** `SUPABASE_SCHEMA_REVISED.md` for full schema

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

### 1. Hybrid Approach (React + Vanilla-Style Viewers)

**Question Resolved:** "Does vanilla HTML have more creative freedom?"

**Answer:** No - it's mostly psychological. React can render identical HTML/CSS/JS.

**Solution:**
- Use Next.js dynamic routes (for auth checks)
- Render vanilla-style components (same UX as recursive-landing)
- Best of both worlds: auth checks + creative freedom

### 2. Private/Unlisted/Public Content

**Requirement:** Users need to preview stories before publishing

**Solution:**
- Server-side permission checks in Next.js routes
- Visibility options: private (owner only), unlisted (anyone with link), public (everyone)
- Preview mode shows unpublished content to owner

### 3. Auth Portability

**Requirement:** Copy auth to channels and journal projects

**Solution:**
- All projects share same Supabase instance
- Copy 4 files, update Supabase email template once
- Works across all projects in ~50 minutes
- See: `AUTH_PORTABILITY.md`

---

## Current State

### ✅ Completed:
- [x] Project planning documents created
- [x] Architecture decisions finalized
- [x] Schema design completed (relational)
- [x] Auth strategy defined (dual: magic link + OTP)
- [x] Portability plan documented

### 🔨 Next Steps (Current Session):
- [ ] Initialize Next.js 15 project
- [ ] Copy auth files from recursive-channels-fresh
- [ ] Implement DualAuth component
- [ ] Update Supabase email template
- [ ] Test dual auth flow
- [ ] Copy to other projects (channels, journal)

### 📋 Future Phases:
- [ ] Phase 1: Story publisher & viewer (weeks 2-4)
- [ ] Phase 2: Playlist publisher & viewer (weeks 5-8)
- [ ] Phase 3: Account hub (weeks 9-10)
- [ ] Phase 4: Polish & deploy (weeks 11-12)

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

**New Tables (To Create):**
- `stories` - Story metadata (relational design)
- `story_pages` - Individual story pages
- `playlists` - Playlist metadata (relational design)
- `playlist_items` - Individual videos
- `user_stars` - Cross-project starred content

**Schema Location:** `z.Supabase/schema_20251030.sql`

### Auth Setup

**Current Status:** Magic links only (unreliable)

**Target:** Dual auth (magic link + OTP)

**Implementation:**
1. Update Supabase email template (include `{{ .Token }}`)
2. Create `DualAuth.tsx` component (two-step flow)
3. Create auth callback route
4. Test across email providers

**See:** `AUTH_IMPLEMENTATION_PLAN.md` for complete code

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

### Existing Code to Copy From:
1. **recursive-channels-fresh/src/components/auth/MagicLinkAuth.tsx** - Current auth
2. **recursive-channels-fresh/src/lib/supabase-client.ts** - Supabase client
3. **recursive-channels-fresh/src/lib/supabase-server.ts** - Supabase server
4. **recursive-channels-fresh/src/middleware.ts** - Cookie handling
5. **recursive-landing/pages/stories/viewer.html** - Story viewer UX

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

### Don't Do Without Asking:
- ❌ Don't deploy to production
- ❌ Don't push to git (user handles this)
- ❌ Don't delete existing files
- ❌ Don't modify other projects without permission
- ❌ Don't add emojis unless requested

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
- Check Supabase cookies in browser dev tools
- Verify callback URL in Supabase dashboard
- Check middleware.ts is running
- Test with different email providers

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

## Current Session Context

**Date:** 2025-11-03
**Focus:** Phase 0 - Auth implementation (dual: magic link + OTP)
**User Decision:** Auth first (not fun stuff first)
**Schema Decision:** Relational design (not JSONB-heavy)

**Next Immediate Steps:**
1. Initialize Next.js 15 project in this folder
2. Copy auth files from recursive-channels-fresh
3. Implement DualAuth component (see AUTH_IMPLEMENTATION_PLAN.md)
4. Update Supabase email template
5. Test across email providers (Gmail, Outlook, ProtonMail)
6. Copy to channels and journal projects

**Estimated Time:** 3-4 days (Days 1-4 of PROJECT_PLAN.md)

**User is ready to start!** 🚀

---

## Questions to Ask User (If Resuming and Unclear)

1. "What phase are we on?" (Check Current State)
2. "Should I continue with [next task]?" (Check Next Steps)
3. "Any decisions changed since last session?" (Validate context)
4. "Ready to start implementation?" (Get confirmation)

**If user says "continue," "let's go," or similar:**
→ Check Next Steps, create todos, start work!

---

**END OF CONTEXT FILE**

*This file will be updated as we progress. Always read this first when resuming!*
