-- ============================================
-- STORY FORGE SCHEMA (TRUE SIMPLICITY)
-- ============================================
-- Uses existing user_documents table!
-- Just add 'story' type and we're done.

-- 1. Add 'story' to document_type enum
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
    'story'::text  -- NEW! 🔨
  ]));

-- 2. Add index for querying published stories
CREATE INDEX IF NOT EXISTS idx_user_documents_story_published
  ON user_documents ((document_data->>'published'))
  WHERE document_type = 'story';

CREATE INDEX IF NOT EXISTS idx_user_documents_story_visibility
  ON user_documents ((document_data->>'visibility'))
  WHERE document_type = 'story';

-- 3. Create storage bucket for story images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for story images

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
END $$;

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
END $$;

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
END $$;

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
END $$;

-- ============================================
-- DONE! 🔨 That's it. One table. Simple.
-- ============================================

/*
EXAMPLE document_data for a story:

{
  "type": "story",
  "title": "The Nest Knows Best: Bunny Coping Tricks",
  "subtitle": "For Little Ones Learning to Sleep",
  "author": "PlayfulProcess",
  "slug": "bunny-coping-tricks",
  "cover_image_url": "story-images/{user_id}/{doc_id}/cover.png",
  "visibility": "public",
  "published": true,
  "pages": [
    {
      "page_number": 1,
      "image_url": "story-images/{user_id}/{doc_id}/page-1.png",
      "alt_text": "Bunny sitting under a tree",
      "narration": "Once upon a time, in a cozy burrow..."
    },
    {
      "page_number": 2,
      "image_url": "story-images/{user_id}/{doc_id}/page-2.png",
      "alt_text": "Bunny looking at the moon",
      "narration": "Bunny couldn't sleep and felt worried..."
    }
  ]
}

QUERY EXAMPLES:

-- Get all published public stories
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'published' = 'true'
AND document_data->>'visibility' = 'public';

-- Get my stories (published or draft)
SELECT * FROM user_documents
WHERE document_type = 'story'
AND user_id = auth.uid();

-- Get a specific story by slug
SELECT * FROM user_documents
WHERE document_type = 'story'
AND document_data->>'slug' = 'bunny-coping-tricks';

STORAGE PATH FORMAT:
story-images/{user_id}/{document_id}/cover.png
story-images/{user_id}/{document_id}/page-1.png
story-images/{user_id}/{document_id}/page-2.png
...

Benefits of this approach:
✅ ONE table (user_documents already exists)
✅ ONE document per story (atomic updates)
✅ Consistent with other tools (channels, journal)
✅ RLS already works (user_documents has policies)
✅ Simpler queries
✅ Fewer joins
✅ Perfect for 200 users scale
✅ Pages array in JSONB = instant loading
*/
