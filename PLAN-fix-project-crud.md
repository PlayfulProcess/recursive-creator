# Plan: Fix Project CRUD Operations

**Date:** 2025-12-18
**Branch:** `claude/fix-project-crud-operations-z0Rls`
**Issues:** Create new project, Save As New, Dashboard simplification, Submit to channels timing

---

## Issue Summary (Updated Scope)

1. **Create new project doesn't work** - When clicking "Create New Project" and saving, the project is not being created
2. **Save As New not working** - In edit mode, the "Save As New" button doesn't create a new project
3. ~~**Delete button logic issues**~~ - REMOVED (working fine)
4. **Dashboard simplification** - Remove tools table dependency, use only `user_documents` (channels project will update user_documents)
5. **Submit to channels timing** - First click doesn't immediately open the channel submission modal, second click works

---

## Architecture Decision: Single Source of Truth

### Current (Complex):
```
recursive-creator → writes → user_documents
channels app → writes → tools table
recursive-creator → reads → user_documents + tools (merge)
```

### New (Simplified):
```
recursive-creator → writes/reads → user_documents (single source)
channels app → writes → tools table (for channel display)
channels app → also updates → user_documents (sync back)
```

**Benefits:**
- Single source of truth (`user_documents`)
- Simpler code in recursive-creator
- No complex merge logic needed
- Data consistency - user sees what they saved
- Channels still has `tools` table for its own channel listings

---

## Root Cause Analysis

### Issue 1 & 2: Create/Save As New Not Working

**File:** `/app/dashboard/sequences/new/page.tsx`

**Potential Problems:**
1. Insert may succeed but `insertData` might be null/undefined
2. Error handling may be silently failing
3. Redirect `router.push` may happen before state is set
4. Missing `.select().single()` might not return the inserted data

**Fix Strategy:**
- Add console logging to trace the flow
- Add visible error messages
- Verify `insertData.id` exists before redirect

---

### Issue 4: Dashboard Simplification

**File:** `/app/dashboard/page.tsx`

**Current Implementation (lines 55-152):**
- Fetches from `user_documents`
- Fetches from `tools` table
- Complex merge logic with priority rules

**New Implementation:**
- Fetch ONLY from `user_documents`
- Remove all tools table queries
- Remove merge logic
- Display fields directly from `document_data`

**Fields to display (all from user_documents.document_data):**
- `title`
- `description`
- `creator_name`
- `creator_link`
- `thumbnail_url`
- `hashtags`
- `items`

---

### Issue 5: Submit to Channels Timing

**File:** `/app/dashboard/sequences/new/page.tsx`

**Problem:** React state updates are asynchronous
- `setPublishedDocId(insertData.id)` is called
- `setShowSuccessModal(true)` is called immediately after
- User clicks "Submit to Channel" button
- `publishedDocId` state hasn't updated yet (still `null`)
- URL built with empty doc_id → first click fails

**Fix:** Use the ID directly instead of relying on state
```tsx
// Store ID for immediate use
const newId = insertData.id;
setPublishedDocId(newId);
setPublishedUrl(`https://recursive.eco/view/${newId}`);
// The modal can use newId directly or we ensure state is set before modal opens
```

---

## Implementation Plan

### Step 1: Fix Create New Project & Save As New

**File:** `/app/dashboard/sequences/new/page.tsx`

1. Add console.log before and after insert
2. Add null check for `insertData`
3. Show error if insert fails
4. Verify redirect works

### Step 2: Simplify Dashboard (Remove Tools Dependency)

**File:** `/app/dashboard/page.tsx`

1. Remove tools table fetch (lines 71-74)
2. Remove toolsMap creation (lines 77-98)
3. Remove merge logic (lines 102-144)
4. Simplify to direct mapping from user_documents
5. Keep `submitted_channels` as empty array for now (or remove if not needed)

### Step 3: Fix Submit to Channels Timing

**File:** `/app/dashboard/sequences/new/page.tsx`

1. Use the ID directly when opening success modal
2. Pass ID to channel selection modal explicitly
3. Or use useEffect to delay modal open until state is set

### Step 4: Update Editor to Remove Tools Fetching

**File:** `/app/dashboard/sequences/new/page.tsx`

1. Remove tools table query in `loadSequence` (lines 364-387)
2. Load all fields directly from `user_documents.document_data`
3. Simplify the loading logic

---

## Files to Modify

1. `/app/dashboard/page.tsx` - Remove tools dependency, simplify fetch
2. `/app/dashboard/sequences/new/page.tsx` - Fix create/save, fix timing, remove tools fetch

---

## Testing Checklist

- [ ] Create new project from dashboard → project appears in list
- [ ] Save As New from editor → new project created
- [ ] Dashboard cards show all fields from user_documents
- [ ] Publish + Submit to Channel works on first click
- [ ] Edit existing project → all fields load correctly

---

## Companion Task: Update Channels Project

See prompt below for updating recursive-channels-fresh to sync data back to user_documents.

