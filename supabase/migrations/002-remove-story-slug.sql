-- ============================================
-- Remove story_slug column (use tool_slug instead)
-- ============================================
-- Stories now use the existing tool_slug column
-- instead of a separate story_slug column.
-- This keeps the schema consistent with other
-- document types (tools, channels, etc.)
-- ============================================

-- Drop the story_slug column if it exists
ALTER TABLE IF EXISTS public.user_documents
  DROP COLUMN IF EXISTS story_slug;

-- Drop the unique index on story_slug if it exists
DROP INDEX IF EXISTS public.uq_user_documents_story_slug;

-- Drop the regular index on story_slug if it exists
DROP INDEX IF EXISTS public.idx_user_documents_story_slug;

-- ============================================
-- DONE! Stories now use tool_slug
-- ============================================
--
-- NOTES:
-- - tool_slug is already indexed in user_documents
-- - tool_slug is already used by other document types
-- - This simplifies the schema and keeps it consistent
-- ============================================
