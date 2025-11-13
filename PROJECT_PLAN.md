# Recursive Creator - Project Plan

> Unified creator hub for Recursive.eco ecosystem
> Clean architecture, minimal refactoring, maximum creative freedom

---

## Philosophy

**Build it right from the start:**
- ✅ Clean Supabase schema (no legacy baggage)
- ✅ Copy proven auth patterns (no reinventing)
- ✅ Vanilla-style viewers (creative freedom)
- ✅ React dashboard (modern DX)
- ✅ Private + public content (flexible visibility)
- ✅ **Consistency with existing patterns** (don't reinvent the wheel)

**Not fast to market - sustainable architecture.**

---

## Design Principles

### Visual Approval Dashboard Philosophy

**Problem:** JSONB data is hard to read in table format. Admins shouldn't need to parse JSON to approve content.

**Solution:** Admin approval dashboards should **render content as it will appear when published**.

**Implementation:**
- ✅ **Story approval** - Preview story in iframe (same recursive-landing viewer as public)
- ✅ **Tool approval** - Show tool rendered (not just JSONB fields)
- ✅ **Channel approval** - Show channel card rendered

**Why this matters:**
1. **Faster approvals** - See what users will see, instantly know if it's good
2. **Catch issues** - Broken images, formatting problems visible immediately
3. **Better UX** - Admin experience should feel polished, not like database admin
4. **Consistency** - Same viewer for preview, approval, and public display

**To implement for recursive-channels:**
- Currently shows tools/channels in table rows (hard to evaluate)
- Should render each tool/channel card as it appears on channels.recursive.eco
- Click to expand full view (like iframe for stories)

**Vulcan Principle Applied:**
Even admin tools should be beautiful. The forge itself deserves craft. 🔨

---

## Core Features

### Phase 1: Story Publisher & Viewer
- Upload images, arrange pages, add metadata
- Preview before publishing
- Publish to public channel or keep private
- Beautiful viewer (copy recursive-landing UX)
- Support for private/unlisted/public visibility

### Phase 2: YouTube Playlist Wrapper
- Create curated playlists for kids
- Privacy-enhanced YouTube embeds
- Adult affirmation gate
- Content moderation queue
- End-of-playlist "Stop Watching" screen

### Phase 3: Unified Account Hub
- Starred content from all Recursive.eco channels
- Account settings (GDPR compliant)
- Future creator tools (video editor, podcast wrapper, etc.)

---

## PIVOT: Unified Content Sequence Creator (2025-11-12)

### Decision: Replace Separate Tools with Unified Sequence Creator

**Why:** Stories (images) and playlists (videos) are fundamentally the same - sequences of content. Instead of maintaining separate creators, build ONE tool that handles both, allowing users to mix images and videos in any order.

**Benefits:**
- ✅ **Maximum Flexibility** - Mix images + videos (story page → video → story page)
- ✅ **Simpler Codebase** - One creator instead of two, less maintenance
- ✅ **Better UX** - One tool to learn, consistent patterns
- ✅ **Future-Proof** - Easy to add audio, PDFs, etc. later
- ✅ **Backward Compatible** - Existing stories/playlists still work

### What This Replaces

**Remove These:**
- ❌ `/dashboard/stories/new` - Separate story creator
- ❌ `/dashboard/playlists/new` - Separate playlist creator
- ❌ Iframe preview approach - Build React viewer instead
- ❌ Separate story/playlist viewers - One unified viewer

**Keep These:**
- ✅ Proxy API route (needed for CORS on Drive images)
- ✅ Google Drive URL conversion to `uc?export=view` format
- ✅ YouTube video ID extraction
- ✅ Existing `user_documents` table structure
- ✅ Approval workflow pattern

### New Unified Data Structure

**Use existing `user_documents` table, new document_type:**

```json
{
  "document_type": "creative_work",
  "tool_slug": "sequence",
  "story_slug": "bedtime-routine-1234567890",
  "document_data": {
    "title": "Bedtime Routine Guide",
    "description": "A calming multimedia sequence",
    "creator_id": "user-uuid",
    "is_active": "false",
    "reviewed": "false",
    "items": [
      {
        "position": 1,
        "type": "image",
        "image_url": "https://drive.google.com/uc?export=view&id=...",
        "alt_text": "Cover page",
        "narration": "Welcome to bedtime"
      },
      {
        "position": 2,
        "type": "video",
        "video_id": "YouTube_VIDEO_ID",
        "title": "Calming music",
        "url": "https://youtube.com/watch?v=..."
      },
      {
        "position": 3,
        "type": "image",
        "image_url": "https://drive.google.com/uc?export=view&id=...",
        "alt_text": "Step 1: Brush teeth",
        "narration": "First, brush your teeth"
      }
    ]
  }
}
```

**Backward Compatibility:**
- Existing stories have `pages` array (type: image only)
- Existing playlists have `videos` array (type: video only)
- New sequences have `items` array (type: mixed)
- Viewer checks which array exists and renders accordingly

### Implementation Plan: Unified Sequence Creator

#### Phase 1: Backend Setup (NO DATABASE CHANGES!)
- [x] Use existing `document_type: 'creative_work'` (already allowed)
- [x] No migration needed - works with existing database!
- [x] No schema changes needed (JSONB flexibility!)
- [x] `tool_slug: 'sequence'` to identify sequences vs other creative works

#### Phase 2: Unified Creator UI (4-5 hours)
**Create:** `/dashboard/sequences/new`

**Features:**
- Title, description fields
- **Add Content** dropdown:
  - → Add Image (Drive URL input, alt text, narration)
  - → Add Video (YouTube URL input, optional title)
- Each item shows:
  - Type badge (📷 Image or 🎥 Video)
  - Thumbnail preview
  - Type-specific input fields
  - Reorder buttons (up/down arrows)
  - Delete button (×)
- Auto-convert Drive sharing links → `uc?export=view` format
- Auto-extract YouTube video IDs from any URL format
- Live preview in React component (not iframe)
- Save to `user_documents` with `items` array

**UI Mockup:**
```
┌──────────────────────────────────────────┐
│ Create Content Sequence                  │
├──────────────────────────────────────────┤
│ Title: [________________________]        │
│ Description: [___________________]       │
│                                          │
│ Content Items (3)           [+ Add ▼]   │
│ ┌──────────────────────────────────┐   │
│ │ [📷] 1. Cover Image         ↑↓× │   │
│ │   URL: drive.google.com/...     │   │
│ │   Alt: [Cover page]             │   │
│ │   [thumbnail]                    │   │
│ ├──────────────────────────────────┤   │
│ │ [🎥] 2. Calming Music       ↑↓× │   │
│ │   URL: youtube.com/watch?v=...  │   │
│ │   Title: [Optional title]       │   │
│ │   [video thumbnail]              │   │
│ ├──────────────────────────────────┤   │
│ │ [📷] 3. Step 1             ↑↓× │   │
│ │   URL: drive.google.com/...     │   │
│ │   [thumbnail]                    │   │
│ └──────────────────────────────────┘   │
│                                          │
│ [Save Draft]  [Cancel]                  │
│                                          │
│ ── Live Preview ────────────────────    │
│ [React viewer component renders here]   │
└──────────────────────────────────────────┘
```

#### Phase 3: React Viewer Component (3-4 hours)
**Create:** `/components/viewers/SequenceViewer.tsx`

**Design Principle: Mobile-First Simplicity**
- **Goal:** Avoid interaction issues like hamburger menu problems
- **Philosophy:** "If you can swipe through it like Instagram stories, it's simple enough"
- **Gestures > Buttons** - Prioritize natural touch interactions
- **Large Touch Targets** - No tiny buttons that fail to register
- **Minimal UI** - Content is king, controls are secondary
- **No Complex Overlays** - Avoid layering that blocks interactions

**Features:**
- Replaces iframe approach with native React component
- Same UX as recursive-landing viewer:
  - **Swipe navigation** (left/right) - PRIMARY interaction
  - Keyboard arrows (desktop)
  - Large fullscreen button (bottom corner, unmissable)
  - Simple page counter (static display)
- Renders images OR videos based on item type:
  ```tsx
  {items.map((item, idx) => (
    item.type === 'image' ? (
      <img src={item.image_url} alt={item.alt_text} />
    ) : (
      <iframe src={`https://youtube-nocookie.com/embed/${item.video_id}`} />
    )
  ))}
  ```
- YouTube embeds use nocookie domain with `rel=0`, `modestbranding=1`
- Mobile-responsive, touch-optimized
- **No hamburger menus, no hover states, no complex controls**

#### Phase 4: Dashboard Integration (1 hour)
**Update:** `/dashboard/page.tsx`

- Show "My Sequences" section
- List all user sequences (title, item count, created date)
- Link to edit sequence
- Link to preview sequence
- Delete option
- Remove "My Stories" and "My Playlists" sections

#### Phase 5: Migration & Cleanup (2 hours)

**Files to Remove:**
```bash
# Remove separate creators
rm app/dashboard/stories/new/page.tsx
rm app/dashboard/playlists/new/page.tsx

# Remove iframe viewer references
# (Clean up any iframe-specific code in dashboard)
```

**Files to Keep:**
```bash
# Keep proxy (needed for CORS)
app/api/proxy-image/route.ts

# Keep conversion utilities (reuse in new creator)
# - convertGoogleDriveUrl()
# - extractYouTubeId()
```

**Update Dashboard:**
- Remove story/playlist creation links
- Add sequence creation link
- Update "My Content" section to show sequences

**Backward Compatibility:**
- Viewer component checks for `pages` array (old stories)
- Viewer component checks for `videos` array (old playlists)
- Viewer component checks for `items` array (new sequences)
- All three formats render correctly

#### Phase 6: Testing (2 hours)
- [ ] Create sequence with only images (like old story)
- [ ] Create sequence with only videos (like old playlist)
- [ ] Create mixed sequence (image → video → image)
- [ ] Test reordering items
- [ ] Test Drive URL conversion
- [ ] Test YouTube URL extraction
- [ ] Test preview in React viewer
- [ ] Test on mobile (swipe, touch)
- [ ] Test keyboard navigation
- [ ] Test fullscreen mode
- [ ] Verify proxy works for Drive images
- [ ] Verify YouTube embeds work with nocookie

### Code Cleanup Checklist

**Remove:**
- [ ] `/app/dashboard/stories/new/page.tsx` (replaced by sequences)
- [ ] `/app/dashboard/playlists/new/page.tsx` (replaced by sequences)
- [ ] Iframe preview code in old creators
- [ ] References to `dev.recursive.eco` viewer iframe
- [ ] Separate story/playlist navigation in dashboard

**Simplify:**
- [ ] Single "Create Sequence" button in dashboard
- [ ] One unified viewer component (not separate story/playlist viewers)
- [ ] Reuse Drive conversion function
- [ ] Reuse YouTube extraction function
- [ ] Keep proxy simple (Drive + Supabase only, no Imgur)

**Keep:**
- [ ] Proxy API route (needed for CORS)
- [ ] Drive URL conversion: `uc?export=view&id=FILE_ID`
- [ ] YouTube ID extraction regex
- [ ] Existing `user_documents` table
- [ ] Approval workflow pattern
- [ ] RLS policies

### Timeline

**Total: ~15 hours (2 days)**
- Phase 1 (Backend): 1-2 hours
- Phase 2 (Creator UI): 4-5 hours
- Phase 3 (React Viewer): 3-4 hours
- Phase 4 (Dashboard): 1 hour
- Phase 5 (Cleanup): 2 hours
- Phase 6 (Testing): 2 hours

### Success Criteria

**A unified sequence creator is successful when:**
- [ ] Can create image-only sequences (replaces stories)
- [ ] Can create video-only sequences (replaces playlists)
- [ ] Can create mixed sequences (new capability!)
- [ ] React viewer renders all three formats correctly
- [ ] Drive images load through proxy without CORS issues
- [ ] YouTube embeds work with clean UI (no related videos)
- [ ] Mobile UX matches recursive-landing quality
- [ ] Existing stories/playlists still viewable (backward compatible)
- [ ] No iframe dependencies (pure React)
- [ ] Codebase is simpler than separate story/playlist tools

---

## Phase 7: Enhanced Bulk Upload (Future Enhancement)

### Drive Folder Import Feature

**User Need:** Currently, adding 10+ images from a Drive folder requires manually sharing and pasting each file link individually - tedious for creators making 15-20 page stories.

**Proposed Solution:** Import all files from a publicly shared Google Drive folder link in one action.

**User Flow:**
```
1. User pastes ONE folder link: https://drive.google.com/drive/folders/FOLDER_ID
2. User clicks "Import from Folder" button
3. App automatically extracts all image/video file links
4. Bulk textarea auto-populates with individual file URLs
5. User clicks "Update Sidebar" - all items added at once!
```

**Technical Approach:**

**Backend API Route:** `/api/import-drive-folder`
```typescript
// Input: Drive folder share link
// Output: Array of file URLs

export async function POST(req: Request) {
  const { folderUrl } = await req.json();

  // 1. Extract folder ID from URL (regex)
  const folderId = extractFolderId(folderUrl);

  // 2. Call Drive API v3 with API key (no OAuth for public folders!)
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?` +
    `q='${folderId}'+in+parents&` +
    `fields=files(id,name,mimeType)&` +
    `key=${process.env.GOOGLE_DRIVE_API_KEY}`
  );

  // 3. Filter for images and videos
  const files = response.files.filter(file =>
    file.mimeType.startsWith('image/') ||
    file.mimeType.startsWith('video/')
  );

  // 4. Convert to direct URLs
  const urls = files.map(file => {
    if (file.mimeType.startsWith('video/')) {
      return `video: https://drive.google.com/file/d/${file.id}/view`;
    } else {
      return `https://drive.google.com/uc?export=view&id=${file.id}`;
    }
  });

  return Response.json({ urls });
}
```

**Frontend Integration:**
- Add "Import from Drive Folder" button next to bulk textarea
- Show modal: "Paste folder link here"
- Call API route, get URLs back
- Auto-fill bulk textarea with one URL per line
- User can review/edit before clicking "Update Sidebar"

**Requirements:**
- **Google Cloud API key** (free, 5 minutes to set up)
- **Environment variable:** `GOOGLE_DRIVE_API_KEY` in `.env.local`
- **Limitation:** Only works with publicly shared folders ("Anyone with link can view")
- **Privacy:** No OAuth needed, no user data accessed, read-only API calls

**Implementation Estimate:** 2-3 hours
- 30 min: Get Google Cloud API key
- 60 min: Build backend API route with Drive API integration
- 30 min: Add frontend button + modal
- 30 min: Testing with various folder sizes

**Benefits:**
- ✅ **10x faster** for bulk uploads (1 paste vs 20 pastes)
- ✅ **Parent-friendly** - less technical friction
- ✅ **No OAuth complexity** - works with public folders immediately
- ✅ **Fallback exists** - manual URL pasting still works
- ✅ **Incremental enhancement** - doesn't break existing workflow

**Trade-offs:**
- ⚠️ Only works with public folders (not private Drive folders)
- ⚠️ Requires API key management (add to deployment env vars)
- ⚠️ Subject to Drive API quotas (unlikely to hit with small-scale use)

**Priority:** Medium (nice-to-have, not critical for MVP)

---

## Architecture Decision: Hybrid Approach

### The Challenge
- **Need:** Private stories + preview (requires auth)
- **Want:** Vanilla-style viewer (creative freedom)
- **Constraint:** Can't have purely static HTML if content is private

### The Solution: Next.js with Vanilla-Style Components

```
recursive-creator/
├── src/app/
│   ├── (auth-required)/       ← Protected routes
│   │   ├── dashboard/         ← React dashboard
│   │   │   ├── page.tsx
│   │   │   ├── stories/       ← Create/edit stories
│   │   │   ├── playlists/     ← Create/edit playlists
│   │   │   └── settings/      ← Account settings
│   │   └── layout.tsx         ← Auth check
│   │
│   ├── stories/
│   │   └── [slug]/
│   │       └── page.tsx       ← Dynamic viewer (checks visibility)
│   │
│   ├── playlists/
│   │   └── [slug]/
│   │       └── page.tsx       ← Dynamic viewer (checks visibility)
│   │
│   ├── api/                   ← Server routes
│   │   ├── auth/
│   │   ├── stories/
│   │   └── playlists/
│   │
│   ├── layout.tsx
│   ├── page.tsx               ← Landing page
│   └── middleware.ts          ← Cookie handling
│
├── src/components/
│   ├── auth/                  ← Copy from recursive-channels-fresh
│   ├── dashboard/             ← Creator tools UI
│   ├── viewers/               ← Vanilla-style viewer components
│   │   ├── StoryViewer.tsx    ← Looks/feels vanilla, works in React
│   │   └── PlaylistViewer.tsx
│   └── ui/                    ← Shared UI components
│
├── src/lib/
│   ├── supabase-client.ts     ← Copy from channels
│   ├── supabase-server.ts     ← Copy from channels
│   └── utils.ts
│
├── public/
│   ├── assets/
│   │   ├── css/
│   │   │   └── animations.css ← Your creative work!
│   │   └── js/
│   │       └── spiral.js      ← Logo animations!
│   └── images/
│
└── package.json
```

### How This Works

**1. Dynamic Routes with Permission Checks:**
```typescript
// app/stories/[slug]/page.tsx
export default async function StoryPage({ params }) {
  const story = await getStory(params.slug);
  const session = await getSession();

  // Permission check
  if (story.visibility === 'private') {
    if (!session || session.user.id !== story.creator_id) {
      return <NotFound />;
    }
  }

  // Render vanilla-style viewer
  return <StoryViewer story={story} />;
}
```

**2. Vanilla-Style React Components:**
```tsx
// components/viewers/StoryViewer.tsx
// This can be EXACTLY the same HTML/CSS/JS as recursive-landing!
export function StoryViewer({ story }) {
  return (
    <>
      {/* Exact same structure as viewer.html */}
      <div className="viewer-container">
        <img src={story.pages[currentPage]} />
        {/* Same navigation logic */}
        {/* Same keyboard handlers */}
        {/* Same animations */}
      </div>

      {/* Include vanilla JS for animations */}
      <Script src="/assets/js/spiral.js" />
    </>
  );
}
```

**3. Benefits:**
- ✅ Private/public/unlisted stories (auth checks work)
- ✅ Preview before publishing (show unpublished to owner)
- ✅ Same creative freedom (vanilla JS/CSS works identically)
- ✅ Your animations work (no React constraints)
- ✅ SSO with other projects (cookie-based auth)

---

## Data Model (Supabase)

### ✅ REVISED: Use Existing user_documents Table (Consistent with Tools/Channels)

**Design Decision:** Stories use the existing `user_documents` table with `document_type='story'`.

**Key Learning:** After initial planning, discovered that tools and channels already have an approval workflow pattern using JSONB-heavy approach. **Consistency > reinventing patterns.**

**The Recursive.eco Approval Pattern:**
```json
{
  "title": "Story Title",
  "author": "Creator Name",
  "is_active": "false",  // String! "false"=pending, "true"=public
  "reviewed": "false",   // String! Has admin reviewed?
  "creator_id": "uuid",
  "approved_at": "2025-11-10T12:00:00Z",  // When approved
  "approved_by": "admin",
  "pages": [...]  // Story content
}
```

**Why This Approach:**
- ✅ **Consistent** with existing tools/channels pattern
- ✅ **Simple** - One field (`is_active`) controls visibility
- ✅ **No new tables** - Reuse existing infrastructure
- ✅ **JSONB-friendly** - Same pattern you already know
- ✅ **AI-friendly** - JSON is native for LLMs
- ✅ **Solo-dev optimized** - Fast iteration, low ceremony
- ✅ **Flexible** - Add fields without migrations

**Rationale:**
- **Small scale** (200 users max) → JSONB is plenty fast
- **Solo developer** → Speed of iteration > perfect structure
- **Consistency** → Don't create different patterns for each content type
- **Proven** → Tools/channels already work this way
- **Domain knowledge > generic advice** - Supabase AI gave good generic patterns, but our codebase has better patterns already

**See:** `APPROVAL_PATTERN.md` for complete documentation of the approval workflow.

### Revised Schema (Use Existing Tables)

```sql
-- NO NEW TABLES! Use existing user_documents table
-- Just add 'story' to document_type constraint

ALTER TABLE user_documents
  ADD CONSTRAINT user_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'tool_session', 'creative_work', 'preference',
    'bookmark', 'interaction', 'transaction',
    'story'  -- NEW!
  ]));

-- Optional: story_slug for fast URL lookups
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS story_slug text;

-- Indexes for fast JSONB queries
CREATE INDEX idx_user_documents_story_pending
  ON user_documents ((document_data->>'is_active'))
  WHERE document_type = 'story' AND document_data->>'is_active' = 'false';

CREATE INDEX idx_user_documents_story_active
  ON user_documents ((document_data->>'is_active'))
  WHERE document_type = 'story' AND document_data->>'is_active' = 'true';

CREATE INDEX idx_user_documents_story_slug
  ON user_documents (story_slug)
  WHERE document_type = 'story';

-- Storage bucket for story images
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;
```

**Migration file:** `supabase/migrations/001-story-approval-revised.sql`

### JSONB Structure (document_data)

**Story in user_documents:**
```json
{
  "title": "The Nest Knows Best: Bunny Coping Tricks",
  "subtitle": "For Little Ones Learning to Sleep",
  "author": "PlayfulProcess",
  "cover_image_url": "story-images/{user_id}/{doc_id}/cover.png",

  // Approval fields (consistent with tools/channels)
  "is_active": "false",   // String! "false"=pending, "true"=public
  "reviewed": "false",    // String! Has admin reviewed?
  "creator_id": "uuid",

  // When approved:
  "approved_at": "2025-11-10T12:00:00Z",
  "approved_by": "admin",

  // Story content (pages array in JSONB)
  "pages": [
    {
      "page_number": 1,
      "image_url": "story-images/{user_id}/{doc_id}/page-1.png",
      "alt_text": "Bunny sitting under a tree",
      "narration": "Once upon a time, there was a brave little bunny..."
    },
    {
      "page_number": 2,
      "image_url": "story-images/{user_id}/{doc_id}/page-2.png",
      "alt_text": "Bunny looking at the moon",
      "narration": "Bunny couldn't sleep and felt worried..."
    }
  ]
}
```

**Queries:**
```sql
-- Admin: Get pending stories
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'false'
ORDER BY created_at DESC;

-- Public: Get approved stories
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'true'
ORDER BY created_at DESC;
```

**playlist_data:**
```json
{
  "title": "Calming Bedtime Videos",
  "description": "Gentle videos for winding down",
  "cover_url": "/playlists/bedtime/cover.jpg",
  "visibility": "public",
  "published": true,
  "creator_id": "user-uuid-here",
  "items": [
    {
      "position": 1,
      "video_provider": "youtube",
      "video_id": "abc123",
      "title": "Gentle Rain Sounds",
      "notes": "10 minutes of calming rain"
    }
  ]
}
```

### Row Level Security (RLS)

```sql
-- Stories: Public can read public stories, owners can do everything
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

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

-- Story pages follow parent story
ALTER TABLE story_pages ENABLE ROW LEVEL SECURITY;

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

-- Similar policies for playlists (same pattern)
```

### Storage Buckets

```sql
-- Create storage bucket for story images
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true);

-- Storage policies
CREATE POLICY "Users can upload their own story images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'story-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Story images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'story-images');

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'story-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Why JSONB for This Project

**Advantages:**
- ✅ **Zero migration overhead** - Change structure in app code, not SQL
- ✅ **AI integration** - JSON is native format for Claude, GPT, embeddings
- ✅ **Fast iteration** - Ship features without planning schema
- ✅ **Good enough queries** - JSONB operators work fine at small scale
- ✅ **Solo dev friendly** - Low cognitive overhead
- ✅ **Custom dashboards** - Claude builds better viz than Studio
- ✅ **Proven pattern** - Same as existing channels/journal projects

**When to add structure:**
- Only if hitting performance issues (won't at 200 users)
- Only if queries become complex (rare with our use case)
- Probably never for this project

**See `SOLO_DEV_DATABASE_GUIDE.md` for detailed analysis and comparison.**

---

## Tech Stack

### Framework
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**

### Styling
- **Tailwind CSS** (utility-first, copy from channels)
- **Custom CSS** (your animations, creative work)

### Auth & Database
- **Supabase Auth** (magic links, copy from channels)
- **Supabase Database** (PostgreSQL)
- **Supabase Storage** (images)

### Key Packages
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.52.1",
    "next": "15.4.3",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "@heroicons/react": "^2.2.0"
  }
}
```

---

## Copy Patterns from Existing Projects

### From recursive-channels-fresh (✅ Copy these files)

**Auth Infrastructure:**
- `src/lib/supabase-client.ts` - Client-side Supabase
- `src/lib/supabase-server.ts` - Server-side Supabase
- `src/middleware.ts` - Cookie handling & session refresh
- `src/components/auth/MagicLinkAuth.tsx` - Login modal
- `src/components/AuthProvider.tsx` - React context

**Dashboard Pattern:**
- `src/app/dashboard/page.tsx` - Tab pattern (starred/submitted/settings)
- Account settings (GDPR data export/deletion)

**What to adapt:**
- Remove "tools" specific code
- Add "stories" and "playlists" tabs
- Keep account settings as-is (already perfect)

### From recursive-landing (✅ Adapt these patterns)

**Story Viewer UI:**
- `pages/stories/viewer.html` - Layout, navigation, fullscreen
- `assets/css/components.css` - Styling
- `spiral/spiral.js` - Animations

**What to adapt:**
- Convert HTML to React component (same structure)
- Keep vanilla JS for animations
- Add auth checks before rendering

---

## Implementation Phases

### Phase 0: Project Setup (Week 1)
- [ ] Initialize Next.js 15 project
- [ ] Copy auth files from recursive-channels-fresh
- [ ] Set up Supabase connection
- [ ] Configure middleware & cookies
- [ ] Test SSO with existing projects
- [ ] Create Supabase schema (stories tables)
- [ ] Set up Storage bucket

### Phase 1: Story Publisher (Week 2-3)

**Story Upload Forge (User-Facing):**
- [ ] Dashboard layout with tabs
- [ ] Story creation form (title, subtitle, author)
- [ ] Image upload component (drag & drop)
- [ ] Page ordering (drag to reorder)
- [ ] **iframe preview** (embed recursive-landing viewer - WYSIWYG)
- [ ] Save draft (is_active='false', reviewed='false')
- [ ] Submit for approval (is_active='false', reviewed='false')
- [ ] Stores in user_documents with document_type='story'

**Admin Approval Dashboard:**
- [ ] List pending stories (WHERE is_active='false')
- [ ] **Visual preview** - Show story in iframe (same as public viewer!)
  - Embed recursive-landing viewer with ?story_id=uuid&preview=true
  - Admin sees exactly what users will see
  - No parsing JSONB in tables
- [ ] Approve button → Sets is_active='true', approved_at, approved_by
- [ ] Reject button → Adds rejection_reason to JSONB
- [ ] List approved/rejected stories (for reference)

**Migration:**
- [x] Run 001-story-approval-revised.sql
- [ ] Bootstrap admin user (UPDATE profiles SET profile_data...)

### Phase 2: Story Viewer (Week 3-4)

**Option A: Iframe Embed (Recommended - WYSIWYG)**
- [ ] Update recursive-landing viewer to fetch from Supabase
  - Add ?story_id=uuid parameter support
  - Add ?preview=true mode (for owner preview)
  - Keep backward compatibility with ?story=slug (local files)
  - Fetch story data from Supabase when story_id provided
- [ ] Iframe embed in recursive-creator
  - /stories/[slug] page embeds recursive-landing viewer
  - RLS policies control who can view
  - Same viewer for: user preview, admin approval, public display

**Option B: Convert to React (More Work, Might Break)**
- [ ] Dynamic route `/stories/[slug]`
- [ ] Permission checks (RLS policies)
- [ ] Convert recursive-landing viewer to React component
- [ ] Keyboard navigation
- [ ] Touch/swipe support
- [ ] Fullscreen mode
- [ ] Page indicator
- [ ] Include spiral animations

**Decision:** Start with Option A (iframe). Only do Option B if iframe has issues.

### Phase 3: Playlist Publisher (Week 5-6)
- [ ] Playlist creation form
- [ ] YouTube URL parser (extract video IDs)
- [ ] Video reordering (drag & drop)
- [ ] Thumbnail caching (YouTube API)
- [ ] Visibility controls
- [ ] Moderation queue (if publishing to channel)

### Phase 4: Playlist Viewer (Week 7-8)
- [ ] Dynamic route `/playlists/[slug]`
- [ ] Adult affirmation gate
- [ ] YouTube privacy-enhanced embed
- [ ] Auto-advance to next video
- [ ] "End of playlist" screen
- [ ] CSP headers (frame-src youtube-nocookie)

### Phase 5: Account Hub (Week 9-10)
- [ ] Starred content from all channels
- [ ] Unified account settings
- [ ] GDPR data export (all Recursive.eco data)
- [ ] Account deletion
- [ ] Newsletter preferences

### Phase 6: Polish & Deploy (Week 11-12)
- [ ] Landing page
- [ ] Error states
- [ ] Loading states
- [ ] Mobile optimization
- [ ] Accessibility audit
- [ ] Update ToS & Privacy Policy
- [ ] Deploy to Vercel
- [ ] Set up domain (creator.recursive.eco)

---

## Deployment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# YouTube API (for thumbnail fetching)
YOUTUBE_API_KEY=your-youtube-api-key
```

### Vercel Deployment
1. Connect GitHub repo
2. Set environment variables
3. Deploy from `main` branch
4. Set up custom domain: `creator.recursive.eco`

### Supabase Configuration
1. Add auth callback URL: `https://creator.recursive.eco/auth/callback`
2. Enable magic link auth
3. Configure cookie settings for cross-domain SSO

---

## Compliance & Legal

### Already Addressed (from channels)
- ✅ GDPR data export/deletion
- ✅ Privacy-first design
- ✅ Clear terms of service

### New Considerations (for kids content)

**COPPA Compliance:**
- Service is parent-facing (not child-directed)
- No accounts for children
- Adult affirmation gate on kid content
- Privacy notice: "We do not knowingly collect children's information"

**YouTube Terms:**
- Use `youtube-nocookie.com` (privacy-enhanced)
- Keep YouTube branding visible
- No downloading/scraping videos
- Clear attribution to YouTube

**Content Moderation:**
- Manual review queue for public playlists
- Report button on public content
- Clear content guidelines
- Admin tools for removal

### Legal Documents to Update
- [ ] Terms of Service (add YouTube embed terms)
- [ ] Privacy Policy (add YouTube data sharing notice)
- [ ] Content Guidelines (for public playlists)
- [ ] Adult supervision notice (for playlist viewers)

---

## Success Metrics

### Phase 1 Success (Stories)
- [ ] Create a story with 5+ images
- [ ] Preview before publishing
- [ ] Publish to public
- [ ] View on mobile (touch navigation works)
- [ ] Share link works
- [ ] Private story only visible to creator

### Phase 2 Success (Playlists)
- [ ] Create playlist with 5+ videos
- [ ] Adult gate works
- [ ] Videos play in youtube-nocookie
- [ ] Auto-advance works
- [ ] End screen shows "Stop Watching"
- [ ] Private playlist only visible to creator

### Phase 3 Success (Account Hub)
- [ ] Starred content from channels shows up
- [ ] Data export downloads all user data
- [ ] Account deletion removes user data
- [ ] SSO works across all projects

---

## Questions & Decisions

### Design Decisions
- **Color scheme:** Match recursive-landing? Or new brand?
- **Typography:** Same fonts as channels?
- **Animations:** Which spiral animations to include?

### Feature Decisions
- **Story limits:** Max images per story? Max file size?
- **Moderation:** Manual review all public content?
- **Channels:** Create dedicated "Stories" and "Playlists" channels?
- **Monetization:** Any premium features? Or 100% free?

### Technical Decisions
- **Image optimization:** Resize on upload? Or on-demand?
- **YouTube caching:** Cache thumbnails/titles? How often refresh?
- **Analytics:** Plausible? Or completely tracker-free?

---

## Next Steps

1. **Review this plan** - Does this align with your vision?
2. **Answer questions** above (design, features, technical)
3. **Initialize project** - `npx create-next-app@latest recursive-creator`
4. **Copy auth files** from recursive-channels-fresh
5. **Start Phase 0** - Get SSO working

---

## Next Session Tasks (Post Auth Implementation)

> **Note:** These tasks are for AFTER dual auth has been implemented in jongu-tool-best-possible-self and recursive-channels-fresh

### 1. Unified Auth Modals Across All Projects ✅

**Goal:** Use the same DualAuth component in recursive-creator as used in channels and journal

**Current Status:**
- ✅ jongu-tool-best-possible-self has DualAuth component
- ✅ recursive-channels-fresh has DualAuth component
- ⏳ recursive-creator needs to adopt the SAME component (currently has own implementation)

**Action Items:**
- [ ] Replace recursive-creator's DualAuth with the final version from channels/journal
- [ ] Ensure all three projects use identical auth UX
- [ ] Test SSO across all three subdomains
- [ ] Verify consistent dark mode styling

### 2. Unified Headers & Footers Strategy

**Challenge:**
- Want headers/footers to match recursive-landing aesthetics
- Tried shared GitHub repo → didn't like that approach
- Tried porting spiral animation to React → didn't work

**Options to Explore:**

**Option A: Vanilla JS/CSS in Next.js Public Folder**
- Keep header.html + footer.html in `/public/components/`
- Include via `<Script>` and `<iframe>` or fetch + inject
- Spiral animation stays vanilla JS (no React constraints)
- Trade-off: Less React integration, but animations work

**Option B: React Components with Vanilla Animation Library**
- Convert HTML structure to React components
- Import spiral.js as external script via `<Script>` tag
- Animations run after React hydration
- Trade-off: Need to ensure animations don't conflict with React

**Option C: Shared NPM Package**
- Create `@recursive/ui-components` package
- Publish header/footer as React components
- Import in all projects: `import { Header } from '@recursive/ui-components'`
- Trade-off: Overhead of maintaining separate package

**Option D: Copy-Paste Pattern (Simplest)**
- Accept that headers/footers are copied across projects
- When updating, update in all 4 projects simultaneously
- Use Claude Code to make changes consistently
- Trade-off: Manual sync, but full control per-project

**Recommended:** Start with Option D (copy-paste), move to Option B if animations prove tricky

**Action Items:**
- [ ] Make a plan for header/footer strategy (choose option)
- [ ] Test spiral animation in React component (Option B)
- [ ] If spiral breaks, try vanilla script approach (Option A)
- [ ] Document chosen solution in SHARED_UI.md
- [ ] Implement in recursive-creator first (proof of concept)
- [ ] Roll out to channels and journal if successful

### 3. Resume Phase 1 Features

**After Auth + UI are unified:**
- [ ] Continue with story publisher implementation
- [ ] Build story viewer
- [ ] Implement image upload
- [ ] Add preview mode

See Phase 1 tasks in main project plan above.

---

## Notes

### Why This Approach Works

**Minimal Refactoring:**
- Auth: Copy proven patterns (no reinventing)
- Viewer: Adapt existing HTML (no rewriting)
- Schema: Clean from start (no migrations)

**Maximum Creativity:**
- Vanilla-style components (your animations work)
- Server-side rendering (private content works)
- Next.js flexibility (best of both worlds)

**Sustainable Architecture:**
- Clear separation (dashboard vs viewers)
- Clean data model (easy to extend)
- Future-proof (more creator tools fit naturally)

### Philosophy Alignment

From mission-statement.md:
> "Gateway building, not gatekeeping"

This project embodies that:
- Tools are free and open
- Parents can create and share
- Content is portable (JSON export)
- No vendor lock-in (can fork and self-host)

---

**Ready to build.** 🚀
