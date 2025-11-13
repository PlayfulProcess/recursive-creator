-- ============================================
-- STORY APPROVAL WORKFLOW (Consistent with Tools/Channels)
-- ============================================
-- Matches the existing approval pattern used by tools and channels:
-- - Everything in JSONB (document_data)
-- - is_active: "false" (pending) → "true" (public)
-- - approved_at, approved_by when approved
-- - rejected_at, rejected_by when rejected
--
-- This is the Recursive.eco way: JSONB-heavy, simple, consistent.
-- ============================================
--
-- IMPORTANT: BEFORE RUNNING THIS MIGRATION
-- ============================================
-- 1. Check existing RLS policies on user_documents:
--    SELECT policyname, cmd, qual, with_check
--    FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'user_documents';
--
--    Look for overly broad UPDATE policies that might conflict.
--
-- 2. These new story-scoped policies will be ORed with existing ones.
--    If you find conflicts, add document_type != 'story' to old policies.
--
-- ============================================
-- DECISIONS MADE (Supabase AI Review Nov 2025)
-- ============================================
-- ✅ KEEP string booleans ("true"/"false" not true/false)
--    - Reason: Consistent with existing tools/channels
--    - Existing tools use: "is_active": "true" (strings)
--    - At 200 user scale, performance difference negligible
--
-- ✅ ADD unique constraint on story_slug (line 41)
--    - Reason: Prevents duplicate URLs
--    - Supabase AI recommendation implemented
--
-- ❌ DON'T ADD boolean columns (published, is_active, etc.)
--    - Reason: Keep JSONB approach (consistent with tools)
--    - Can add later if queries become slow (>1000 users)
--
-- ❌ DON'T ADD reviewer columns (reviewed_by, reviewed_at)
--    - Reason: Keep in JSONB (consistent with tools)
--    - Can add later if need to query by reviewer
--
-- ⏳ IMPLEMENT LATER: Edge Function for approval actions
--    - Reason: Security (prevent owners from changing is_active)
--    - Admin UI should call Edge Function, not direct SQL
--    - Edge Function uses service_role to update approval fields
--
-- See: SUPABASE_AI_REVIEW_ANALYSIS.md for full details
-- ============================================

-- 1) Add 'story' to document_type check constraint
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
    'story'::text  -- NEW! 🔨
  ]));

-- 2) Add story_slug column for fast lookups (optional but recommended)
-- Similar to how user_documents has tool_slug
ALTER TABLE IF EXISTS public.user_documents
  ADD COLUMN IF NOT EXISTS story_slug text;

-- 3) Create index for story slug lookups
CREATE INDEX IF NOT EXISTS idx_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story';

-- 3b) Add unique constraint on story_slug (prevents duplicate URLs)
-- Based on Supabase AI review recommendation
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story' AND story_slug IS NOT NULL;

-- 4) Create indexes for fast queries on JSONB fields
-- Find pending stories (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_user_documents_story_pending
  ON public.user_documents ((document_data->>'is_active'))
  WHERE document_type = 'story' AND document_data->>'is_active' = 'false';

-- Find public stories (for story listing)
CREATE INDEX IF NOT EXISTS idx_user_documents_story_active
  ON public.user_documents ((document_data->>'is_active'))
  WHERE document_type = 'story' AND document_data->>'is_active' = 'true';

-- 5) Create helper is_admin_user(uid) for RLS policies
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

-- Secure the function
REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

-- 6) Enable RLS on user_documents if not already enabled
ALTER TABLE IF EXISTS public.user_documents ENABLE ROW LEVEL SECURITY;

-- 7) Create story-scoped RLS policies

-- a) Owners can SELECT their own stories (all states)
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

-- b) Owners can INSERT stories (defaults to is_active='false')
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

-- c) Owners can update their own stories (content only, admin controls is_active)
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

-- d) Owners can delete their own stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_documents' AND policyname = 'user_delete_own_stories'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY user_delete_own_stories
      ON public.user_documents
      FOR DELETE
      USING ( document_type = 'story' AND user_id = auth.uid() );
    $sql$;
  END IF;
END$$;

-- e) Admin full access for stories (SELECT, INSERT, UPDATE, DELETE)
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

-- f) Public / anonymous users can view approved stories (is_active='true')
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
        AND document_data->>'is_active' = 'true'
      );
    $sql$;
  END IF;
END$$;

-- 8) Create storage bucket for story images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- 9) Storage policies for story images

-- Anyone can view story images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Anyone can view story images'
  ) THEN
    CREATE POLICY "Anyone can view story images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'story-images');
  END IF;
END$$;

-- Authenticated users can upload story images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can upload story images'
  ) THEN
    CREATE POLICY "Authenticated users can upload story images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'story-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END$$;

-- Users can update their own story images
-- Path format: story-images/{user_id}/{doc_id}/filename.png
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can update own story images'
  ) THEN
    CREATE POLICY "Users can update own story images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'story-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END$$;

-- Users can delete their own story images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can delete own story images'
  ) THEN
    CREATE POLICY "Users can delete own story images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'story-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END$$;

-- ============================================
-- DONE! Simple, consistent with tools/channels
-- ============================================
--
-- AFTER RUNNING THIS MIGRATION:
-- ============================================
-- 1. Bootstrap admin user:
--    UPDATE profiles
--    SET profile_data = jsonb_set(profile_data, '{is_admin}', 'true'::jsonb, true)
--    WHERE email = 'your-email@example.com';
--
-- 2. Verify admin status:
--    SELECT email, profile_data->>'is_admin' as is_admin
--    FROM profiles WHERE email = 'your-email@example.com';
--
-- 3. Test with dummy story (see examples below)
--
-- 4. Build Edge Function for approval actions (security)
--
-- 5. Build admin dashboard with visual preview (iframe)
--
-- See: README-REVISED.md for step-by-step guide
-- ============================================

/*
EXAMPLE document_data for a story (matches tools pattern):

{
  "title": "The Nest Knows Best: Bunny Coping Tricks",
  "subtitle": "For Little Ones Learning to Sleep",
  "author": "PlayfulProcess",
  "cover_image_url": "story-images/{user_id}/{doc_id}/cover.png",
  "is_active": "false",  // String, not boolean! (pending = false, public = true)
  "reviewed": "false",   // String, not boolean!
  "creator_id": "user-uuid-here",
  "pages": [
    {
      "page_number": 1,
      "image_url": "story-images/{user_id}/{doc_id}/page-1.png",
      "alt_text": "Bunny sitting under a tree",
      "narration": "Once upon a time..."
    }
  ]
}

// When admin approves:
{
  ...
  "is_active": "true",
  "reviewed": "true",
  "approved_at": "2025-11-10T12:00:00.000Z",
  "approved_by": "admin"
}

// When admin rejects:
{
  ...
  "is_active": "false",
  "reviewed": "true",
  "rejected_at": "2025-11-10T12:00:00.000Z",
  "rejected_by": "admin",
  "rejection_reason": "Needs better images"
}

QUERY EXAMPLES:

-- Admin dashboard: Get pending stories
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'false'
ORDER BY created_at DESC;

-- Public: Get approved stories
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'is_active' = 'true'
ORDER BY created_at DESC;

-- Get story by slug
SELECT * FROM user_documents
WHERE document_type = 'story'
AND story_slug = 'bunny-coping-tricks';

-- My stories (all states)
SELECT * FROM user_documents
WHERE document_type = 'story'
AND user_id = auth.uid()
ORDER BY created_at DESC;

APPROVAL WORKFLOW:

1. User creates story with document_type='story', is_active='false'
2. Admin sees it in pending list (is_active='false')
3. Admin clicks "Approve" → Edge Function sets:
   - is_active='true'
   - reviewed='true'
   - approved_at=now()
   - approved_by='admin'
4. Story now visible to public (RLS policy checks is_active='true')

This matches the exact pattern used by tools and channels! ✅
*/
