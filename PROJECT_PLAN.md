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

**Not fast to market - sustainable architecture.**

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

### ✅ Relational Design (Not JSONB-heavy)

**Design Decision:** Use proper relational structure with columns for core fields, JSONB only for truly flexible metadata.

**See:** `SUPABASE_SCHEMA_REVISED.md` for detailed rationale and comparison with JSONB-heavy approach.

### Stories Schema

```sql
-- Main story metadata (relational design)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,

  -- Core searchable fields (NOT jsonb!)
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  cover_image_url TEXT,

  -- Status fields (NOT jsonb!)
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  published BOOLEAN DEFAULT false,

  -- Relationships (NOT jsonb!)
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Optional flexible metadata (OK to use JSONB here)
  metadata JSONB DEFAULT '{}'::jsonb
  -- Examples: reading_level, age_range, themes, custom_tags
);

-- Story pages (relational, not nested in JSONB)
CREATE TABLE story_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  -- Page data (NOT jsonb!)
  image_url TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  alt_text TEXT, -- For accessibility
  narration_text TEXT, -- Optional read-aloud text

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(story_id, page_number)
);

-- Indexes for common queries
CREATE INDEX idx_stories_creator_id ON stories(creator_id);
CREATE INDEX idx_stories_visibility ON stories(visibility) WHERE published = true;
CREATE INDEX idx_stories_published_at ON stories(published_at DESC) WHERE published = true;
CREATE INDEX idx_story_pages_story_id ON story_pages(story_id);
```

### Playlists Schema

```sql
-- Main playlist metadata (relational design)
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,

  -- Core fields (NOT jsonb!)
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,

  -- Status fields (NOT jsonb!)
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  published BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

  -- Relationships (NOT jsonb!)
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Optional metadata JSONB (themes, age_range, etc.)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Playlist items (relational)
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,

  -- Video data (NOT jsonb!)
  video_provider TEXT DEFAULT 'youtube',
  video_id TEXT NOT NULL,
  title TEXT, -- Cached from provider API
  thumbnail_url TEXT, -- Cached
  duration_seconds INTEGER, -- Cached

  -- Ordering (NOT jsonb!)
  position INTEGER NOT NULL,

  -- Optional parent notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(playlist_id, position)
);

-- Indexes
CREATE INDEX idx_playlists_creator_id ON playlists(creator_id);
CREATE INDEX idx_playlists_visibility ON playlists(visibility) WHERE published = true;
CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
```

### Row Level Security Policies

```sql
-- Stories: Public can read public stories, owners can do everything with their stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public published stories"
  ON stories FOR SELECT
  USING (visibility = 'public' AND published = true);

CREATE POLICY "Users can view their own stories"
  ON stories FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can create stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (auth.uid() = creator_id);

-- Story pages follow story permissions
ALTER TABLE story_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story pages visible to story viewers"
  ON story_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_pages.story_id
      AND (
        (stories.visibility = 'public' AND stories.published = true)
        OR stories.creator_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their story pages"
  ON story_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_pages.story_id
      AND stories.creator_id = auth.uid()
    )
  );

-- Similar policies for playlists and playlist_items (omitted for brevity)
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

### Why Relational > JSONB

**Benefits:**
- ✅ Clear schema visible in Supabase Studio
- ✅ Easy queries: `WHERE creator_id = ?` instead of `WHERE tool_data->>'creator_id' = ?`
- ✅ Foreign key constraints enforce data integrity
- ✅ Natural joins between tables
- ✅ Supabase AI understands structure
- ✅ Migrations are trackable

**When to use JSONB:**
- ✅ Truly flexible metadata (themes, tags)
- ✅ User preferences (changes per user)
- ✅ Settings objects (app configuration)

**See `SUPABASE_SCHEMA_REVISED.md` for detailed comparison and rationale.**

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
- [ ] Dashboard layout with tabs
- [ ] Story creation form (title, subtitle, author)
- [ ] Image upload component (drag & drop)
- [ ] Page ordering (drag to reorder)
- [ ] Visibility controls (private/unlisted/public)
- [ ] Preview mode (view before publishing)
- [ ] Publish flow

### Phase 2: Story Viewer (Week 3-4)
- [ ] Dynamic route `/stories/[slug]`
- [ ] Permission checks (public/private/unlisted)
- [ ] Convert recursive-landing viewer to React
- [ ] Keyboard navigation
- [ ] Touch/swipe support
- [ ] Fullscreen mode
- [ ] Page indicator
- [ ] Include spiral animations

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
