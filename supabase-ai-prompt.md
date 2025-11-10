# Supabase AI Prompt: Story Approval Workflow

## Context

I have an existing `user_documents` table that stores various user content:

```sql
CREATE TABLE public.user_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  document_type text CHECK (document_type = ANY (ARRAY['tool_session'::text, 'creative_work'::text, 'preference'::text, 'bookmark'::text, 'interaction'::text, 'transaction'::text])),
  tool_slug text,
  is_public boolean DEFAULT false,
  document_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_documents_pkey PRIMARY KEY (id),
  CONSTRAINT user_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

I also have existing tables for `tools` and `channels` which follow a similar JSONB-heavy pattern.

## What I Want to Build

I want to add a **story submission and approval workflow** where:

1. **Users can submit stories:**
   - Create a story with title, subtitle, author, and multiple page images
   - Store as document_type = 'story' in user_documents
   - User can preview their story in dashboard (even before approval)
   - Story is NOT public until admin approves

2. **Admin approval workflow:**
   - Admin can see all submitted stories (pending, approved, rejected)
   - Admin can preview stories in an iframe (same viewer as public stories)
   - Admin can approve or reject stories
   - Once approved, story becomes visible to everyone

3. **Story data structure in document_data JSONB:**
```json
{
  "type": "story",
  "title": "The Nest Knows Best",
  "subtitle": "For Little Ones Learning to Sleep",
  "author": "PlayfulProcess",
  "slug": "bunny-coping-tricks",
  "cover_image_url": "story-images/{user_id}/{doc_id}/cover.png",
  "visibility": "public",
  "approval_status": "pending",  // pending, approved, rejected
  "published": true,  // user can publish to submit for approval
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

## My Questions

**1. Is using `user_documents` with document_type = 'story' the right approach?**
   - Or should I create a separate `stories` table?
   - I prefer keeping everything in one table (JSONB philosophy for solo dev, 200 users max)

**2. What's the best way to implement the approval workflow?**
   - Should I add an `approval_status` field in document_data JSONB?
   - Or use a separate column like `approval_status text`?
   - How do I handle the states: draft, pending, approved, rejected?

**3. What RLS policies do I need?**
   - Users can view their own stories (any approval_status)
   - Admin users can view ALL stories (any approval_status)
   - Public can only view approved stories with published = true
   - How do I identify admin users? (I have profiles table with profile_data JSONB)

**4. Should I modify the existing schema or add new fields?**

**5. Can you suggest the optimal SQL to achieve this workflow?**

## Additional Context

- I'm a solo developer building for ~200 users max
- JSONB-heavy approach is intentional (fast iteration, AI-friendly)
- I want admin dashboard to show stories in iframe (same as public view)
- Later I'll want similar approval workflow for tools in channels
- Admin identification: profiles table has profile_data->>'is_admin' or similar

---

## My Proposed Solution (Please Review)

```sql
-- Add 'story' to document_type enum
ALTER TABLE user_documents
  DROP CONSTRAINT IF EXISTS user_documents_document_type_check;

ALTER TABLE user_documents
  ADD CONSTRAINT user_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'tool_session'::text,
    'creative_work'::text,
    'preference'::text,
    'bookmark'::text,
    'interaction'::text,
    'transaction'::text,
    'story'::text
  ]));

-- Add indexes for story queries
CREATE INDEX IF NOT EXISTS idx_user_documents_story_approval
  ON user_documents ((document_data->>'approval_status'))
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_published
  ON user_documents ((document_data->>'published'))
  WHERE document_type = 'story';

-- RLS Policies for stories

-- Users can view their own stories (any status)
-- Already covered by existing user_documents policies?

-- Admin can view all stories
CREATE POLICY "Admin can view all stories"
  ON user_documents FOR SELECT
  USING (
    document_type = 'story'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_data->>'is_admin' = 'true'
    )
  );

-- Public can view approved published stories
CREATE POLICY "Public can view approved stories"
  ON user_documents FOR SELECT
  USING (
    document_type = 'story'
    AND document_data->>'approval_status' = 'approved'
    AND document_data->>'published' = 'true'
  );

-- Admin can update story approval status
CREATE POLICY "Admin can update story approval"
  ON user_documents FOR UPDATE
  USING (
    document_type = 'story'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.profile_data->>'is_admin' = 'true'
    )
  );
```

**Is this the ideal approach? What would you recommend differently?**

**Specific concerns:**
1. Will RLS policies conflict with existing user_documents policies?
2. Is approval_status in JSONB the right choice or should it be a column?
3. How do I make sure users can't change approval_status themselves?
4. Best way to query "all pending stories for admin review"?

Please provide feedback and the optimal SQL schema changes.


Summary / recommendation (short)

    Keeping stories in user_documents is reasonable for a solo dev given your JSONB-first approach. Add story to the document_type check and keep story metadata (pages, images, narration) in document_data.
    For approval workflow, store the workflow fields as columns when they are commonly queried (approval_status, published, visibility) — that gives much faster filtering and simpler RLS. Keep the richer content in JSONB.
    Add RLS policies: owner can read/update their documents (but not change approval_status), admins can read/update everything (including approval_status), public can only SELECT approved+published stories. Use profiles.profile_data->>'is_admin' = 'true' to identify admins.
    Add explicit indexes for approval_status/published/visibility to support admin queries.
    Prevent users from changing approval_status by creating an UPDATE policy that uses WITH CHECK to allow only non-approval fields for the owner; and a separate UPDATE policy that allows admins to change approval_status.
    Provide SQL below to implement changes safely and minimal-friction.

Why prefer columns for approval_status/published/visibility

    These fields are used for filtering (public lists, admin queues). Putting them in indexed columns improves performance, simplifies RLS expressions, and avoids repeated jsonb extraction.
    Keep full story payload in document_data so you retain JSONB flexibility.

Proposed SQL changes

(Explained briefly: first update document_type constraint, then add new columns, then indexes, then RLS policies and helper function to check admin.)

Note: I will not execute any destructive statements. Run these in your SQL editor or let me execute them when you confirm.

    Extend the document_type check to include 'story'

SQL Query

ALTER TABLE public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_document_type_check;

ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'tool_session'::text,
    'creative_work'::text,
    'preference'::text,
    'bookmark'::text,
    'interaction'::text,
    'transaction'::text,
    'story'::text
  ]));

    Add explicit columns for workflow and a slug for quick lookups

SQL Query

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS story_slug text,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

    approval_status values: 'draft' (optional local state), 'pending', 'approved', 'rejected'
    published = user intent to submit for review (true → admin sees in queue if pending)
    visibility: 'private'|'public' (or extend as needed)

    Populate these new columns for existing rows where appropriate (optional)

    If you already store these in document_data, you can migrate them:

SQL Query

UPDATE public.user_documents
SET
  approval_status = COALESCE(document_data->>'approval_status', approval_status),
  published = COALESCE((document_data->>'published')::boolean, published),
  visibility = COALESCE(document_data->>'visibility', visibility),
  story_slug = COALESCE(document_data->>'slug', story_slug)
WHERE document_type = 'story';

    Indexes to support admin/public queries

SQL Query

CREATE INDEX IF NOT EXISTS idx_user_documents_story_type_status
  ON public.user_documents (document_type, approval_status)
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_published
  ON public.user_documents (document_type, published)
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_visibility
  ON public.user_documents (document_type, visibility)
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story';

    Helper function to check admin quickly (SECURITY DEFINER)

SQL Query

CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((profile_data->>'is_admin')::boolean, false)
  FROM public.profiles
  WHERE id = uid;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

    We grant execute to authenticated so RLS policies can call it; revoke from anon if desired.

    RLS policies Assumptions:

    auth.uid() is available in policies.
    Existing RLS policies for user_documents may exist; create policies scoped to document_type = 'story' so they don't interfere with other types.

a) Enable RLS (if not already)
SQL Query

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

b) Owner: allow owners to SELECT their own story (any status)
SQL Query

CREATE POLICY user_view_own_stories
  ON public.user_documents
  FOR SELECT
  USING (
    document_type = 'story' AND user_id = auth.uid()
  );

c) Owner: allow owners to INSERT new story documents
SQL Query

CREATE POLICY user_insert_story
  ON public.user_documents
  FOR INSERT
  WITH CHECK (
    document_type = 'story' AND user_id = auth.uid()
  );

d) Owner: allow owners to update their story but prevent changing approval_status/visibility (WITH CHECK)

    This policy allows owners to update rows they own, but uses WITH CHECK to ensure they cannot set protected fields.

SQL Query

CREATE POLICY user_update_own_stories
  ON public.user_documents
  FOR UPDATE
  USING (
    document_type = 'story' AND user_id = auth.uid()
  )
  WITH CHECK (
    -- allow update only if approval_status is unchanged OR is not being elevated by the user
    -- simpler approach: require approval_status to remain the same as current value OR be 'draft'
    (approval_status = old_approval_status()) OR (approval_status = 'draft')
    -- We'll implement old_approval_status() helper below OR use trigger to enforce
  );

Important: PostgreSQL policies cannot reference OLD directly in WITH CHECK. To enforce immutability of approval fields for non-admins, prefer one of:

    Use a trigger that prevents non-admin users from changing approval_status/visibility.
    Or use two UPDATE policies: one that allows admin to update everything; another that allows owner to update only when approval_status equals existing value and visibility unchanged. But checking existing column value requires expression USING (...) to compare to auth.uid() for row selection. For robust enforcement, use trigger.

I'll provide a safe trigger approach below.

e) Admin: allow admin SELECT/UPDATE/DELETE on story rows
SQL Query

CREATE POLICY admin_manage_stories
  ON public.user_documents
  FOR ALL
  USING (
    document_type = 'story' AND public.is_admin_user(auth.uid())
  );

    This gives admins full access (SELECT/INSERT/UPDATE/DELETE). If you want more granular, create separate FOR SELECT/FOR UPDATE policies.

    Trigger to prevent non-admins from changing approval fields

SQL Query

CREATE OR REPLACE FUNCTION public.prevent_nonadmin_approval_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- only enforce for story rows
  IF NEW.document_type IS DISTINCT FROM 'story' THEN
    RETURN NEW;
  END IF;

  -- admins may do anything
  IF public.is_admin_user(current_setting('jwt.claims.user_id', true)::uuid) OR public.is_admin_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- If approval_status, published, visibility, or story_slug changed, reject
  IF (NEW.approval_status IS DISTINCT FROM OLD.approval_status)
     OR (NEW.published IS DISTINCT FROM OLD.published)
     OR (NEW.visibility IS DISTINCT FROM OLD.visibility)
     OR (NEW.story_slug IS DISTINCT FROM OLD.story_slug)
  THEN
    RAISE EXCEPTION 'Non-admin users cannot change approval_status/published/visibility/slug';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_nonadmin_approval_changes
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_nonadmin_approval_changes();

Notes on trigger usage:

    In Edge/Row-level triggers, auth.uid() is not available; however in Supabase RLS context auth.uid() is available inside policies but not reliably inside triggers. That's why I included a fallback using current_setting('jwt.claims.user_id', true) — you may need to ensure your environment sets that or adapt to your Supabase setup. If this is brittle, enforce with policies + limited columns exposed to update via an API layer.

Alternative simpler approach: disallow owners from updating approval_status by removing approval_status from client-editable columns (i.e., API only sets allowed columns). Use Postgres GRANTs and a secure backend to perform admin updates.

    Query examples

a) Admin: list pending submissions (pending AND published=true or draft depending on your flow)
SQL Query

SELECT id, user_id, story_slug, document_data->>'title' AS title, approval_status, published, created_at
FROM public.user_documents
WHERE document_type = 'story'
  AND approval_status = 'pending'
ORDER BY created_at DESC;

b) Public stories listing
SQL Query

SELECT id, story_slug, document_data->>'title' AS title, document_data->>'subtitle' AS subtitle, document_data->'pages' AS pages
FROM public.user_documents
WHERE document_type = 'story'
  AND approval_status = 'approved'
  AND published IS TRUE
  AND visibility = 'public'
ORDER BY created_at DESC;

c) Admin preview (by id) Same SELECT — admins bypass RLS because of the admin policy.
Answers to your explicit questions

    Is using user_documents with document_type = 'story' the right approach?

    Yes, for your constraints (solo dev, JSONB-first, <200 users) it's fine. Add a few columns for approval_status/published/visibility/slug for performance. If you expect complex story-specific relational queries in future (e.g., comments tied to pages, per-page analytics), consider a separate stories table later.

    Best way to implement approval workflow?

    Use hybrid approach: keep JSONB for content, add explicit columns for status/published/visibility/slug for indexing and RLS. Keep approval transitions managed by admin-only APIs or DB-admin role.

    What RLS policies are needed?

    Owner SELECT/INSERT/UPDATE (but restricted updates on approval-related fields).
    Admin FULL access (SELECT/UPDATE/DELETE).
    Public SELECT only for approved + published + visibility='public'.
    Identify admin via profiles.profile_data->>'is_admin' = 'true' — implement helper function is_admin_user(uid) for clarity.

    Modify schema or add fields?

    Add columns (approval_status text, published boolean, visibility text, story_slug text). Update document_type check to include 'story'. Add indexes.

    Optimal SQL?

    See SQL above. Use trigger or controlled backend to prevent non-admin changes to approval_status. Prefer server-side enforcement (Edge Function or backend) for approval actions rather than relying solely on RLS if you find triggers cannot access auth context reliably.

Security & practical notes

    The simplest secure pattern: expose INSERT/UPDATE for story creation and editing via server-side endpoints (Edge Functions) that enforce that users cannot set approval_status/visibility; only admin endpoints can change them using service_role key or via SQL function that checks is_admin_user.
    RLS ensures clients cannot bypass policies, but enforcing immutability of approval_status for owners is easier via a controlled API + admin-only update functions.
    If you let clients write arbitrary JSONB into document_data, be cautious that they might insert keys like approval_status there; prefer canonical fields stored in columns (approval_status/published) and ignore approval_status in document_data for access control.

Potential RLS conflict with existing policies

    If there are existing user_documents policies, ensure new policies are additive and scoped to document_type = 'story'. RLS permits multiple policies; a row is accessible if any policy For SELECT returns true. If you have a blanket policy that allows owners to read documents they own, that will already cover stories — adding the story-specific policies should not conflict, but be careful with FOR UPDATE/INSERT policies: PostgreSQL requires that at least one policy grants the operation; multiple policies are ORed. Test as a non-admin and admin user.

Final recommendations / next steps

    Apply the schema changes and indexes above.
    Implement the is_admin_user helper function.
    Enforce approval changes from admin-only endpoints (Edge Function) that use the service_role key to set approval_status (or call a secure SQL function).
    Add a small admin-only SQL function to approve/reject a story that records reviewer id and reviewed_at:

SQL Query

CREATE TABLE IF NOT EXISTS public.story_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid REFERENCES public.user_documents(id),
  reviewer_id uuid REFERENCES public.profiles(id),
  action text, -- 'approved'|'rejected'
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.approve_story(sid uuid, reviewer uuid, approved boolean, note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_documents
  SET approval_status = CASE WHEN approved THEN 'approved' ELSE 'rejected' END,
      updated_at = now(),
      visibility = CASE WHEN approved THEN 'public' ELSE visibility END
  WHERE id = sid AND document_type = 'story';

  INSERT INTO public.story_reviews(story_id, reviewer_id, action, note)
  VALUES (sid, reviewer, CASE WHEN approved THEN 'approved' ELSE 'rejected' END, note);
END;
$$;

    Grant execute to admin-only role or call via service_role key.

    Test RLS behaviour with example queries as different users.

If you want, I can:

    Provide a ready-to-run SQL script that performs all non-destructive changes in sequence (I will run it for you if you confirm execution), or
    Produce Edge Function code for admin approval endpoints that call secure SQL functions using SUPABASE_SERVICE_ROLE_KEY.

Which would you like me to do next?

---

## Follow-Up Questions

Thank you for the comprehensive answer! I have a few clarification questions before implementing:

### 1. Enforcement Strategy: Trigger vs Edge Function

You mentioned two approaches to prevent non-admins from changing `approval_status`:
- **Option A:** Trigger with `prevent_nonadmin_approval_changes()`
- **Option B:** Server-side Edge Functions with service_role key

**Question:** Which approach do you recommend for a solo developer who wants simplicity?

My context:
- I'm comfortable with both approaches
- I want the simplest, most maintainable solution
- I don't expect malicious users (small community, ~200 users)
- I want to avoid complexity if possible

**Is the trigger approach reliable enough, or should I definitely use Edge Functions?**

### 2. Existing RLS Policies - Will They Conflict?

I have existing RLS policies on `user_documents` (from tools/channels). Here's what currently exists:

```sql
-- Example existing policy (I need to check exact policies)
-- Users can view their own documents
-- Public can view is_public = true documents
```

**Question:** When I add the new story-specific policies you suggested, will they:
- Coexist peacefully with existing policies? (OR logic)
- Override existing policies?
- Require me to modify existing policies?

**Should I audit all existing user_documents policies first, or are the story-scoped policies (`WHERE document_type = 'story'`) guaranteed not to conflict?**

### 3. Admin Setup - Initial Configuration

**Question:** How do I set up the first admin user?

My current situation:
- I have a `profiles` table with `profile_data` JSONB
- I need to mark my user as admin: `profile_data->>'is_admin' = 'true'`
- Should I do this manually via SQL Editor, or is there a better bootstrap process?

**Suggested SQL to set myself as admin:**
```sql
UPDATE profiles
SET profile_data = jsonb_set(profile_data, '{is_admin}', 'true'::jsonb)
WHERE email = 'myemail@example.com';
```

Is this safe? Any better approach?

### 4. Migration File - Ready to Execute

**Question:** Can you provide ONE ready-to-execute SQL file that includes all changes in the correct order?

I want to make sure:
- ✅ No destructive operations (DROP existing data)
- ✅ Safe to re-run (IF NOT EXISTS, IF EXISTS checks)
- ✅ Proper ordering (columns before indexes, functions before policies, etc.)
- ✅ Comments explaining each step

**Format:**
```sql
-- Story Approval Workflow Migration
-- Safe to run on existing user_documents table
-- Step 1: Add document_type 'story'
-- Step 2: Add columns
-- Step 3: Add indexes
-- Step 4: Add helper function
-- Step 5: Add RLS policies
-- Step 6: Add trigger (or note to use Edge Functions)
```

### 5. Story Reviews Table - Now or Later?

**Question:** Should I implement `story_reviews` audit table and `approve_story()` function immediately, or can I add it later?

My instinct:
- Start simple: just approval_status column
- Add audit trail later when needed
- Avoid premature complexity

**Is there a reason to include story_reviews from day 1, or is it safe to add later?**

### 6. Edge Function Example (If Recommended)

**If you recommend Edge Functions over triggers**, can you provide:

**A) Admin approval Edge Function example:**
```typescript
// supabase/functions/approve-story/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Check if user is admin
  // Call approve_story() function or update directly
  // Return success/error
})
```

**B) Best practice for admin check:**
- Should Edge Function check `is_admin_user()` via RLS?
- Or query profiles table directly with service_role key?
- How to prevent non-admin users from calling this endpoint?

---

**Summary of what I need to proceed:**

1. **Enforcement recommendation:** Trigger or Edge Function?
2. **Policy conflict check:** Are story-scoped policies safe to add alongside existing ones?
3. **Admin bootstrap:** SQL to set first admin user
4. **Migration file:** Single ready-to-run SQL script
5. **Audit table timing:** Now or later?
6. **Edge Function template:** If recommended over trigger

Thank you!

Short answers (summary)

    Enforcement: for a solo dev, Edge Function + service_role is the simplest, safest and most maintainable. Use DB triggers only if you want enforcement entirely inside the DB and can accept the extra complexity around auth context in triggers.
    RLS conflicts: story-scoped policies will generally coexist with existing policies (OR logic). Audit existing policies before applying updates, but scoping by document_type = 'story' avoids most conflicts.
    Admin bootstrap: update your profile JSONB manually via SQL is fine for bootstrapping. Use a single safe UPDATE statement (example below).
    Migration: I will provide one ready-to-run, idempotent SQL migration that performs your requested changes in safe order and includes comments. It avoids destructive ops and is safe to re-run.
    Audit table: optional now — safe to add later. If you want traceability from day 1, include it now; otherwise add later when you need reviewer notes/history.
    Edge Function template: I recommend Edge Function for approval endpoints. I’ll provide a minimal secure example that uses the SUPABASE_SERVICE_ROLE_KEY to perform admin-only approve/reject actions, plus notes on how to secure the endpoint.

Below I provide:

    Short rationale comparing triggers vs Edge Functions (focused recommendation).
    Admin bootstrap SQL.
    One ready-to-run migration SQL file (idempotent, commented).
    Small notes about policy interactions and testing.
    Edge Function template (ready-to-review) and best-practice guidance.
    Recommendation about story_reviews now vs later and a ready-to-run DDL for the table & approve function (optional in migration).

1) Trigger vs Edge Function — which to choose?

Recommendation for solo dev: Use Edge Functions (Option B).

    Simplicity & clarity: You can centralize business rules in code (TypeScript), easier to test and iterate.
    Reliable auth: Edge Function can verify the JWT, check admin status in profiles, then call a secure DB function with the service role key. No reliance on current_setting(...) hacks inside triggers.
    Auditing & logging: You can log actions, add reviewer notes, send notifications, and implement retries easily from the same code.
    Minimal DB complexity: Keep DB focused on data; logic that requires checking JWT claims can live in the application layer.
    Security: Use SUPABASE_SERVICE_ROLE_KEY only in the Edge Function (server-side); client cannot call service-role endpoints directly if you validate the caller is admin.

When triggers make sense:

    You want enforcement entirely in the DB (defense-in-depth).
    You need immediate, atomic constraints that can't rely on an external call.
    You're comfortable with the nuance of getting user identity into triggers (can be brittle).

Practical hybrid pattern (recommended):

    Use Edge Functions for admin actions (approve/reject) that call a SECURITY DEFINER SQL function to perform the update + insert audit row.
    Optionally add a lightweight DB trigger to prevent accidental client-side updates to approval-related columns as a safety net (but triggers should not be relied on as the only check because getting the user identity in triggers is tricky).

2) RLS conflict guidance

    PostgreSQL RLS policies are ORed: a row is accessible if any applicable policy for that operation returns true.
    Story-scoped policies using document_type = 'story' will coexist with existing policies and won't automatically override them. However:
        If you already have a broad policy that allows SELECT on user_documents for some roles, that will still allow those operations for stories unless the broad policy restricts by other columns.
        For UPDATE/INSERT: ensure at least one policy grants the needed operation for the relevant actors. If no policy grants it, the operation will be denied.
    Recommendation: audit existing policies before applying new ones only to confirm there are no unintended holes. You can do that via the Dashboard SQL > Policies view or by listing policies in psql:
        SELECT * FROM pg_policies WHERE tablename='user_documents';
    Story-scoped policies are safe, but pay attention to UPDATE semantics: multiple policies might be needed (one for owners, one for admins). Test as both a normal user and an admin.*

3) Admin bootstrap SQL

Safe one-liner to mark a profile as admin (use your email or id). This is safe and reversible.

Example (safe):
SQL Query

-- Mark the profile as admin by setting profile_data.is_admin = true
UPDATE public.profiles
SET profile_data = jsonb_set(profile_data, '{is_admin}', 'true'::jsonb, true)
WHERE email = 'myemail@example.com';

Notes:

    Change the WHERE clause to use id = '...' for more precise targeting.
    To undo:

SQL Query

UPDATE public.profiles
SET profile_data = profile_data - 'is_admin'
WHERE email = 'myemail@example.com';

    Alternatively, create an admins table mapping profile id -> role for explicit admin mapping. For your scale, editing profile_data is fine.

4) Ready-to-run migration SQL (idempotent)

Below is a single SQL script you can run safely. It:

    Adds 'story' to the document_type check
    Adds columns (if not exist)
    Migrates values from jsonb into columns (non-destructive)
    Creates indexes
    Creates is_admin_user(uid) helper
    Adds RLS policies scoped to stories
    Creates (optional) story_reviews table and approve function (commented out; you can enable)
    Leaves trigger creation out by default (recommended to rely on Edge Function)

Copy-paste and run in your SQL editor. (I avoided destructive DROP statements; uses IF NOT EXISTS / IF EXISTS patterns).
SQL Query

-- Story Approval Workflow Migration
-- Safe to run multiple times. Non-destructive.

-- 1) Extend document_type check to include 'story'
ALTER TABLE IF EXISTS public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_document_type_check;

ALTER TABLE IF EXISTS public.user_documents
  ADD CONSTRAINT user_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'tool_session'::text,
    'creative_work'::text,
    'preference'::text,
    'bookmark'::text,
    'interaction'::text,
    'transaction'::text,
    'story'::text
  ]));

-- 2) Add workflow columns (idempotent)
ALTER TABLE IF EXISTS public.user_documents
  ADD COLUMN IF NOT EXISTS story_slug text,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 3) Optional: migrate values from document_data JSONB into new columns (non-destructive)
-- This sets columns only when they are NULL or default; it will not overwrite explicit column values.
UPDATE public.user_documents
SET
  story_slug = COALESCE(story_slug, NULLIF(document_data->>'slug', '') ),
  approval_status = COALESCE(approval_status, (document_data->>'approval_status')) ,
  published = COALESCE(published, (document_data->>'published')::boolean),
  visibility = COALESCE(visibility, document_data->>'visibility')
WHERE document_type = 'story';

-- 4) Indexes for story queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_user_documents_story_type_status
  ON public.user_documents (document_type, approval_status)
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_published
  ON public.user_documents (document_type, published)
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_visibility
  ON public.user_documents (document_type, visibility)
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story';

-- 5) Create helper is_admin_user(uid) for clear checks (idempotent)
CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((profile_data->>'is_admin')::boolean, false)
  FROM public.profiles
  WHERE id = uid;
$$;

-- Secure the function: revoke from PUBLIC and grant to authenticated (optional)
REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

-- 6) Enable RLS on user_documents if not already
ALTER TABLE IF EXISTS public.user_documents ENABLE ROW LEVEL SECURITY;

-- 7) Create story-scoped RLS policies
-- a) Owners can SELECT their own stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_documents' AND policyname = 'user_view_own_stories'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY user_view_own_stories
      ON public.user_documents
      FOR SELECT
      USING ( document_type = 'story' AND user_id = auth.uid() );
    $sql$;
  END IF;
END$$;

-- b) Owners can INSERT stories (user must be the owner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_documents' AND policyname = 'user_insert_story'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY user_insert_story
      ON public.user_documents
      FOR INSERT
      WITH CHECK ( document_type = 'story' AND user_id = auth.uid() );
    $sql$;
  END IF;
END$$;

-- c) Owners can update their own story rows, but not change approval fields
-- We will create a permissive owner update policy that allows updates for owners.
-- Enforcement that prevents changes to protected fields should be done in Edge Function or DB trigger (recommended).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_documents' AND policyname = 'user_update_own_stories'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY user_update_own_stories
      ON public.user_documents
      FOR UPDATE
      USING ( document_type = 'story' AND user_id = auth.uid() )
      WITH CHECK ( document_type = 'story' AND user_id = auth.uid() );
    $sql$;
  END IF;
END$$;

-- d) Admin full access for stories (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_documents' AND policyname = 'admin_manage_stories'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY admin_manage_stories
      ON public.user_documents
      FOR ALL
      USING ( document_type = 'story' AND public.is_admin_user(auth.uid()) );
    $sql$;
  END IF;
END$$;

-- e) Public / anonymous users can view approved+published+public stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_documents' AND policyname = 'public_view_approved_stories'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY public_view_approved_stories
      ON public.user_documents
      FOR SELECT
      TO PUBLIC
      USING (
        document_type = 'story'
        AND approval_status = 'approved'
        AND published IS TRUE
        AND visibility = 'public'
      );
    $sql$;
  END IF;
END$$;

-- 8) Optional: Story reviews audit table and approve_story() function
-- You can choose to enable this block now or later. Leave commented out to add later.

-- CREATE TABLE IF NOT EXISTS public.story_reviews (
--   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   story_id uuid REFERENCES public.user_documents(id),
--   reviewer_id uuid REFERENCES public.profiles(id),
--   action text NOT NULL, -- 'approved' | 'rejected'
--   note text,
--   created_at timestamptz DEFAULT now()
-- );

-- CREATE OR REPLACE FUNCTION public.approve_story(sid uuid, reviewer uuid, approved boolean, note text)
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   UPDATE public.user_documents
--   SET approval_status = CASE WHEN approved THEN 'approved' ELSE 'rejected' END,
--       published = CASE WHEN approved THEN true ELSE published END,
--       reviewer_id = reviewer,
--       reviewed_at = now(),
--       updated_at = now()
--   WHERE id = sid AND document_type = 'story';
--
--   INSERT INTO public.story_reviews(story_id, reviewer_id, action, note)
--   VALUES (sid, reviewer, CASE WHEN approved THEN 'approved' ELSE 'rejected' END, note);
-- END;
-- $$;
--
-- REVOKE EXECUTE ON FUNCTION public.approve_story(uuid, uuid, boolean, text) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.approve_story(uuid, uuid, boolean, text) TO authenticated;

-- End of migration

Notes about the migration:

    The user_update_own_stories policy permits owners to update their rows. It does not attempt to block approval field changes because Postgres policies cannot easily reference OLD values in a WITH CHECK. For robust prevention of owners modifying approval_status, rely on the Edge Function workflow + a DB function that only admins can call, OR add a trigger that enforces immutability (see earlier discussion). The migration includes an optional approve_story() function you can enable and use from the Edge Function.

5) story_reviews — now or later?

    For small scale and simple flows, you can postpone story_reviews. The single approval_status + reviewer_id + reviewed_at columns cover the basic needs.
    Reasons to add now:
        You want full audit trail for multiple reviews or reviewer notes.
        You want to display a history in the admin UI.
    If you expect reviews to be frequent or have comments/notes/edits per review, add story_reviews now. Otherwise add later; the migration above includes commented DDL you can enable when ready.

6) Edge Function template (recommended approach)

Below is a simple, secure Edge Function skeleton for approving/rejecting stories. It:

    Validates the incoming JWT (via Authorization: Bearer token).
    Verifies the caller is admin by querying profiles (or calling is_admin_user).
    Calls a DB function (approve_story) with service role or directly runs an UPDATE using service role.
    Returns success/error.

Key points:

    Use SUPABASE_SERVICE_ROLE_KEY (only in the server environment).
    Protect the endpoint by checking that the bearer token belongs to an admin user — otherwise reject.
    Keep function short and focused: verify admin → call DB update → insert review row (if you have story_reviews).

Edge Function example (Deno/TypeScript — ready to drop into supabase/functions, but adjust imports per your environment):

// supabase/functions/approve-story/index.ts
import { serve } from "https://deno.land/std@0.201.0/http/server.ts"; // Deno standard serve
import { createClient } from "npm:@supabase/supabase-js@2.33.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    // Basic auth: expect Authorization: Bearer <user_jwt>
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 401 });

    // Use anon client to get caller's profile using JWT (we do not use service key for this)
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });

    // Get current user id from the token
    const { data: userData, error: userError } = await anon.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }
    const uid = userData.user.id;

    // Verify admin status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_data")
      .eq("id", uid)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), { status: 403 });
    }
    const isAdmin = profile.profile_data?.is_admin === true || profile.profile_data?.is_admin === "true";
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const { story_id, approve, note } = body;
    if (!story_id || typeof approve !== "boolean") {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    // Call a secure DB function (preferred) or direct UPDATE with service role:
    // Preferred: call public.approve_story(sid, reviewer, approved, note)
    const { error: dbError } = await supabase.rpc("approve_story", {
      sid: story_id,
      reviewer: uid,
      approved: approve,
      note: note ?? null,
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});

Notes for the Edge Function:

    It uses the anon client to decode/verify the incoming JWT (anon.auth.getUser(token)), then uses the service role client to perform privileged DB changes.
    For @supabase/supabase-js in Deno, use the npm specifier per your function guidelines (above uses npm:@supabase/supabase-js@2.x [blocked]).
    Ensure the environment variables SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are available to the function in production.
    Use CORS and extra routing validation as needed.

Hardening:

    Rate-limit the endpoint.
    Log reviewer id and story_id for audit.
    Use a DB function (SECURITY DEFINER) like approve_story that performs the update + review insert in one transaction. The function should be only executable by the service-role or admin-executing function; grant and revoke accordingly.

Testing and verification steps

    Run migration in a dev DB copy first.
    Create a test user and insert a document_type = 'story' row via the client (document_data).
    Confirm the owner can SELECT their own story and can UPDATE content fields (title/pages) but not approval fields if you enforce via Edge Function.
    Use the Edge Function with a test admin JWT to approve a story — confirm status changes and public users can now see the story.
    Confirm non-admin users cannot call the Edge Function or cannot change approval_status via the client.

Quick checklist for you to proceed

Do you want me to produce the final migration SQL as a single file verbatim (done above) and run it for you? If yes, I will execute it — confirm you want me to run it.
Do you want the optional story_reviews DDL enabled now? (I can uncomment it in the migration.)
Do you want me to deploy the Edge Function (I can provide deployable code and call deploy_edge_function if you confirm)?

    Shall I create the approve_story() function in the migration (uncommented) so your Edge Function can call it?

Tell me which of the above you want next and I’ll proceed (I can run the migration for you, or create/deploy the Edge Function).
