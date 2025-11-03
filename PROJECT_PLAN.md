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

### ✅ Full JSONB Design (Simple & Fast)

**Design Decision:** Use JSONB-heavy approach for solo dev speed and AI integration.

**Rationale:**
- **Small scale** (200 users max) → JSONB is plenty fast
- **Solo developer** → Speed of iteration > perfect structure
- **Infrequent querying** → Don't need optimization
- **AI-friendly** → JSON is native format for LLMs, embeddings, semantic search
- **No migrations** → Change structure anytime without ceremony
- **Claude builds visualizations** → Custom dashboards > Supabase Studio
- **Same pattern as existing projects** → Consistency with channels/journal

**See:** `SIMPLE_JSONB_SCHEMA.md` for complete schema and examples.

### Complete Schema (3 Tables)

```sql
-- Stories (everything in JSONB)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  story_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common JSONB queries
CREATE INDEX idx_stories_creator ON stories ((story_data->>'creator_id'));
CREATE INDEX idx_stories_visibility ON stories ((story_data->>'visibility'));

-- Story pages (minimal structure)
CREATE TABLE story_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  page_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, page_number)
);

-- Playlists (everything in JSONB)
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  playlist_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlists_creator ON playlists ((playlist_data->>'creator_id'));
```

### JSONB Structure Examples

**story_data:**
```json
{
  "title": "Bunny Finds Courage",
  "subtitle": "A tale of bravery",
  "author": "PlayfulProcess",
  "cover_image_url": "/stories/bunny/cover.jpg",
  "visibility": "private",
  "published": false,
  "creator_id": "user-uuid-here",
  "metadata": {
    "themes": ["courage", "kindness"],
    "reading_level": "early-reader",
    "age_range": "3-6"
  }
}
```

**page_data:**
```json
{
  "image_url": "/stories/bunny/page-1.jpg",
  "alt_text": "Bunny sitting under a tree",
  "narration": "Once upon a time, there was a brave little bunny..."
}
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
