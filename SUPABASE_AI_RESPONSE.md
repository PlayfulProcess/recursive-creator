# Response to Supabase AI Recommendations

**Date:** 2025-11-25
**Context:** Adding `reported` column and preventing re-publishing of reported content

---

## What We're Adopting ✅

### 1. Migration DDL (Column + Index)
**Status:** ✅ ADOPTED

```sql
ALTER TABLE public.user_documents
ADD COLUMN IF NOT EXISTS reported BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.user_documents.reported IS 'True if content has been reported by a viewer. Prevents re-publishing until admin review.';

CREATE INDEX IF NOT EXISTS idx_user_documents_reported
ON public.user_documents(reported)
WHERE reported = true;
```

**Reasoning:**
- Essential for the feature
- Simple and safe
- Partial index is efficient (only indexes reported=true rows)

---

### 2. RLS Policy to Prevent Re-Publishing
**Status:** ✅ ADOPTED (with modification)

**Your suggestion:**
```sql
CREATE POLICY user_cannot_publish_reported ON public.user_documents
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    NOT (reported = true AND (is_published IS TRUE OR (NEW.is_published IS TRUE)))
  );
```

**Our implementation:**
```sql
CREATE POLICY prevent_publish_reported_content ON public.user_documents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    NOT (
      reported = true
      AND document_data->>'is_published' = 'true'
    )
  );
```

**Why modified:**
1. **Our schema uses JSONB:** `is_published` is stored in `document_data->>'is_published'` (string 'true'/'false'), not a boolean column
2. **Simpler auth check:** Direct `auth.uid()` instead of subquery (more efficient)
3. **Clearer naming:** `prevent_publish_reported_content` is more descriptive

**Reasoning:**
- ✅ Defense-in-depth: Even if UI is bypassed (direct API call, database edit), DB enforces the rule
- ✅ Simple: One policy, clear logic
- ✅ No performance impact: Only applies on UPDATE operations
- ✅ Keeps logic centralized at database level

---

## What We're NOT Adopting ❌

### 3. Trigger to Auto-Unpublish
**Status:** ❌ NOT ADOPTED

**Your suggestion:**
```sql
CREATE OR REPLACE FUNCTION user_documents_unpublish_on_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.reported = true AND (OLD.reported IS DISTINCT FROM NEW.reported)) THEN
    NEW.is_published := false;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_unpublish_on_report
BEFORE UPDATE ON public.user_documents
FOR EACH ROW
WHEN (OLD.reported IS DISTINCT FROM NEW.reported)
EXECUTE FUNCTION user_documents_unpublish_on_report();
```

**Why NOT adopted:**

1. **Already handled in application code:** Our API route (`/api/report-content`) already handles unpublishing:
   ```typescript
   if (reportType === 'unpublish') {
     updates.document_data = {
       ...document.document_data,
       is_published: 'false',
     };
   }
   ```

2. **Redundant logic:** Trigger would duplicate what the API already does

3. **Less flexible:** Trigger always unpublishes when `reported=true`, but our feature allows two options:
   - "Just notify" → Report without unpublishing
   - "Unpublish immediately" → Report AND unpublish

   The trigger would override this user choice

4. **Simpler is better:** One place to handle unpublishing (API) is easier to maintain than two (API + trigger)

5. **Works with our JSONB schema:** API knows how to handle `document_data->>'is_published'`, trigger would need to be modified for JSONB

**Exception:** If we later need to allow admins to set `reported=true` directly in Supabase dashboard (bypassing the API), then the trigger would be useful. For now, we don't need it.

---

## Summary

| Feature | Status | Reasoning |
|---------|--------|-----------|
| Column + Index | ✅ Adopted | Essential for feature |
| RLS Policy | ✅ Adopted (modified) | Defense-in-depth, prevents bypass |
| Auto-unpublish Trigger | ❌ Not adopted | Redundant with API logic, less flexible |

**Migration file:** `supabase_migration_add_reported_with_rls.sql`

**Next steps:**
1. Run migration in Supabase SQL Editor
2. Test that reported content cannot be re-published (even via direct API calls)
3. Verify RLS policy works as expected

---

**Thank you, Supabase AI, for the thorough recommendations!** The RLS policy suggestion is excellent and we've adopted it. The trigger suggestion is well-designed but not needed for our use case.
