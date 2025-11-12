-- Add 'sequence' to document_type check constraint
-- Unified content sequences (mix of images and videos)
-- Replaces separate story/playlist types long-term

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
    'story'::text,
    'playlist'::text,
    'sequence'::text  -- NEW! Unified image+video sequences
  ]));

-- That's it! Sequences use the same columns:
-- - story_slug (for unique slug)
-- - document_data (JSONB with title, description, items array, etc.)
-- - user_id, tool_slug, document_type, created_at
-- - Existing indexes and RLS policies work for sequences too

-- Backward compatibility:
-- - Old stories have document_data.pages array (images only)
-- - Old playlists have document_data.videos array (videos only)
-- - New sequences have document_data.items array (mixed content)
-- - Viewer component checks which array exists
