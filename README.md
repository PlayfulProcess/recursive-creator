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

### 2. Relational Schema (Not JSONB-heavy)
**Why:** Easier to query, navigate, and maintain
**What:** Proper columns for structure, JSONB only for flexible metadata

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

**Phase:** Phase 0 - Project Setup & Auth
**Progress:** Planning complete ✅
**Next:** Initialize Next.js + implement dual auth

---

## 🛠️ Next Steps

1. Initialize Next.js 15 project
2. Copy auth files from recursive-channels-fresh
3. Implement DualAuth component
4. Update Supabase email template
5. Test across email providers
6. Copy to other projects

**Timeline:** 3-4 days (auth), then features

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
