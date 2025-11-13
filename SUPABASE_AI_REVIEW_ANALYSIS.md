# Supabase AI Review Analysis - Should We Change?

> **Context:** Supabase AI reviewed our revised migration and suggested improvements.
> **Question:** Should we implement their recommendations?

---

## Summary: Mostly Stay As-Is, Add Unique Constraint

**Recommendation:** Keep the JSONB string boolean pattern (consistent with existing code), but add the unique constraint for `story_slug`.

**Why:** For your scale (200 users, ~50 stories), consistency with existing patterns > micro-optimizations.

---

## Supabase AI's Recommendations

### 1. Use Boolean Instead of String Boolean ⚠️

**What they said:**
- Change `"is_active": "true"` (string) to `"is_active": true` (JSON boolean)
- Or add a `published boolean` column

**Their reasoning:**
- Type safety
- Faster queries
- Better indexing

**Your existing codebase:**
```json
// From tools table - ALREADY USING STRING BOOLEANS:
{
  "is_active": "true",    // String!
  "reviewed": "true",     // String!
  "is_featured": "false"  // String!
}
```

**Analysis:**

✅ **Keep string booleans** (consistent with tools/channels)

**Reasons:**
1. **Consistency** - All existing tools use strings
2. **Working pattern** - Tools/channels work fine with strings
3. **Scale** - At 200 users, performance difference is negligible (<1ms)
4. **Effort** - Changing would require migrating ALL existing tools/channels
5. **Risk** - Could break existing queries in recursive-channels

**Trade-off accepted:**
- Slightly slower JSONB extraction
- But: Consistency across codebase is more valuable

**When to reconsider:**
- User base grows to 2000+ users
- Queries become noticeably slow (>100ms)
- Building new content types from scratch

---

### 2. Owner UPDATE Policy Allows Changing Approval Fields ✅

**What they said:**
- Owners can modify `document_data->>'is_active'` because document_data is free-form
- Need to prevent this

**Their recommendation:**
- Use Edge Function for all approval actions (service_role key)
- Don't let client send approval fields

**Analysis:**

✅ **Implement this** - Use Edge Function for approvals

**Implementation:**
1. **Admin approval UI** calls Edge Function (not direct SQL)
2. **Edge Function** validates admin status, then updates with service_role
3. **Client UI** never sends `is_active`, `approved_at`, etc. in updates

**Example:**
```typescript
// supabase/functions/approve-story/index.ts
export default async function handler(req: Request) {
  // Verify caller is admin
  const isAdmin = await checkIsAdmin(auth.uid());
  if (!isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  // Use service_role to update approval fields
  await supabaseAdmin
    .from('user_documents')
    .update({
      document_data: {
        ...existingData,
        is_active: 'true',  // Admin-only change
        approved_at: new Date().toISOString(),
        approved_by: 'admin'
      }
    })
    .eq('id', storyId);
}
```

**Why this works:**
- Client can't call Edge Function without valid JWT
- Edge Function checks admin status
- service_role bypasses RLS
- Approval logic in one place (DRY)

---

### 3. Add Unique Constraint on story_slug ✅

**What they said:**
- Create unique index for `story_slug` to prevent collisions

**Analysis:**

✅ **Implement this** - Good safety measure

**SQL:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story' AND story_slug IS NOT NULL;
```

**Why:**
- Prevents duplicate story URLs
- Database enforces uniqueness
- Partial index (only for stories with slugs)

---

### 4. Storage Bucket Visibility ⚠️

**What they said:**
- If story images should be private pre-approval, current policy is too permissive

**Your use case:**
- Story images in `story-images/` bucket
- Path: `story-images/{user_id}/{doc_id}/filename.png`

**Analysis:**

⚠️ **Depends on your requirements**

**Option A: Keep bucket public** (simpler, recommended for MVP)
- Images visible to anyone with URL
- But URLs are UUIDs (hard to guess)
- Public stories show images
- Pending stories: only owner knows URL (via dashboard preview)

**Option B: Private bucket** (more complex)
- Requires signed URLs
- More secure
- More complex to implement

**Recommendation:**
Start with Option A (public bucket). Your story images aren't sensitive (they're children's stories). The real gatekeeping is the RLS on `user_documents` (only approved stories visible to public).

**When to switch to Option B:**
- If you need truly private story drafts
- If images contain sensitive content
- If you want to paywall stories later

---

### 5. RLS Interaction with Existing Policies ✅

**What they said:**
- Check existing `user_documents` policies don't conflict

**Analysis:**

✅ **Audit existing policies before running migration**

**Action:**
```sql
-- Check current policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_documents';
```

**Look for:**
- Overly broad UPDATE policies
- Policies that don't filter by `document_type`

**If found:**
Add `document_type != 'story'` to existing policies OR ensure story-scoped policies are more specific.

---

### 6. Reviewer Metadata (reviewed_by, reviewed_at) ⚠️

**What they said:**
- Add `reviewed_by uuid` and `reviewed_at timestamptz` columns
- Easier to query by reviewer

**Your current approach:**
- Store in JSONB: `approved_by`, `approved_at`

**Analysis:**

⚠️ **Keep in JSONB for now** (consistent with existing pattern)

**Reasons:**
1. **Consistency** - Tools store these in JSONB
2. **Scale** - At 200 users, won't query by reviewer often
3. **Flexibility** - Can add `rejected_by`, `rejection_reason` easily

**When to add columns:**
- Need to query "all stories reviewed by X admin"
- Building admin analytics dashboard
- Audit requirements

**For now:** JSONB is fine. Add columns later if needed.

---

## Recommended Changes to Migration

### ✅ Add (Minimal Changes)

1. **Unique constraint on story_slug:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story' AND story_slug IS NOT NULL;
```

### ❌ Don't Add (Keep Consistent)

1. **Boolean columns** - Keep string booleans in JSONB (consistent with tools)
2. **reviewed_by/reviewed_at columns** - Keep in JSONB (consistent with tools)

### ✅ Implement Later (Post-Migration)

1. **Edge Function for approvals** - When building admin dashboard
2. **Audit existing RLS policies** - Before running migration
3. **Storage visibility review** - When building upload UI

---

## Updated Migration SQL

Here's the revised migration with just the unique constraint added:

```sql
-- Add to end of 001-story-approval-revised.sql

-- 10) Add unique constraint on story_slug (prevents duplicate URLs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_documents_story_slug
  ON public.user_documents (story_slug)
  WHERE document_type = 'story' AND story_slug IS NOT NULL;
```

That's it! One line addition.

---

## Summary Table

| Recommendation | Implement? | Reason |
|----------------|------------|--------|
| Use boolean instead of string | ❌ No | Consistency with existing tools/channels |
| Edge Function for approvals | ✅ Yes | Security best practice, implement when building admin UI |
| Unique constraint on slug | ✅ Yes | Safety measure, add to migration |
| reviewed_by/at columns | ❌ No | Keep in JSONB (consistent), add later if needed |
| Storage visibility | ⚠️ Review | Public bucket OK for MVP, revisit if needed |
| Audit existing RLS | ✅ Yes | Do before running migration |

---

## Action Items

### Before Running Migration:
1. ✅ **Add unique constraint** to migration SQL
2. ✅ **Audit existing policies** on `user_documents`

### After Running Migration:
3. ✅ **Build Edge Function** for story approval (when building admin UI)
4. ⚠️ **Review storage visibility** (when building upload UI)

### Future (When Needed):
5. ⏳ **Add boolean columns** (only if queries become slow)
6. ⏳ **Add reviewer columns** (only if need to query by reviewer)

---

## The Verdict

**Supabase AI's review is excellent for a generic case**, but for YOUR specific context:

✅ **Keep what you have** (JSONB strings, consistent with tools)
✅ **Add safety** (unique constraint)
✅ **Improve security** (Edge Function for approvals)
⚠️ **Review storage** (decide on public vs private)

**Philosophy:** Consistency with existing patterns > micro-optimizations at your scale.

---

## Quote from Session 7

> "Always check existing codebase patterns before accepting external recommendations, even from AI."

**Domain knowledge > generic advice.** ✅

Your existing tools pattern uses string booleans and stores metadata in JSONB. Stories should match that pattern.

---

**Ready to update the migration?** Just add the unique constraint and you're good to go! 🔨
