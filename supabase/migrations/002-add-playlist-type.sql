-- Add 'playlist' to document_type check constraint
-- This is the ONLY required change - playlists reuse existing story_slug column

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
    'playlist'::text  -- NEW! For YouTube playlists
  ]));

-- That's it! Playlists use the same columns as stories:
-- - story_slug (for unique slug)
-- - document_data (JSONB with title, videos, etc.)
-- - user_id, tool_slug, document_type, created_at
-- - Existing indexes and RLS policies work for playlists too
