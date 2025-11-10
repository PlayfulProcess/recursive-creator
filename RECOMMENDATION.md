# Story Approval Workflow - Implementation Recommendation

## Summary: Proceed with Supabase AI's Approach ✅

After reviewing Supabase AI's comprehensive response, **I recommend implementing their solution exactly as provided**.

---

## Why This Approach is Ideal

### 1. Edge Function Enforcement (Recommended by Supabase AI)
✅ **Use Edge Functions for approval actions** (not triggers)

**Reasons:**
- Simpler for solo dev (TypeScript vs complex PL/pgSQL)
- Reliable auth (JWT verification built-in)
- Easy to add logging, notifications, audit trails
- Service role key keeps admin logic secure
- No auth context issues in DB triggers

**Trade-off accepted:**
- Client could technically bypass if they manipulate requests
- **BUT:** For 200 trusted users, Edge Function is plenty secure
- **Bonus:** Can add rate limiting, logging, notifications easily

### 2. Hybrid Column + JSONB Approach (Smart!)
✅ **Frequently queried fields as columns** (`approval_status`, `published`, `visibility`, `story_slug`)
✅ **Rich content in JSONB** (`document_data` with pages array, narration, etc.)

**Why this rocks:**
- Fast queries for admin dashboard ("show pending stories")
- Simple RLS policies (no repeated JSONB extraction)
- Flexible content structure (JSONB for story pages)
- Consistent with your JSONB philosophy (not fully relational)

### 3. Story Reviews Table - Add Later ✅
Skip `story_reviews` audit table for now.

**Start simple:**
- `approval_status`, `reviewer_id`, `reviewed_at` columns are enough
- Can add full audit trail when you need reviewer notes

**Add later when:**
- You want history of multiple reviews
- You need reviewer comments/notes
- You want to track review iterations

---

## Implementation Plan (Step by Step)

### Step 1: Run the Migration ✅
Use the **ready-to-run SQL** provided by Supabase AI (lines 708-908 in the markdown).

**What it does:**
1. Adds `'story'` to `document_type` check
2. Adds columns: `story_slug`, `approval_status`, `published`, `visibility`, `reviewer_id`, `reviewed_at`
3. Creates indexes for fast queries
4. Creates `is_admin_user(uid)` helper function
5. Adds RLS policies (owner, admin, public)
6. Leaves `story_reviews` commented out (add later)

**Safety:**
- ✅ Idempotent (safe to re-run)
- ✅ No destructive operations
- ✅ Uses `IF NOT EXISTS` / `IF EXISTS`
- ✅ Non-destructive column migration

### Step 2: Bootstrap Admin User ✅
Run this to set yourself as admin:

```sql
UPDATE public.profiles
SET profile_data = jsonb_set(profile_data, '{is_admin}', 'true'::jsonb, true)
WHERE email = 'your-email@example.com';
```

**Verify:**
```sql
SELECT email, profile_data->>'is_admin' as is_admin
FROM profiles
WHERE email = 'your-email@example.com';
```

### Step 3: Test RLS Policies ✅
Create a test story as a regular user:

```sql
INSERT INTO user_documents (user_id, document_type, document_data, approval_status, published, visibility)
VALUES (
  auth.uid(),
  'story',
  '{"title": "Test Story", "pages": []}'::jsonb,
  'pending',
  true,
  'private'
);
```

**Verify permissions:**
- ✅ You (owner) can see your story
- ✅ Admin can see all stories
- ✅ Public cannot see pending stories
- ✅ Public CAN see approved + published stories

### Step 4: Create Edge Function for Approval ✅
Use Supabase AI's template (lines 939-1007).

**Function does:**
1. Validates JWT token (verifies caller)
2. Checks if caller is admin (`is_admin_user()`)
3. Calls `approve_story()` DB function with service role
4. Returns success/error

**Create the function:**
```sql
-- Enable approve_story() function from migration
-- (Uncomment lines 886-906 in the migration SQL)
```

**Deploy Edge Function:**
```bash
cd recursive-creator
# Create supabase/functions/approve-story/index.ts with provided code
supabase functions deploy approve-story
```

### Step 5: Build Admin UI ✅
Admin dashboard to:
- List pending stories
- Preview stories in iframe (same viewer as public)
- Approve/Reject buttons that call Edge Function

### Step 6: Build Story Upload Forge ✅
User-facing tool:
- Simple form (title, subtitle, author)
- Drag & drop images
- Save to `user_documents` with `document_type = 'story'`
- Set `published = true` to submit for approval
- User can preview in iframe (even while pending)

---

## Why This is Better Than Separate Tables

**Original idea:** 3 tables (`stories`, `story_pages`, `story_images`)

**Current approach:** 1 table (`user_documents`)

**Benefits:**
- ✅ Atomic updates (one row = entire story)
- ✅ Consistent with existing patterns (tools, channels)
- ✅ Simpler queries (no joins)
- ✅ Existing RLS policies work
- ✅ Pages array in JSONB = instant loading
- ✅ Perfect for 200 users scale

**Trade-off accepted:**
- ❌ Can't easily query "stories with more than 10 pages"
- ❌ Can't add comments to individual pages (without more JSONB)
- **BUT:** You don't need these features now. Add later if needed.

---

## Next Steps (Immediate)

1. **Copy migration SQL** from markdown (lines 708-908)
2. **Run in Supabase SQL Editor**
3. **Set yourself as admin** (bootstrap SQL above)
4. **Test with a dummy story**
5. **Proceed to build upload forge**

---

## Edge Function vs Trigger Decision

**Supabase AI recommends:** Edge Function ✅

**I agree because:**
- You're comfortable with TypeScript
- Easier to debug and test
- Can add features (notifications, logging) easily
- Service role key is secure enough for your scale
- Trigger auth context is brittle

**Trigger only if:**
- You want DB-only enforcement (defense in depth)
- You never want approval changes from client (even with hijacked JWT)
- You're comfortable with PL/pgSQL and auth.uid() quirks

**For Vulcan (toolmaker for mortals):** Edge Function is the forge you want.

---

## Files to Create

1. **Migration SQL** → `recursive-creator/migrations/001-story-approval.sql`
2. **Edge Function** → `supabase/functions/approve-story/index.ts`
3. **Admin UI** → `recursive-creator/app/admin/stories/page.tsx`
4. **Upload Forge** → `recursive-creator/app/dashboard/stories/new/page.tsx`

---

## Recommendation: Proceed Now ✅

**Ready to implement?**

Say the word and I'll:
1. Create the migration SQL file (copy from Supabase AI)
2. Create the Edge Function template
3. Build the story upload forge
4. Build the admin approval UI

**Or** if you want to run the migration yourself first, I can wait for confirmation before building the UI.

What do you prefer?
