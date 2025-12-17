# Recursive Creator

> Unified creator hub for Recursive.eco ecosystem
> Stories • Playlists • Account Management

---

## 📋 Quick Links

- **[CLAUDE.md](CLAUDE.md)** ← START HERE when resuming development
- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** - Complete 11-week implementation plan
- **[AUTH_IMPLEMENTATION_PLAN.md](AUTH_IMPLEMENTATION_PLAN.md)** - Dual auth (magic link + OTP)
- **[SUPABASE_SCHEMA_REVISED.md](SUPABASE_SCHEMA_REVISED.md)** - Database design (relational)
- **[AUTH_PORTABILITY.md](AUTH_PORTABILITY.md)** - Copy auth to other projects

---

## 🎯 What We're Building

### Phase 1: Story Publisher
Parents upload images to create children's books
- Preview before publishing
- Private/unlisted/public visibility
- Beautiful viewer (inspired by recursive-landing)

### Phase 2: YouTube Playlist Wrapper
Curated video playlists for kids
- Privacy-enhanced YouTube embeds
- Adult affirmation gate
- Content moderation

### Phase 3: Account Hub
Unified dashboard for all Recursive.eco content
- Starred items from all channels
- Account settings (GDPR compliant)
- Future creator tools

---

## ✅ Key Decisions Made

### 1. Auth First (Not Fun Stuff First)
**Why:** 3-4 days of auth work saves weeks of frustration and refactoring
**What:** Dual auth (magic link + OTP) in one email

### 2. Full JSONB Schema (Not Relational)
**Why:** Solo dev speed, AI integration, small scale (200 users), no migrations
**What:** 3 simple tables with JSONB data columns (same pattern as existing projects)

### 3. New Project (Not Adding to Channels)
**Why:** Clean architecture, minimal refactoring, clear separation
**What:** recursive-creator as standalone Next.js 15 project

---

## 📂 Project Structure

```
recursive-creator/
├── README.md                        ← You are here
├── CLAUDE.md                        ← Context for AI (read first!)
├── PROJECT_PLAN.md                  ← Master plan
├── AUTH_IMPLEMENTATION_PLAN.md      ← Auth guide
├── SUPABASE_SCHEMA_REVISED.md       ← Schema design
├── AUTH_PORTABILITY.md              ← Copy auth guide
│
└── src/                             ← (To be created)
    ├── app/                         ← Next.js 15 app router
    ├── components/                  ← React components
    └── lib/                         ← Utilities
```

---

## 🚀 Current Status

**Phase:** Phase 2 - Dashboard Card Grid & Actions
**Progress:**
- ✅ Auth (magic link + OTP)
- ✅ Unified sequence creator (images + videos)
- ✅ YouTube playlist import
- ✅ Drive folder batch import
- ✅ Publishing workflow with CC BY-SA 4.0 licensing
- ✅ Dashboard card grid view
- 🔄 Card actions (submit, unsubmit, delete)

**Next:** Fix 🔒 unsubmit to properly update `tools` table

---

## 🛠️ Current Tasks

1. ✅ Dashboard card grid with thumbnails
2. 🔄 Fix 🔒 button to unsubmit from channels (update `tools.is_active`)
3. 🔄 Fix delete cascade (unsubmit before delete)
4. ⏳ Investigate "Save New" bug in editor

---

## 🏗️ Architecture: Two-State Visibility System

### Overview

Content in Recursive.eco has **two independent visibility states**:

1. **Viewer Visibility** (`user_documents` table) - Can the public view at `recursive.eco/view/[id]`?
2. **Channel Visibility** (`tools` table) - Does it appear in public channels at `channels.recursive.eco`?

### Table Structure

#### `user_documents` (Source of Truth for Content)

| Column | Purpose |
|--------|---------|
| `id` | UUID of the document |
| `user_id` | Owner of the content |
| `is_public` | **Viewer visibility** - `true` = viewable at `recursive.eco/view/{id}` |
| `document_data` | JSONB with content details |
| `document_data.is_published` | String `"true"/"false"` - mirrors `is_public` |
| `document_data.title` | Content title |
| `document_data.items` | Array of sequence items (images/videos) |

#### `tools` (Channel Submissions)

| Column | Purpose |
|--------|---------|
| `id` | UUID of the tool entry |
| `channel_id` | Which channel this belongs to |
| `tool_data` | JSONB with submission details |
| `tool_data.url` | Link to viewer: `https://recursive.eco/view/{doc_id}` |
| `tool_data.is_active` | **Channel visibility** - `"true"/"false"` |
| `tool_data.name` | Display name in channel |

### Visibility Matrix

| `is_public` | `tool_data.is_active` | Result |
|-------------|----------------------|--------|
| `true` | `"true"` | ✅ Viewable + In channels |
| `true` | `"false"` | ✅ Viewable, ❌ Not in channels |
| `false` | `"true"` | ❌ Broken link in channels! |
| `false` | `"false"` | ❌ Not viewable, ❌ Not in channels |

### User Actions & Correct Behavior

| Action | Button | What it does |
|--------|--------|--------------|
| **Publish** | 🌐 | Sets `user_documents.is_public = true` |
| **Submit to Channel** | 📤 | Creates entry in `tools` table with `is_active: "true"` |
| **Unsubmit from Channel** | 🔒 | Sets `tools.tool_data.is_active = "false"` (keeps viewable!) |
| **Unpublish** | (future) | Sets `user_documents.is_public = false` |
| **Delete** | 🗑️ | 1) Unsubmit from channels, 2) Delete from `user_documents` |

### Key Insight

**🔒 Unsubmit ≠ Unpublish**

- **Unsubmit**: Remove from channels, but keep viewable at direct URL
- **Unpublish**: Make invisible everywhere (breaks channel links!)

When deleting content, always unsubmit from channels FIRST to avoid broken links.

### Code Examples

**Finding tools entries for a document:**
```typescript
// Find all channel submissions for a document
const docId = 'uuid-here';
const viewerUrl = `https://recursive.eco/view/${docId}`;

const { data: tools } = await supabase
  .from('tools')
  .select('*')
  .ilike('tool_data->>url', `%${docId}%`);
```

**Unsubmitting from channels:**
```typescript
// Set is_active = "false" for all channel entries
const { data: tool } = await supabase
  .from('tools')
  .select('tool_data')
  .eq('id', toolId)
  .single();

await supabase
  .from('tools')
  .update({
    tool_data: { ...tool.tool_data, is_active: 'false' }
  })
  .eq('id', toolId);
```

---

## 📚 Related Projects

- **recursive-channels-fresh** - Wellness channel (copy auth FROM here)
- **jongu-tool-best-possible-self** - Journaling tool (copy auth TO here)
- **recursive-landing** - Homepage (copy story viewer pattern FROM here)

---

## 🤖 For Claude Code

When resuming, always start by reading **CLAUDE.md** for full context.

Key commands:
- Update context: "Update CLAUDE.md"
- Resume work: "Continue" or "Let's go"
- Check progress: "What's the current state?"

---

## 📖 License

CC-BY-SA-4.0 (same as other Recursive.eco projects)

---

**Built with curiosity. Shared with courage. Maintained with kindness. Exploring beauty.**

— PlayfulProcess
