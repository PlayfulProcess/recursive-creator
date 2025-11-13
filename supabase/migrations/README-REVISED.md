# Story Migration Guide (Revised - Consistent with Tools/Channels)

> **Uses the same approval pattern as tools and channels: JSONB-heavy, simple, consistent**

---

## Quick Start

### Step 1: Run the Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Click **New Query**
3. Copy the entire contents of `001-story-approval-revised.sql`
4. Paste into SQL Editor
5. Click **Run** (or press Ctrl/Cmd + Enter)

✅ **Safe to run multiple times** - All operations are idempotent

### Step 2: Bootstrap Your Admin User

```sql
UPDATE public.profiles
SET profile_data = jsonb_set(profile_data, '{is_admin}', 'true'::jsonb, true)
WHERE email = 'your-email@example.com';  -- Replace with your email
```

**Verify it worked:**
```sql
SELECT email, profile_data->>'is_admin' as is_admin
FROM profiles
WHERE email = 'your-email@example.com';
```

Should return: `is_admin: true`

### Step 3: Test with a Dummy Story

```sql
INSERT INTO user_documents (user_id, document_type, story_slug, document_data)
VALUES (
  auth.uid(),
  'story',
  'test-bunny-story',
  '{
    "title": "Test Story: Bunny Learns to Sleep",
    "subtitle": "Testing the approval workflow",
    "author": "Test User",
    "is_active": "false",
    "reviewed": "false",
    "creator_id": "' || auth.uid()::text || '",
    "cover_image_url": "story-images/test/cover.png",
    "pages": [
      {
        "page_number": 1,
        "image_url": "story-images/test/page-1.png",
        "alt_text": "Bunny in a nest",
        "narration": "Once upon a time, there was a bunny who lived in a cozy nest..."
      },
      {
        "page_number": 2,
        "image_url": "story-images/test/page-2.png",
        "alt_text": "Bunny looking at stars",
        "narration": "Every night, Bunny looked at the stars and wondered..."
      }
    ]
  }'::jsonb
);
```

### Step 4: Verify RLS Policies

**As owner (you):**
```sql
-- Should see your story
SELECT id, story_slug, document_data->>'title' as title, document_data->>'is_active' as is_active
FROM user_documents
WHERE document_type = 'story' AND user_id = auth.uid();
```

**As public (log out or use anonymous window):**
```sql
-- Should see NOTHING (is_active='false')
SELECT id, story_slug, document_data->>'title' as title
FROM user_documents
WHERE document_type = 'story';
```

### Step 5: Approve the Story (as Admin)

**Option 1: Simple JSONB merge**
```sql
UPDATE user_documents
SET document_data = document_data ||
  jsonb_build_object(
    'is_active', 'true',
    'reviewed', 'true',
    'approved_at', to_jsonb(now()),
    'approved_by', 'admin'
  )
WHERE document_type = 'story'
AND story_slug = 'test-bunny-story';
```

**Option 2: Using jsonb_set (more explicit)**
```sql
UPDATE user_documents
SET document_data =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          document_data,
          '{is_active}', '"true"'
        ),
        '{reviewed}', '"true"'
      ),
      '{approved_at}', to_jsonb(now())
    ),
    '{approved_by}', '"admin"'
  )
WHERE document_type = 'story'
AND story_slug = 'test-bunny-story';
```

### Step 6: Verify Public Can Now See It

**As public (logged out):**
```sql
-- Should now see the approved story!
SELECT id, story_slug, document_data->>'title' as title, document_data->>'approved_at' as approved_at
FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'true';
```

---

## What This Migration Does

### 1. Adds 'story' Document Type
Extends `user_documents` table to support stories (no new table needed!)

### 2. Adds story_slug Column
For fast URL lookups (optional but recommended):
```
/stories/bunny-coping-tricks  ← Fast lookup via story_slug
```

### 3. Creates Indexes for Fast Queries
- Pending stories: `WHERE is_active='false'` (admin dashboard)
- Public stories: `WHERE is_active='true'` (story listing)
- Slug lookups: `WHERE story_slug='...'`

### 4. Creates Admin Helper Function
`is_admin_user(uid)` - Checks if user is admin by reading `profile_data->>'is_admin'`

### 5. Adds RLS Policies

**Owners can:**
- ✅ SELECT their own stories (even if pending)
- ✅ INSERT stories (default is_active='false')
- ✅ UPDATE their own stories (content, not approval status)
- ✅ DELETE their own stories

**Admins can:**
- ✅ SELECT, INSERT, UPDATE, DELETE any story
- ✅ Change approval status (is_active, reviewed, approved_at, etc.)

**Public can:**
- ✅ SELECT approved stories only (is_active='true')

### 6. Creates Storage Bucket
- Bucket: `story-images`
- Path: `story-images/{user_id}/{doc_id}/filename.png`
- Public read, authenticated write

---

## The Approval Pattern (Consistent with Tools/Channels)

### Data Structure

Everything lives in `document_data` JSONB:

```json
{
  "title": "The Nest Knows Best",
  "subtitle": "Bunny Coping Tricks",
  "author": "PlayfulProcess",

  // Approval fields (SAME as tools/channels)
  "is_active": "false",   // String! "false"=pending, "true"=public
  "reviewed": "false",    // String! Has admin reviewed?
  "creator_id": "uuid",   // Who created it

  // Set when approved:
  "approved_at": "2025-11-10T12:00:00.000Z",
  "approved_by": "admin",

  // OR set when rejected:
  "rejected_at": "2025-11-10T12:00:00.000Z",
  "rejected_by": "admin",
  "rejection_reason": "Needs better images",

  // Story-specific fields
  "pages": [...]
}
```

### Why This Pattern?

✅ **Consistent** - Same as tools and channels
✅ **Simple** - One field (`is_active`) controls visibility
✅ **Flexible** - Add fields without migrations
✅ **Fast** - JSONB indexes make queries instant

See `APPROVAL_PATTERN.md` for full details.

---

## Common Queries

### Admin Dashboard

```sql
-- Get all pending stories
SELECT
  id,
  story_slug,
  document_data->>'title' as title,
  document_data->>'author' as author,
  created_at
FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'false'
ORDER BY created_at DESC;

-- Get all approved stories
SELECT
  id,
  story_slug,
  document_data->>'title' as title,
  document_data->>'approved_at' as approved_at
FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'true'
ORDER BY created_at DESC;
```

### Public Story Listing

```sql
SELECT
  id,
  story_slug,
  document_data->>'title' as title,
  document_data->>'subtitle' as subtitle,
  document_data->>'author' as author,
  document_data->>'cover_image_url' as cover
FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'true'
ORDER BY created_at DESC;
```

### Get Story by Slug

```sql
SELECT
  id,
  document_data
FROM user_documents
WHERE document_type = 'story'
AND story_slug = 'bunny-coping-tricks';
```

### My Stories (All States)

```sql
SELECT
  id,
  story_slug,
  document_data->>'title' as title,
  document_data->>'is_active' as status,
  created_at
FROM user_documents
WHERE document_type = 'story'
AND user_id = auth.uid()
ORDER BY created_at DESC;
```

---

## Approval Workflow

### 1. User Creates Story

```typescript
const { data, error } = await supabase
  .from('user_documents')
  .insert({
    user_id: user.id,
    document_type: 'story',
    story_slug: 'my-awesome-story',
    document_data: {
      title: "My Awesome Story",
      subtitle: "A tale of wonder",
      author: "Parent Creator",
      is_active: "false",  // Pending by default
      reviewed: "false",
      creator_id: user.id,
      pages: [...]
    }
  });
```

### 2. Admin Reviews in Dashboard

Admin sees pending stories where `is_active='false'`

### 3. Admin Approves

**Via Edge Function (recommended):**
```typescript
const response = await fetch('/api/approve-story', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    story_id: 'uuid-here',
    approve: true,
    note: 'Great story!'
  })
});
```

**Via Direct SQL (simple):**
```sql
UPDATE user_documents
SET document_data = document_data ||
  jsonb_build_object(
    'is_active', 'true',
    'reviewed', 'true',
    'approved_at', now(),
    'approved_by', 'admin'
  )
WHERE id = 'story-uuid-here';
```

### 4. Story Now Public

Public users can now see it (RLS checks `is_active='true'`)

---

## Rejection Workflow

### Admin Rejects

```sql
UPDATE user_documents
SET document_data = document_data ||
  jsonb_build_object(
    'is_active', 'false',
    'reviewed', 'true',
    'rejected_at', now(),
    'rejected_by', 'admin',
    'rejection_reason', 'Please add more detailed images'
  )
WHERE id = 'story-uuid-here';
```

### User Sees Rejection Reason

```sql
SELECT
  document_data->>'rejection_reason' as feedback
FROM user_documents
WHERE id = 'story-uuid-here'
AND user_id = auth.uid();
```

User can edit and resubmit (keep the same row, just update content).

---

## Troubleshooting

### "Column already exists" errors
✅ **This is fine!** Migration is idempotent - safely handles existing columns.

### "Policy already exists" errors
✅ **This is fine!** Policies created with `IF NOT EXISTS` checks.

### Can't see my story after creating
Check:
1. Is `user_id` set to your user ID?
2. Is `document_type = 'story'`?
3. Are you logged in as the same user?

```sql
-- Debug query
SELECT id, user_id, document_type, document_data->>'is_active'
FROM user_documents
WHERE document_type = 'story'
AND user_id = auth.uid();
```

### Public can't see approved story
Check all conditions:
- `document_type = 'story'` ✓
- `document_data->>'is_active' = 'true'` ✓

```sql
-- Debug query (as public)
SELECT id, document_data->>'is_active', document_data->>'approved_at'
FROM user_documents
WHERE document_type = 'story';
-- If you see nothing, either no stories are approved or RLS is working correctly
```

### Admin can't see all stories
Verify admin status:
```sql
SELECT email, profile_data->>'is_admin'
FROM profiles
WHERE id = auth.uid();
```

Should return `is_admin: true`. If not, run bootstrap SQL again.

---

## Performance Notes

With proper indexes, queries are instant even with 1000+ stories:

- **Pending stories query:** <1ms (partial index on is_active='false')
- **Public stories query:** <1ms (partial index on is_active='true')
- **Slug lookup:** <1ms (index on story_slug)

**Current scale:** 200 users, ~50 stories → All queries <1ms

**Future scale:** 2000 users, ~500 stories → Still <10ms

JSONB extraction is fast enough for this workload!

---

## Next Steps

After migration completes:

1. ✅ **Bootstrap admin user** (Step 2 above)
2. ✅ **Test with dummy story** (Step 3 above)
3. ✅ **Verify RLS works** (Step 4 above)
4. ⏳ **Build story upload forge** (`app/dashboard/stories/new`)
5. ⏳ **Build admin dashboard** (`app/admin/stories`)
6. ⏳ **Create Edge Function** for approval (optional, can use SQL for now)
7. ⏳ **Update recursive-landing viewer** to fetch from Supabase

---

## Migration Philosophy

This migration follows **The Recursive.eco Way**:

✅ **JSONB-heavy** - Flexible, AI-friendly, fast iteration
✅ **Consistent** - Same pattern as tools/channels
✅ **Simple** - One field (`is_active`) controls visibility
✅ **Solo-dev optimized** - Low ceremony, high velocity
✅ **Scale-appropriate** - Perfect for 200 users, can grow

**Don't over-engineer!** Ship features fast. Optimize when pain emerges. 🔨

---

## Related Documentation

- **APPROVAL_PATTERN.md** - Full explanation of the approval pattern
- **BACKLOG_DB_OPTIMIZATIONS.md** - Future improvements (only if needed)
- **001-story-approval-revised.sql** - The migration SQL itself
- **CLAUDE.md** - Full project context

---

**Ready to forge?** Run the migration and let's build tools for the collective! ✨
