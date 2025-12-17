-- Migration: Add 'reported' column to user_documents with RLS policy
-- Purpose: Flag content that has been reported by viewers
-- When reported=true, creator cannot re-publish the content (enforced at DB level)
-- Date: 2025-11-25

-- ============================================
-- Step 1: Add reported column (default false)
-- ============================================
ALTER TABLE public.user_documents
ADD COLUMN IF NOT EXISTS reported BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.user_documents.reported IS 'True if content has been reported by a viewer. Prevents re-publishing until admin review.';

-- ============================================
-- Step 2: Create index for querying reported content
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_documents_reported
ON public.user_documents(reported)
WHERE reported = true;

-- ============================================
-- Step 3: Add RLS policy to prevent re-publishing reported content
-- ============================================
-- This prevents users from setting is_published=true when reported=true
-- Defense-in-depth: Even if UI is bypassed, database enforces the rule

CREATE POLICY prevent_publish_reported_content ON public.user_documents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    -- Allow updates UNLESS trying to publish reported content
    -- Check both the column 'reported' and the JSONB field 'is_published'
    NOT (
      reported = true
      AND document_data->>'is_published' = 'true'
    )
  );

-- ============================================
-- Verification Queries
-- ============================================

-- Verify column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_documents'
AND column_name = 'reported';

-- Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_documents'
AND indexname = 'idx_user_documents_reported';

-- Verify RLS policy was created
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_documents'
AND policyname = 'prevent_publish_reported_content';

-- ============================================
-- Expected Results:
-- ============================================
-- Column: reported | boolean | false
-- Index: idx_user_documents_reported (partial index on reported = true)
-- Policy: prevent_publish_reported_content (blocks publishing when reported)

-- ============================================
-- Rollback (if needed)
-- ============================================
/*
DROP POLICY IF EXISTS prevent_publish_reported_content ON public.user_documents;
DROP INDEX IF EXISTS idx_user_documents_reported;
ALTER TABLE public.user_documents DROP COLUMN IF EXISTS reported;
*/
