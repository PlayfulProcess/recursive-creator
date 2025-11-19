-- Migration: Add public read access for published sequences
-- Date: 2025-11-18
-- Purpose: Allow anyone to view published sequences at recursive.eco/view/{id}

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can view published sequences" ON user_documents;

-- Create policy for public read access to published sequences
CREATE POLICY "Public can view published sequences"
  ON user_documents
  FOR SELECT
  USING (
    tool_slug = 'sequence'
    AND document_data->>'is_published' = 'true'
  );

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_documents'
  AND policyname = 'Public can view published sequences';
