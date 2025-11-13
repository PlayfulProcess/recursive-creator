-- ============================================
-- Story Approval Workflow Migration
-- ============================================
-- Safe to run multiple times. Non-destructive.
-- Based on Supabase AI recommendations for:
-- - Approval workflow (pending → approved/rejected)
-- - Admin-only approval actions via Edge Functions
-- - Hybrid columns + JSONB approach
--
-- Run this in Supabase SQL Editor
-- ============================================

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

-- ============================================
-- End of migration
-- ============================================

-- NOTES:
-- 1. The user_update_own_stories policy permits owners to update their rows.
--    It does not attempt to block approval field changes because Postgres
--    policies cannot easily reference OLD values in a WITH CHECK.
--
-- 2. For robust prevention of owners modifying approval_status, rely on
--    the Edge Function workflow + a DB function that only admins can call.
--
-- 3. The story_reviews table and approve_story() function are commented out.
--    Enable them when you need full audit trail for multiple reviews or
--    reviewer notes.
--
-- 4. After running this migration:
--    - Set yourself as admin: UPDATE profiles SET profile_data =
--      jsonb_set(profile_data, '{is_admin}', 'true'::jsonb, true)
--      WHERE email = 'your-email@example.com';
--    - Test by creating a story with document_type = 'story'
--    - Verify RLS policies work correctly
--    - Deploy the approve-story Edge Function
