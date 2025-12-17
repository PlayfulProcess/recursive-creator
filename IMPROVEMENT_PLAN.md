# Creator & Viewer Improvement Plan

**Created:** 2025-12-05
**Status:** Planning
**Branch Strategy:** Create feature branches for each priority group

---

## Overview

User feedback after drag-and-drop refactor merge. All features working well, now focusing on UX refinements and missing functionality.

---

## Priority 1: Quick Wins (High Impact, Low Complexity)

### 1.1 Floating Save Button
**Feedback:** "When I make a change, I need to scroll all the way down to save"

**Implementation:**
- Add sticky save button that appears when unsaved changes detected
- Position: Top-right corner, fixed position
- Show/hide based on dirty state
- Include visual indicator (e.g., pulsing dot)

**File:** `app/dashboard/sequences/new/page.tsx`

**Code Approach:**
```tsx
// Add state
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Track changes
useEffect(() => {
  setHasUnsavedChanges(true);
}, [items, title, description]);

// Clear on save
const handleSave = () => {
  // ... save logic
  setHasUnsavedChanges(false);
};

// Sticky button
{hasUnsavedChanges && (
  <div className="fixed top-4 right-4 z-50">
    <button onClick={handleSave} className="...">
      💾 Save Changes
    </button>
  </div>
)}
```

**Time Estimate:** 30 minutes
**Priority:** HIGH - Major UX improvement

---

### 1.2 Replace "Update Published" with "Submit to Channel"
**Feedback:** "Update published button is not necessary... replace with 'Submit to Channel'"

**Implementation:**
- After publish, show success modal with:
  - "Published Successfully!"
  - View link
  - "Submit to Channel" button
- Clicking "Submit to Channel" opens channels.recursive.eco with pre-filled content

**File:** `app/dashboard/sequences/new/page.tsx`

**Code Approach:**
```tsx
// Add state
const [showPublishModal, setShowPublishModal] = useState(false);
const [publishedUrl, setPublishedUrl] = useState('');

// After save success
if (success) {
  setPublishedUrl(`https://recursive.eco/view/${documentId}`);
  setShowPublishModal(true);
}

// Modal
{showPublishModal && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <div className="bg-gray-800 rounded-lg p-6 max-w-md">
      <h3 className="text-xl font-bold text-white mb-4">
        ✅ Published Successfully!
      </h3>
      <p className="text-gray-300 mb-4">
        Your content is now live at: {publishedUrl}
      </p>

      <div className="space-y-3">
        <button onClick={() => window.open(publishedUrl)} className="...">
          🔗 View Project
        </button>
        <button onClick={() => {
          window.open(`https://channels.recursive.eco/?doc_id=${documentId}&title=${title}`)
        }} className="...">
          📢 Submit to Channel
        </button>
        <button onClick={() => setShowPublishModal(false)} className="...">
          Close
        </button>
      </div>
    </div>
  </div>
)}
```

**Time Estimate:** 45 minutes
**Priority:** HIGH - Simplifies workflow

---

### 1.3 Position Click Modal (Move to Position)
**Feedback:** "When I click the numbers, a pop up appears to insert new number with 'move to end/beginning'"

**Implementation:**
- Click position badge → modal opens
- Input field for new position (1 to items.length)
- Quick action buttons: "Move to Beginning", "Move to End"
- Validates input, reorders items

**File:** `app/dashboard/sequences/new/page.tsx`

**Code Approach:**
```tsx
// Add state
const [positionModalOpen, setPositionModalOpen] = useState(false);
const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
const [newPosition, setNewPosition] = useState('');

// Click handler
const handlePositionClick = (index: number) => {
  setSelectedItemIndex(index);
  setNewPosition(String(index + 1));
  setPositionModalOpen(true);
};

// Move function
const handleMoveToPosition = (targetPosition: number) => {
  if (selectedItemIndex === null) return;

  const newItems = [...items];
  const [movedItem] = newItems.splice(selectedItemIndex, 1);
  newItems.splice(targetPosition - 1, 0, movedItem);

  // Renumber
  newItems.forEach((item, i) => {
    item.position = i + 1;
  });

  setItems(newItems);
  setPositionModalOpen(false);
};

// Update SortableItemCard
<div
  onClick={() => handlePositionClick(index)}
  className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-purple-700"
>
  {index + 1}
</div>

// Modal
{positionModalOpen && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-white text-lg mb-4">Move Item</h3>

      <input
        type="number"
        min="1"
        max={items.length}
        value={newPosition}
        onChange={(e) => setNewPosition(e.target.value)}
        className="..."
      />

      <div className="mt-4 space-y-2">
        <button onClick={() => handleMoveToPosition(1)}>
          ⬆️ Move to Beginning
        </button>
        <button onClick={() => handleMoveToPosition(items.length)}>
          ⬇️ Move to End
        </button>
        <button onClick={() => handleMoveToPosition(parseInt(newPosition))}>
          ↔️ Move to Position {newPosition}
        </button>
      </div>
    </div>
  </div>
)}
```

**Time Estimate:** 1 hour
**Priority:** HIGH - Solves mobile drag-and-drop issues

---

## Priority 2: Core Features (Medium Complexity)

### 2.1 Drive File Title & Author Field
**Feedback:** "Upload title of Drive file as well. Add author field pre-filled with auth email (editable)"

**Implementation:**
- When importing Drive files, fetch file title from Drive API
- Add "Author" field to sequence metadata
- Pre-fill with user's auth email
- Allow editing before save

**Files:**
- `app/api/import-drive-folder/route.ts` (fetch file titles)
- `app/dashboard/sequences/new/page.tsx` (add author field)

**Code Approach:**

**Backend Enhancement:**
```typescript
// In import-drive-folder/route.ts
// Already getting file names, just need to include in response
const files = data.files.map((file: any) => ({
  name: file.name,  // ← Already have this!
  url: driveUrl,
  mimeType: file.mimeType
}));
```

**Frontend:**
```tsx
// Add author state
const [author, setAuthor] = useState('');

// Pre-fill on mount
useEffect(() => {
  if (user?.email) {
    setAuthor(user.email);
  }
}, [user]);

// Add to form
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-300 mb-2">
    Author (Optional)
  </label>
  <input
    type="text"
    value={author}
    onChange={(e) => setAuthor(e.target.value)}
    placeholder="Your name or email"
    className="..."
  />
</div>

// When importing Drive files, use file name as title
const newItem = {
  position: items.length + 1,
  type: 'image',
  image_url: driveUrl,
  alt_text: fileName,  // ← Use Drive file name
  narration: ''
};

// Save author to document_data
const documentData = {
  title,
  description,
  author,  // ← New field
  items
};
```

**Time Estimate:** 1 hour
**Priority:** MEDIUM - Nice enhancement

---

### 2.2 Items Window with Expandable View
**Feedback:** "Items should be displayed in window that fits first 2, but can augment to fullscreen"

**Implementation:**
- Default: Show first 2 items, scroll for more
- "Expand" button opens fullscreen modal with all items
- Better for long sequences

**File:** `app/dashboard/sequences/new/page.tsx`

**Code Approach:**
```tsx
// Add state
const [itemsExpanded, setItemsExpanded] = useState(false);

// Compact view (default)
<div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold text-white">
      Items ({items.length}/{MAX_ITEMS})
    </h2>
    <button onClick={() => setItemsExpanded(true)} className="...">
      ⛶ Expand
    </button>
  </div>

  <div className="max-h-[400px] overflow-y-auto">
    {/* First 2 items visible, rest require scroll */}
    <DndContext...>
      {items.map(...)}
    </DndContext>
  </div>
</div>

// Fullscreen modal
{itemsExpanded && (
  <div className="fixed inset-0 bg-gray-900 z-50 p-6 overflow-y-auto">
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          All Items ({items.length})
        </h2>
        <button onClick={() => setItemsExpanded(false)}>
          ✕ Close
        </button>
      </div>

      <DndContext...>
        {items.map(...)}
      </DndContext>
    </div>
  </div>
)}
```

**Time Estimate:** 1 hour
**Priority:** MEDIUM - Better for long sequences

---

### 2.3 Display Drive File Title in Viewer
**Feedback:** "I want the title and author of Drive files displayed in viewer like YouTube videos"

**Implementation:**
- Store Drive file title in sequence item metadata
- Display title overlay for Drive images (like YouTube videos)
- Show author attribution

**Files:**
- `recursive-landing/view.html` (vanilla JS viewer)
- `components/viewers/SequenceViewer.tsx` (React viewer)

**Code Approach:**

**Creator (save title with item):**
```tsx
// When importing, save Drive file name
{
  type: 'image',
  image_url: driveUrl,
  alt_text: fileName,  // ← File name from Drive API
  title: fileName      // ← NEW: Explicit title field
}
```

**Viewer (display title):**
```tsx
// In SequenceViewer.tsx
{currentItem.type === 'image' && currentItem.title && (
  <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
    <p className="text-white text-lg px-6 py-3 bg-black/50 rounded-lg backdrop-blur-sm inline-block">
      {currentItem.title}
    </p>
  </div>
)}
```

**Time Estimate:** 45 minutes
**Priority:** MEDIUM - Consistency with video display

---

## Priority 3: Advanced Features (Higher Complexity)

### 3.1 Export Functionality (CSV & PDF)
**Feedback:** "Export list of links (CSV) or whole program (PDF/printable HTML)"

**Implementation:**

**Export Links as CSV:**
```tsx
const handleExportCSV = () => {
  const csv = [
    ['Position', 'Type', 'URL', 'Title', 'Duration'].join(','),
    ...items.map(item => [
      item.position,
      item.type,
      item.type === 'image' ? item.image_url : item.url,
      item.title || item.alt_text || '',
      item.duration_seconds || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-')}.csv`;
  a.click();
};
```

**Export as PDF/HTML:**
- Use library like `jsPDF` or `html2pdf.js`
- Generate printable HTML with thumbnails, titles, durations
- Include metadata (title, description, author, total duration)

**Files:**
- `app/dashboard/sequences/new/page.tsx`
- `package.json` (add jsPDF dependency)

**Time Estimate:** 2-3 hours
**Priority:** LOW - Nice-to-have feature

---

### 3.2 Mobile Drag-and-Drop Fix
**Feedback:** "Mobile drag-and-drop not working... hamburger trembles but doesn't drag"

**Investigation Needed:**
- @dnd-kit/core should support touch
- May need to adjust touch sensor activation
- Alternative: Hide drag handle on mobile, rely on position modal (1.3)

**Options:**

**Option A: Fix Touch Sensors**
```tsx
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,      // Increase delay
      tolerance: 10,   // Increase tolerance
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

**Option B: Hide Drag on Mobile, Show Position Modal**
```tsx
<div className="flex items-center gap-4">
  {/* Hide drag handle on mobile */}
  <div className="hidden md:block cursor-grab ...">
    ≡
  </div>

  {/* Position badge always clickable */}
  <div onClick={() => handlePositionClick(index)} className="...">
    {index + 1}
  </div>
</div>
```

**Time Estimate:** 1-2 hours (investigation + fix)
**Priority:** MEDIUM - Important for mobile users

---

## Priority 4: Future Considerations

### 4.1 Attribution & Creator Credit Policy
**Feedback:** "Creators can overwrite everything... not comfortable with that"

**Discussion Needed:**
- Should original YouTube creator names be locked/required?
- Allow editing but show original in attribution?
- Add "Original Creator" field that's view-only?

**Recommendation:**
- Store both "original_creator" (locked) and "display_title" (editable)
- Show both in viewer with clear attribution
- Example: "Curated by: [user] | Original Creator: [YouTube channel]"

**Implementation:**
```tsx
interface SequenceItem {
  // ... existing fields
  original_creator?: string;   // Locked (from YouTube API)
  display_title?: string;       // Editable override
  curated_by?: string;         // Sequence creator
}

// In viewer
<div className="text-sm text-gray-400 mt-2">
  {item.original_creator && (
    <span>Original: {item.original_creator}</span>
  )}
  {item.curated_by && (
    <span> | Curated by: {item.curated_by}</span>
  )}
</div>
```

**Time Estimate:** 2 hours + policy decision
**Priority:** LOW - Needs discussion first

---

## Implementation Strategy

### Phase 1: Quick Wins (1-2 days)
1. Floating save button (30 min)
2. Submit to Channel button (45 min)
3. Position click modal (1 hour)
4. Drive file title in viewer (45 min)

**Total:** ~3 hours of work

### Phase 2: Core Features (2-3 days)
1. Drive file title upload + author field (1 hour)
2. Items expandable view (1 hour)
3. Mobile drag-and-drop fix (1-2 hours)

**Total:** ~3-4 hours of work

### Phase 3: Advanced Features (1 week)
1. Export CSV/PDF (2-3 hours)
2. Attribution policy implementation (2 hours + discussion)

**Total:** ~4-5 hours of work

---

## Branch Strategy

**Create separate feature branches:**
- `feature/quick-wins` - Priority 1 items
- `feature/core-improvements` - Priority 2 items
- `feature/export-attribution` - Priority 3-4 items

**Merge strategy:**
- Test each priority group on Vercel preview
- Merge to main after user testing
- Deploy incrementally

---

## Questions for User

1. **Export Format:** PDF, HTML, or both? Any specific layout preferences?
2. **Attribution Policy:** Should original creator names be locked or just recommended?
3. **Mobile Priority:** Fix drag-and-drop or rely on position modal?
4. **Items Window:** Default height showing 2 items ok? Or adjust?

---

## Next Steps

1. Review this plan with user
2. Get answers to questions above
3. Create `feature/quick-wins` branch
4. Start with Priority 1 (highest impact, lowest complexity)
5. Test and iterate
