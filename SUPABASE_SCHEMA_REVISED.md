# Supabase Schema: Relational Design (Revised)

> Moving away from JSONB hell to clean, queryable relational structure

---

## Why Relational > JSONB

### Your Current Problem (JSONB-heavy):

```sql
-- Current approach (recursive-channels-fresh)
CREATE TABLE tools (
  id uuid,
  tool_data jsonb DEFAULT '{
    "name": "",
    "description": "",
    "creator_id": null,
    "is_active": true,
    "stats": {"stars": 0, "views": 0}
  }'
);
```

**Problems:**
- ❌ Can't query: `SELECT * FROM tools WHERE tool_data->>'creator_id' = ?` (ugly!)
- ❌ No foreign key constraints (data integrity issues)
- ❌ Hard to see in Supabase Studio
- ❌ Can't join easily
- ❌ AI can't help (doesn't understand JSONB structure)
- ❌ Schema changes require app code changes

### Relational Approach:

```sql
-- New approach (recursive-creator)
CREATE TABLE stories (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  cover_image_url text,
  visibility text NOT NULL,
  published boolean DEFAULT false,
  creator_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

**Benefits:**
- ✅ Clear schema visible in Studio
- ✅ Foreign keys enforce integrity
- ✅ Easy queries: `SELECT * FROM stories WHERE creator_id = ?`
- ✅ Joins work naturally
- ✅ Supabase AI understands structure
- ✅ Schema changes = migrations (proper versioning)

---

## Revised Schema for recursive-creator

### Core Principle: **Columns for Structure, JSONB for Flexibility**

Use proper columns for:
- ✅ IDs and foreign keys
- ✅ Core searchable fields (title, status, visibility)
- ✅ Timestamps
- ✅ Anything you'll query/filter on

Use JSONB only for:
- ✅ Optional metadata that changes rarely
- ✅ User preferences (truly flexible)
- ✅ Settings objects

---

## Stories Schema (Fully Relational)

```sql
-- Main story metadata
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,

  -- Core searchable fields (NOT jsonb!)
  title text NOT NULL,
  subtitle text,
  author text,
  cover_image_url text,

  -- Status fields (NOT jsonb!)
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  published boolean DEFAULT false,

  -- Relationships (NOT jsonb!)
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES channels(id),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,

  -- Only use JSONB for truly flexible metadata
  metadata jsonb DEFAULT '{}'::jsonb
  -- Examples: reading_level, age_range, themes, custom_tags
);

-- Story pages (relational, not nested in JSONB)
CREATE TABLE story_pages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  -- Page data (NOT jsonb!)
  image_url text NOT NULL,
  page_number integer NOT NULL,
  alt_text text, -- For accessibility
  narration_text text, -- Optional read-aloud text

  created_at timestamptz DEFAULT now(),

  UNIQUE(story_id, page_number)
);

-- Indexes for common queries
CREATE INDEX idx_stories_creator_id ON stories(creator_id);
CREATE INDEX idx_stories_visibility ON stories(visibility) WHERE published = true;
CREATE INDEX idx_stories_published_at ON stories(published_at DESC) WHERE published = true;
CREATE INDEX idx_story_pages_story_id ON story_pages(story_id);
```

---

## Playlists Schema (Fully Relational)

```sql
-- Main playlist metadata
CREATE TABLE playlists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,

  -- Core fields (NOT jsonb!)
  title text NOT NULL,
  description text,
  cover_url text,

  -- Status fields (NOT jsonb!)
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  published boolean DEFAULT false,
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

  -- Relationships (NOT jsonb!)
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES channels(id),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,

  -- Optional metadata JSONB (themes, age_range, etc.)
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Playlist items (relational)
CREATE TABLE playlist_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,

  -- Video data (NOT jsonb!)
  video_provider text DEFAULT 'youtube',
  video_id text NOT NULL,
  title text, -- Cached from provider API
  thumbnail_url text, -- Cached
  duration_seconds integer, -- Cached

  -- Ordering (NOT jsonb!)
  position integer NOT NULL,

  -- Optional parent notes
  notes text,

  created_at timestamptz DEFAULT now(),

  UNIQUE(playlist_id, position)
);

-- Indexes
CREATE INDEX idx_playlists_creator_id ON playlists(creator_id);
CREATE INDEX idx_playlists_visibility ON playlists(visibility) WHERE published = true;
CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
```

---

## Shared Tables (Already Good)

### Channels (Keep Existing, Maybe Improve)

**Current (JSONB-heavy):**
```sql
CREATE TABLE channels (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  channel_data jsonb -- Everything in here!
);
```

**Recommended (Relational):**
```sql
CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,

  -- Core fields
  name text NOT NULL,
  description text,
  tagline text,
  icon text DEFAULT '🌟',

  -- Status
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,

  -- Relationships
  creator_id uuid REFERENCES auth.users(id),

  -- Theme (OK to use JSONB for colors/styling)
  theme jsonb DEFAULT '{"primary": "#10b981"}'::jsonb,

  -- Stats (OK to use JSONB for counters)
  stats jsonb DEFAULT '{"tools": 0, "users": 0}'::jsonb,

  -- Settings (OK to use JSONB for flexible config)
  settings jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Why this is better:**
- ✅ Can query: `SELECT * FROM channels WHERE is_active = true`
- ✅ Still flexible: theme/stats/settings in JSONB
- ✅ Clear structure in Studio

---

## User Data (Keep Minimal)

### Profiles (Simplify)

**Current (JSONB-heavy):**
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  profile_data jsonb -- Everything!
);
```

**Recommended:**
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),

  -- Core identity (NOT jsonb!)
  email text UNIQUE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,

  -- Flags (NOT jsonb!)
  is_creator boolean DEFAULT false,
  is_anonymous boolean DEFAULT true,

  -- External IDs
  stripe_customer_id text,

  -- Preferences (OK for JSONB - truly flexible)
  preferences jsonb DEFAULT '{}'::jsonb,
  -- Example: theme, notifications, language

  -- Stats (OK for JSONB - counters)
  stats jsonb DEFAULT '{"sessions": 0, "donations_given": 0}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## Cross-Project Tables

### User Interactions (Starred, Bookmarks)

**Instead of generic `user_documents` with JSONB, use specific tables:**

```sql
-- Starred content (can star stories, playlists, tools, etc.)
CREATE TABLE user_stars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Polymorphic reference (clean way)
  target_type text NOT NULL CHECK (target_type IN ('story', 'playlist', 'tool', 'journal_template')),
  target_id uuid NOT NULL,

  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, target_type, target_id)
);

-- Journal entries (from best-possible-self)
CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id bigint REFERENCES journal_templates(id),

  -- Entry data (NOT jsonb!)
  title text,
  content text NOT NULL,

  -- Metadata
  is_public boolean DEFAULT false,
  word_count integer,

  -- AI reflection (optional)
  ai_reflection text,
  ai_generated_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Why this is better:**
- ✅ Can query: `SELECT * FROM user_stars WHERE user_id = ? AND target_type = 'story'`
- ✅ Can join: `JOIN stories ON user_stars.target_id = stories.id WHERE target_type = 'story'`
- ✅ Clear data model

---

## RLS Policies (Much Cleaner with Relational)

```sql
-- Stories: Public can read public stories, owners can do everything
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
```

**Much cleaner than:**
```sql
-- Old JSONB approach (ugly!)
CREATE POLICY "..." ON tools FOR SELECT
USING (tool_data->>'is_active' = 'true' OR tool_data->>'creator_id' = auth.uid()::text);
```

---

## Migration Strategy

### For New Project (recursive-creator):
- ✅ Use fully relational schema from day 1
- ✅ No migration needed

### For Existing Projects (channels, journal):
- ⚠️ Can migrate gradually OR keep as-is
- ⚠️ Don't migrate unless necessary (risk vs reward)

**My recommendation:**
- ✅ **New project (recursive-creator): Full relational** ← Start clean!
- ⚠️ **Existing projects: Keep as-is** ← Too risky to migrate now

**Future:**
- When you rebuild channels/journal, use relational
- For now, leave them alone (they work!)

---

## Benefits of This Approach

### For Development:
- ✅ Supabase AI can help write queries
- ✅ Studio shows clear table structure
- ✅ Easy to explore data visually
- ✅ Migrations are trackable (not app code changes)

### For Queries:
```sql
-- OLD (JSONB approach):
SELECT * FROM tools
WHERE tool_data->>'creator_id' = 'uuid'
AND tool_data->>'is_active' = 'true'
AND tool_data->>'visibility' = 'public';

-- NEW (Relational approach):
SELECT * FROM stories
WHERE creator_id = 'uuid'
AND published = true
AND visibility = 'public';
```

**100x more readable!**

### For Joins:
```sql
-- Get user's published stories with page count
SELECT
  s.title,
  s.published_at,
  COUNT(sp.id) as page_count
FROM stories s
LEFT JOIN story_pages sp ON sp.story_id = s.id
WHERE s.creator_id = 'uuid'
AND s.published = true
GROUP BY s.id;
```

**Try doing that with JSONB! 😱**

---

## Final Recommendation

### For recursive-creator (NEW PROJECT):
**✅ Use fully relational schema (this document)**

### For recursive-channels-fresh (EXISTING):
**⚠️ Keep JSONB approach for now**
- Too risky to migrate production data
- Works fine currently
- Rebuild with relational when you do major refactor

### For jongu-tool-best-possible-self (EXISTING):
**⚠️ Keep current approach**
- journal_entries might already be relational-ish
- Don't fix what's not broken

---

## Updated PROJECT_PLAN.md Schema

I'll update the PROJECT_PLAN.md to use this relational schema instead of the JSONB-heavy one I initially suggested.

**Your instinct was correct:** Relational > JSONB for maintainability! 🎉
