# Playlist Submission & Dashboard Evolution Plan

## Your Vision Decoded

1. **Immediate**: Make playlists submittable with all required fields
2. **Short-term**: Dashboard looks like channels (card grid view)
3. **Medium-term**: See everything (created + starred + submitted) in one place
4. **Long-term**: Custom collections that work like channels

**Key Insight**: Everything can live in `document_data` JSONB - no database changes needed!

---

## Phase 1: Channel Submission Fields (COMPLETE)

### What Was Built

Added optional fields to sequence creator that are needed for channel submission:

```typescript
// State variables added
const [creatorName, setCreatorName] = useState('');
const [creatorLink, setCreatorLink] = useState('');
const [thumbnailUrl, setThumbnailUrl] = useState('');
const [hashtags, setHashtags] = useState<string[]>([]);
```

### Stored in document_data

```json
{
  "title": "My Playlist",
  "description": "...",
  "items": [...],
  "creator_name": "PlayfulProcess",
  "creator_link": "https://...",
  "thumbnail_url": "https://drive.google.com/...",
  "hashtags": ["kids", "bedtime", "stories"]
}
```

### UI Changes
- Removed Author field (was buggy, kept auto-refilling)
- Added collapsible "Description & Optional Details" section
- Fields: Description, Creator Display Name, Creator Link, Thumbnail URL, Hashtags
- Shows "(has content)" indicator when fields are filled
- Added Export Links button (copy all URLs to clipboard)
- Added localStorage persistence for new sequences

### Channel Submission URL
Now passes all fields as query params:
```
https://channels.recursive.eco/channels/kids-stories?doc_id=xxx&title=xxx&description=xxx&creator_name=xxx&creator_link=xxx&thumbnail_url=xxx&hashtags=tag1,tag2
```

---

## Phase 2: Dashboard Card Grid View (COMPLETE)

### Goal
Make the dashboard display playlists like channels do - as visual cards instead of a list.

### Implementation

**Current dashboard structure:**
```
/dashboard/page.tsx - List view with table-like rows
```

**Target structure:**
```
/dashboard/page.tsx - Card grid view like channels
```

### Card Component Design

```tsx
interface SequenceCardProps {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  items_count: number;
  is_published: boolean;
  created_at: string;
  hashtags?: string[];
}

function SequenceCard({ sequence }: { sequence: SequenceCardProps }) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-900 relative">
        {sequence.thumbnail_url ? (
          <img
            src={`/api/proxy-image?url=${encodeURIComponent(sequence.thumbnail_url)}`}
            alt={sequence.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🎬
          </div>
        )}
        {/* Item count badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {sequence.items_count} items
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{sequence.title}</h3>
        {sequence.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mt-1">{sequence.description}</p>
        )}

        {/* Status & Actions */}
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs px-2 py-1 rounded ${
            sequence.is_published
              ? 'bg-green-600/20 text-green-400'
              : 'bg-yellow-600/20 text-yellow-400'
          }`}>
            {sequence.is_published ? 'Published' : 'Draft'}
          </span>

          <div className="flex gap-2">
            <Link href={`/dashboard/sequences/new?id=${sequence.id}`}>
              <button className="text-gray-400 hover:text-white">Edit</button>
            </Link>
            <button className="text-gray-400 hover:text-red-400">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Grid Layout

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {sequences.map(seq => (
    <SequenceCard key={seq.id} sequence={seq} />
  ))}
</div>
```

---

## Phase 3: Unified Content View (TODO)

### Goal
See everything in one place:
- Created sequences (yours)
- Starred/favorited content (from channels)
- Submitted content (pending/approved)

### Data Structure (No DB Changes!)

**For starred content** - Store in user's profile or a new user_document:

```json
// In profiles.profile_data or a dedicated user_document
{
  "starred_items": [
    {
      "type": "channel_tool",
      "channel_slug": "kids-stories",
      "tool_id": "uuid",
      "starred_at": "2024-01-01T00:00:00Z"
    },
    {
      "type": "sequence",
      "doc_id": "uuid",
      "starred_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**For submission tracking** - Already in document_data:

```json
{
  "submissions": [
    {
      "channel_slug": "kids-stories",
      "submitted_at": "2024-01-01T00:00:00Z",
      "status": "pending" | "approved" | "rejected"
    }
  ]
}
```

### UI Tabs

```tsx
<div className="flex gap-4 border-b border-gray-700 mb-6">
  <button
    className={activeTab === 'created' ? 'border-b-2 border-purple-500' : ''}
    onClick={() => setActiveTab('created')}
  >
    My Creations
  </button>
  <button
    className={activeTab === 'starred' ? 'border-b-2 border-purple-500' : ''}
    onClick={() => setActiveTab('starred')}
  >
    Starred
  </button>
  <button
    className={activeTab === 'submitted' ? 'border-b-2 border-purple-500' : ''}
    onClick={() => setActiveTab('submitted')}
  >
    Submitted
  </button>
</div>
```

---

## Phase 4: Filters & Multi-select (TODO)

### Goal
Filter content by:
- Channel of origin (kids-stories, wellness, resources)
- Status (draft, published, pending, approved)
- Type (images only, videos only, mixed)
- Hashtags

### Filter UI

```tsx
<div className="flex flex-wrap gap-3 mb-6">
  {/* Channel filter */}
  <select
    value={channelFilter}
    onChange={(e) => setChannelFilter(e.target.value)}
    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
  >
    <option value="">All Channels</option>
    <option value="kids-stories">Kids Stories</option>
    <option value="wellness">Wellness</option>
    <option value="resources">Resources</option>
  </select>

  {/* Status filter */}
  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
    <option value="">All Status</option>
    <option value="draft">Drafts</option>
    <option value="published">Published</option>
    <option value="pending">Pending Review</option>
    <option value="approved">Approved</option>
  </select>

  {/* Hashtag chips */}
  <div className="flex gap-2">
    {popularHashtags.map(tag => (
      <button
        key={tag}
        onClick={() => toggleHashtagFilter(tag)}
        className={`px-3 py-1 rounded-full text-sm ${
          hashtagFilters.includes(tag)
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300'
        }`}
      >
        #{tag}
      </button>
    ))}
  </div>
</div>
```

### Multi-select Actions

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);

// Bulk actions bar (appears when items selected)
{selectedIds.length > 0 && (
  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg shadow-xl p-4 flex gap-4 items-center">
    <span className="text-white">{selectedIds.length} selected</span>
    <button className="px-4 py-2 bg-purple-600 text-white rounded">
      Add to Collection
    </button>
    <button className="px-4 py-2 bg-blue-600 text-white rounded">
      Submit to Channel
    </button>
    <button className="px-4 py-2 bg-red-600 text-white rounded">
      Delete
    </button>
    <button onClick={() => setSelectedIds([])} className="text-gray-400">
      Cancel
    </button>
  </div>
)}
```

---

## Phase 5: Custom Collections / Personal Channels (TODO)

### Goal
Let users create their own "channels" that work like shareable playlists.

### Data Structure

```json
// New document_type: 'collection'
{
  "document_type": "collection",
  "tool_slug": "collection",
  "document_data": {
    "name": "My Bedtime Routine",
    "description": "Videos and stories for winding down",
    "visibility": "public" | "private" | "unlisted",
    "items": [
      { "type": "sequence", "doc_id": "uuid-1" },
      { "type": "channel_tool", "channel_slug": "kids-stories", "tool_id": "uuid-2" },
      { "type": "external_url", "url": "https://...", "title": "..." }
    ],
    "theme": {
      "color": "#8B5CF6",
      "icon": "🌙"
    }
  }
}
```

### Collection Page

```
/collections/[id] - Public shareable page
/dashboard/collections - Manage your collections
```

### Features
- Drag-and-drop reorder items
- Add from starred, created, or external URLs
- Share link or embed code
- Optional password protection
- Analytics (views, plays)

---

## Implementation Priority

### Now (Phase 1) - DONE
- [x] Channel submission fields in sequence creator
- [x] Collapsible optional details section
- [x] Export links button
- [x] localStorage draft persistence
- [x] Pass all fields to channels via URL params

### Now (Phase 2) - DONE
- [x] Card grid view for dashboard
- [x] Thumbnail display (auto-detect from first image/video or explicit thumbnail_url)
- [x] Better visual hierarchy (responsive grid, hover effects, status badges)
- [x] SequenceCard component with hashtags, dates, copy URL

### Later (Phase 3-4)
- [ ] Starred items tracking
- [ ] Submission status tracking
- [ ] Unified content tabs
- [ ] Filters and multi-select

### Future (Phase 5)
- [ ] Custom collections
- [ ] Shareable collection pages
- [ ] Collection embedding

---

## Technical Notes

### No Database Changes Needed!

Everything uses existing structures:
- `user_documents` table with `document_data` JSONB
- `profiles` table with `profile_data` JSONB
- New `document_type` values: 'collection'
- New `tool_slug` values: 'collection'

### Channels App Updates Needed

For Phase 1 to fully work, recursive-channels-fresh needs to:
1. Read query params on channel pages
2. Pre-fill SubmitToolModal with passed data
3. Handle thumbnail_url (URL input, not just file upload)
4. Auto-open submit modal when params present

---

## Files to Modify

### Phase 1 (DONE)
- `app/dashboard/sequences/new/page.tsx` - Added fields, localStorage, export

### Phase 2
- `app/dashboard/page.tsx` - Convert to card grid
- `components/dashboard/SequenceCard.tsx` - New component

### Phase 3
- `app/dashboard/page.tsx` - Add tabs
- `lib/starred.ts` - Starring utilities
- `lib/submissions.ts` - Submission tracking

### Phase 4
- `app/dashboard/page.tsx` - Add filters
- `components/dashboard/FilterBar.tsx` - Filter UI
- `components/dashboard/BulkActions.tsx` - Multi-select actions

### Phase 5
- `app/dashboard/collections/page.tsx` - Collections management
- `app/collections/[id]/page.tsx` - Public collection view
- `components/collections/CollectionEditor.tsx` - Collection builder
