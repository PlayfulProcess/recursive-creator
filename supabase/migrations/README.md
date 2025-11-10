# Story Approval Migration Guide

## Quick Start

### Step 1: Run the Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `001-story-approval.sql`
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)

✅ **Safe to run multiple times** - All operations are idempotent

### Step 2: Bootstrap Your Admin User

After the migration completes, set yourself as admin:

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

Create a test story as a regular (non-admin) user:

```sql
INSERT INTO user_documents (user_id, document_type, document_data, approval_status, published, visibility)
VALUES (
  auth.uid(),
  'story',
  '{
    "title": "Test Story",
    "subtitle": "Testing the forge",
    "author": "Test User",
    "pages": [
      {
        "page_number": 1,
        "image_url": "test.png",
        "alt_text": "Test page",
        "narration": "Once upon a time..."
      }
    ]
  }'::jsonb,
  'pending',
  true,
  'private'
);
```

**Verify RLS policies work:**

✅ You (owner) can see your story
✅ Admin can see all stories
✅ Public cannot see pending stories
✅ Public CAN see approved + published + public stories

### Step 4: Approve the Story (as Admin)

Update approval status manually (later this will be done via Edge Function):

```sql
UPDATE user_documents
SET
  approval_status = 'approved',
  visibility = 'public',
  reviewer_id = auth.uid(),
  reviewed_at = now()
WHERE document_type = 'story'
  AND id = 'story-id-here';  -- Replace with actual story ID
```

**Verify it's now public:**

```sql
-- Log out (or test in anonymous SQL window)
-- This should now return the story:
SELECT * FROM user_documents
WHERE document_type = 'story'
  AND approval_status = 'approved'
  AND published IS TRUE
  AND visibility = 'public';
```

---

## What This Migration Does

### 1. Adds 'story' Document Type
Extends `user_documents` table to support stories (no new table needed!)

### 2. Adds Workflow Columns
- `story_slug` - URL-friendly identifier
- `approval_status` - 'pending' | 'approved' | 'rejected'
- `published` - Boolean flag (user controls)
- `visibility` - 'private' | 'public' (user controls)
- `reviewer_id` - Admin who approved/rejected
- `reviewed_at` - Timestamp of review

### 3. Creates Indexes
Fast queries for:
- Pending stories (admin dashboard)
- Published stories (public listing)
- Story visibility
- Story slug lookups

### 4. Creates Admin Helper Function
`is_admin_user(uid)` - Checks if user is admin by reading `profile_data->>'is_admin'`

### 5. Adds RLS Policies

**Owners can:**
- ✅ SELECT their own stories (even if pending)
- ✅ INSERT stories (set approval_status='pending')
- ✅ UPDATE their own stories (content, not approval fields)

**Admins can:**
- ✅ SELECT, INSERT, UPDATE, DELETE any story

**Public can:**
- ✅ SELECT approved + published + public stories only

**Edge Function will:**
- ✅ Change approval_status (admin-only action)
- ✅ Set reviewer_id and reviewed_at

---

## Optional: Story Reviews Audit Table

The migration includes **commented out** code for a full audit trail system.

**Enable this when you need:**
- History of multiple reviews per story
- Reviewer notes/feedback
- "Request changes" workflow

**To enable:**
1. Uncomment lines 170-202 in `001-story-approval.sql`
2. Re-run the migration
3. Update Edge Function to call `approve_story()` function

---

## Next Steps

After migration completes:

1. ✅ **Bootstrap admin user** (Step 2 above)
2. ✅ **Test RLS policies** (Step 3 above)
3. ⏳ **Create Edge Function** for approval actions (`supabase/functions/approve-story/`)
4. ⏳ **Build story upload forge** (`app/dashboard/stories/new/`)
5. ⏳ **Build admin dashboard** (`app/admin/stories/`)

---

## Troubleshooting

### "Column already exists" errors
✅ **This is fine!** The migration is idempotent - it safely handles existing columns.

### "Policy already exists" errors
✅ **This is fine!** Policies are created with `IF NOT EXISTS` checks.

### "Permission denied" on is_admin_user()
Make sure you're authenticated when calling the function:
```sql
SELECT is_admin_user(auth.uid());  -- ✅ Works
SELECT is_admin_user('some-uuid'); -- ❌ Might fail
```

### Can't see stories after approval
Check all three conditions:
- `approval_status = 'approved'`
- `published = true`
- `visibility = 'public'`

All three must be true for public visibility.

---

## Migration Philosophy

This migration follows the **Vulcan Principle**: Simple tools for mortals to wield.

**Why we use columns for approval workflow:**
- ✅ Fast queries (admin dashboard shows pending stories instantly)
- ✅ Simple RLS policies (no JSONB extraction in policies)
- ✅ Indexed fields (O(log n) lookups, not O(n) scans)

**Why we keep content in JSONB:**
- ✅ Flexible schema (add fields without migrations)
- ✅ Perfect for 200 user scale
- ✅ AI-friendly (LLMs work with JSON natively)
- ✅ Fast iteration (no ALTER TABLE ceremonies)

**Hybrid approach:** Best of both worlds. 🔨

---

## Related Documentation

- **RECOMMENDATION.md** - Why this approach is ideal
- **BACKLOG_DB_OPTIMIZATIONS.md** - Future improvements (only if needed)
- **supabase-ai-prompt.md** - Full Supabase AI consultation

---

**Ready to forge?** Run the migration and let's build tools for the collective! ✨
