# The Recursive.eco Approval Pattern

> **Consistent JSONB-heavy approach for tools, channels, and stories**

---

## Overview

All user-submitted content (tools, channels, stories) follows the **same approval pattern**:

```
User creates → is_active="false" (pending)
  ↓
Admin reviews in dashboard
  ↓
Admin approves → is_active="true" (public)
  OR
Admin rejects → is_active="false" + rejection note
```

**Key principle:** Everything lives in JSONB. No separate approval columns.

---

## The Pattern (From Tools & Channels)

### Data Structure

All approval metadata lives in the JSONB column (`tool_data`, `channel_data`, `document_data`):

```json
{
  "name": "My Awesome Tool",
  "description": "...",

  // Approval fields (consistent across all content types)
  "is_active": "false",   // String! "false" = pending/draft, "true" = public
  "reviewed": "false",    // String! Has admin reviewed?
  "creator_id": "uuid",   // Who created it

  // Set when approved:
  "approved_at": "2025-11-10T12:00:00.000Z",
  "approved_by": "admin",

  // OR set when rejected:
  "rejected_at": "2025-11-10T12:00:00.000Z",
  "rejected_by": "admin",
  "rejection_reason": "Needs better description"
}
```

### Key Observations

1. **Strings, not booleans!**
   - ✅ `"is_active": "true"` (string)
   - ❌ `"is_active": true` (boolean)

2. **Timestamps are ISO strings** in JSONB

3. **Simple states:**
   - Pending = `is_active="false"` AND no `approved_at`
   - Approved = `is_active="true"` AND has `approved_at`
   - Rejected = `is_active="false"` AND has `rejected_at`

---

## Why This Pattern?

### ✅ Advantages

1. **Consistent** - Same pattern across tools, channels, stories
2. **Flexible** - Easy to add fields without migrations
3. **Simple** - No complex state machines
4. **JSONB-friendly** - Works well with Postgres JSONB indexing
5. **AI-friendly** - JSON format native for LLMs
6. **Solo-dev friendly** - Fast iteration, low ceremony

### ❌ What We Sacrifice

1. **Query performance** - JSONB extraction slower than columns (but negligible at 200 users)
2. **Type safety** - Strings instead of booleans (but consistent strings are fine)
3. **Referential integrity** - Can't foreign key into JSONB (but don't need it)

**Trade-off accepted:** For solo dev with 200 users, flexibility > optimization.

---

## Implementation for Stories

### Database Schema

Stories use existing `user_documents` table:

```sql
-- No new table! Just add 'story' to document_type
ALTER TABLE user_documents
  ADD CONSTRAINT user_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'tool_session', 'creative_work', 'preference',
    'bookmark', 'interaction', 'transaction',
    'story'  -- NEW!
  ]));

-- Optional: story_slug for fast lookups (like tool_slug)
ALTER TABLE user_documents
  ADD COLUMN story_slug text;
```

### Story Document Data

```json
{
  "title": "The Nest Knows Best",
  "subtitle": "For Little Ones Learning to Sleep",
  "author": "PlayfulProcess",
  "cover_image_url": "story-images/{user_id}/{doc_id}/cover.png",

  // Approval fields (same as tools!)
  "is_active": "false",
  "reviewed": "false",
  "creator_id": "uuid-here",

  // Story-specific fields
  "pages": [
    {
      "page_number": 1,
      "image_url": "story-images/{user_id}/{doc_id}/page-1.png",
      "alt_text": "Bunny sitting under a tree",
      "narration": "Once upon a time..."
    }
  ]
}
```

### Queries

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

-- User: Get my stories (all states)
SELECT * FROM user_documents
WHERE document_type = 'story'
AND user_id = auth.uid();
```

### RLS Policies

```sql
-- Owners can view/edit their own stories (all states)
CREATE POLICY user_view_own_stories
  ON user_documents FOR SELECT
  USING (document_type = 'story' AND user_id = auth.uid());

-- Public can view approved stories only
CREATE POLICY public_view_approved_stories
  ON user_documents FOR SELECT TO PUBLIC
  USING (
    document_type = 'story'
    AND document_data->>'is_active' = 'true'
  );

-- Admin can do everything
CREATE POLICY admin_manage_stories
  ON user_documents FOR ALL
  USING (document_type = 'story' AND is_admin_user(auth.uid()));
```

---

## Admin Approval Flow

### Current Flow (Tools/Channels)

Looking at your tools data, admins manually set these fields in the database or via admin UI.

**Example from your data:**
```json
{
  "id": "034ace1e-9a9f-474e-a6f6-6d418d59cdcc",
  "tool_data": {
    "name": "Daniel Tiger's Neighborhood",
    "is_active": "true",
    "reviewed": "true",
    "approved_at": "2025-10-08T22:56:27.104Z",
    "approved_by": "admin"
  }
}
```

### Recommended Flow for Stories

**Option 1: Manual SQL (simplest, current approach)**
```sql
-- Approve
UPDATE user_documents
SET document_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      document_data,
      '{is_active}', '"true"'
    ),
    '{approved_at}', to_jsonb(now())
  ),
  '{approved_by}', '"admin"'
)
WHERE id = 'story-uuid-here';
```

**Option 2: Admin UI (future)**
- Admin dashboard at `/admin/stories`
- List pending stories with preview
- "Approve" / "Reject" buttons
- Calls Edge Function to update JSONB fields

**Option 3: Edge Function (recommended for scale)**
```typescript
// supabase/functions/approve-story/index.ts
const { story_id, approve, note } = await req.json();

await supabase
  .from('user_documents')
  .update({
    document_data: {
      ...existingData,
      is_active: approve ? "true" : "false",
      reviewed: "true",
      ...(approve ? {
        approved_at: new Date().toISOString(),
        approved_by: "admin"
      } : {
        rejected_at: new Date().toISOString(),
        rejected_by: "admin",
        rejection_reason: note
      })
    }
  })
  .eq('id', story_id);
```

---

## Comparison: Before vs After

### ❌ Original Proposal (Complex)

```sql
-- New columns
ALTER TABLE user_documents ADD COLUMN approval_status text;
ALTER TABLE user_documents ADD COLUMN published boolean;
ALTER TABLE user_documents ADD COLUMN visibility text;
ALTER TABLE user_documents ADD COLUMN reviewer_id uuid;
ALTER TABLE user_documents ADD COLUMN reviewed_at timestamptz;

-- Complex queries
WHERE approval_status = 'approved'
  AND published = true
  AND visibility = 'public';
```

### ✅ Revised Approach (Simple, Consistent)

```sql
-- No new columns (maybe story_slug for convenience)
-- Everything in JSONB

-- Simple queries
WHERE document_data->>'is_active' = 'true';
```

---

## Indexing Strategy

Since we query `is_active` frequently, create partial indexes:

```sql
-- Fast lookup for pending stories (admin dashboard)
CREATE INDEX idx_user_documents_story_pending
  ON user_documents ((document_data->>'is_active'))
  WHERE document_type = 'story' AND document_data->>'is_active' = 'false';

-- Fast lookup for public stories (story listing)
CREATE INDEX idx_user_documents_story_active
  ON user_documents ((document_data->>'is_active'))
  WHERE document_type = 'story' AND document_data->>'is_active' = 'true';
```

**Performance:** With 200 users and ~50 stories, these indexes make queries instant (<1ms).

---

## Migration Path

### Step 1: Run Migration
Copy/paste `001-story-approval-revised.sql` into Supabase SQL Editor.

### Step 2: Bootstrap Admin
```sql
UPDATE profiles
SET profile_data = jsonb_set(profile_data, '{is_admin}', 'true'::jsonb, true)
WHERE email = 'your-email@example.com';
```

### Step 3: Test with Dummy Story
```sql
INSERT INTO user_documents (user_id, document_type, story_slug, document_data)
VALUES (
  auth.uid(),
  'story',
  'test-story',
  '{
    "title": "Test Story",
    "subtitle": "Testing the forge",
    "author": "Test User",
    "is_active": "false",
    "reviewed": "false",
    "creator_id": "' || auth.uid()::text || '",
    "pages": [
      {
        "page_number": 1,
        "image_url": "test.png",
        "narration": "Once upon a time..."
      }
    ]
  }'::jsonb
);
```

### Step 4: Verify RLS Works
```sql
-- As owner: Should see your story
SELECT * FROM user_documents WHERE document_type = 'story' AND user_id = auth.uid();

-- As admin: Should see all stories
SELECT * FROM user_documents WHERE document_type = 'story';

-- As public: Should see nothing (is_active='false')
-- Log out and try:
SELECT * FROM user_documents WHERE document_type = 'story';
```

### Step 5: Approve Test Story
```sql
-- As admin
UPDATE user_documents
SET document_data = document_data ||
  '{"is_active": "true", "reviewed": "true", "approved_at": "2025-11-10T12:00:00.000Z", "approved_by": "admin"}'::jsonb
WHERE document_type = 'story' AND story_slug = 'test-story';
```

### Step 6: Verify Public Can See
```sql
-- Log out, should now see the story:
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'true';
```

---

## Future Enhancements (Only If Needed)

### 1. Review History (Low Priority)

If you need full audit trail:

```sql
CREATE TABLE content_reviews (
  id uuid PRIMARY KEY,
  content_type text,  -- 'tool', 'channel', 'story'
  content_id uuid,
  reviewer_id uuid,
  action text,  -- 'approved', 'rejected', 'requested_changes'
  note text,
  created_at timestamptz
);
```

**When to add:** Multiple rounds of review needed, or want review notes in UI.

### 2. Unified Approval System (Medium Priority)

If tools/channels also need approval workflow:

```typescript
// Generic approval function
async function approveContent(
  contentType: 'tool' | 'channel' | 'story',
  contentId: uuid,
  approve: boolean,
  note?: string
) {
  const table = contentType === 'story' ? 'user_documents' : `${contentType}s`;
  const dataColumn = contentType === 'story' ? 'document_data' : `${contentType}_data`;

  await supabase
    .from(table)
    .update({
      [dataColumn]: {
        ...existingData,
        is_active: approve ? "true" : "false",
        // ... rest of approval logic
      }
    })
    .eq('id', contentId);
}
```

**When to add:** Pattern repeats 3+ times, or building unified admin dashboard.

---

## Summary: The Recursive.eco Way

✅ **JSONB-heavy** - Flexible, AI-friendly, fast iteration
✅ **Simple state** - `is_active` controls visibility
✅ **Consistent** - Same pattern across all content types
✅ **Solo-dev optimized** - Low ceremony, high velocity
✅ **Scale-appropriate** - Perfect for 200 users, can grow to 1000+

**Philosophy:** Ship features fast. Optimize when pain emerges. 🔨

---

## Related Documentation

- **BACKLOG_DB_OPTIMIZATIONS.md** - Future improvements (don't over-engineer!)
- **supabase/migrations/001-story-approval-revised.sql** - Ready-to-run migration
- **CLAUDE.md** - Full project context
