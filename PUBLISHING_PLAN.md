# Publishing Plan: recursive-creator → recursive-landing

> **Goal:** Allow creators to publish sequences with public URLs, even if not featured on channels
> **Philosophy:** Public by default, community moderation (like Facebook/YouTube)
> **Timeline:** Phase 8 (post-MVP enhancement)

---

## Content Moderation Recommendation

### Option A: No Pre-Approval ✅ RECOMMENDED

**How it works:**
- Content is public immediately when creator clicks "Publish"
- Anyone with the URL can view (but not searchable/featured)
- Community reports inappropriate content
- Admin reviews reports and removes if needed
- **Like:** Facebook, YouTube, Twitter, Medium

**Pros:**
- ✅ Fast for creators (no waiting)
- ✅ Scales well (no admin bottleneck)
- ✅ Encourages creation
- ✅ Standard for user-generated content platforms
- ✅ Less work for you (reactive vs proactive)

**Cons:**
- ⚠️ Brief window where inappropriate content could exist
- ⚠️ Requires reporting mechanism
- ⚠️ You're responsible for response to reports

**Risk Mitigation:**
- Clear terms of service (no hate speech, illegal content, etc.)
- Easy reporting button on viewer
- Fast response to reports (24-48 hours)
- Ability to hide content while reviewing
- User can be banned if repeatedly violates terms

### Option B: Pre-Approval (NOT Recommended for MVP)

**How it works:**
- Content stays private until admin approves
- Admin reviews every submission
- Only then does it get a public URL

**Pros:**
- ✅ Safer (no inappropriate content goes live)
- ✅ Quality control

**Cons:**
- ❌ Slow for creators (waiting for approval)
- ❌ Admin bottleneck (you have to review everything)
- ❌ Discourages experimentation
- ❌ Doesn't scale (200 users × multiple projects = too much work)

**When to use:** App stores, highly regulated industries, platforms with strict quality standards

---

## My Recommendation: Start with Option A

**Why:**
1. **Standard practice** - Facebook, YouTube, Instagram all work this way
2. **You're small scale** - 200 max users means low risk
3. **Family-friendly content** - Your users are parents making kids stories
4. **Faster iteration** - No approval queue means more creation
5. **Post-moderation scales** - Only review what's reported

**Legal perspective:**
- Under Section 230 (US), you're generally not liable for user content
- You ARE responsible for responding to reports promptly
- Having clear terms of service helps
- Reporting mechanism shows good faith effort

---

## Implementation Plan

### Phase 8.1: Public Viewer Route (recursive-landing)

**Create viewer route:**
```
Route: /view/[id]
URL: https://recursive.eco/view/abc-123-def
```

**Features:**
- Fetches sequence from Supabase by ID
- Checks if `is_published: true` (new field)
- Shows 404 if unpublished or doesn't exist
- Uses existing SequenceViewer component
- Mobile-optimized, fullscreen support

**Technical:**
```typescript
// recursive-landing/pages/view/[id].tsx
export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('id', id)
    .eq('tool_slug', 'sequence')
    .single();

  // Check if published
  if (!data || data.document_data.is_published !== 'true') {
    return { notFound: true };
  }

  return {
    props: { sequence: data }
  };
}
```

**Time estimate:** 2-3 hours

---

### Phase 8.2: Publish Toggle (recursive-creator)

**Update dashboard save flow:**
1. Add "Publish" checkbox or toggle
2. Default: OFF (draft mode, private)
3. When ON: `is_published: 'true'` in document_data
4. Show public URL after saving: `https://recursive.eco/view/{id}`

**UI Changes:**
```tsx
// In /dashboard/sequences/new
const [isPublished, setIsPublished] = useState(false);

// In save function
document_data: {
  ...
  is_published: isPublished ? 'true' : 'false',
  published_at: isPublished ? new Date().toISOString() : null
}

// After save success
{isPublished && (
  <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded-lg">
    <p className="text-green-400 mb-2">✅ Published!</p>
    <p className="text-sm text-gray-300 mb-2">Share this link:</p>
    <code className="bg-gray-800 px-3 py-2 rounded block">
      https://recursive.eco/view/{sequenceId}
    </code>
    <p className="text-xs text-gray-500 mt-2">
      ⚠️ This link is public. Anyone with it can view your project.
    </p>
  </div>
)}
```

**Dashboard list:**
- Show published status (🌐 Public / 📝 Draft)
- Toggle publish/unpublish
- Copy link button for published items

**Time estimate:** 2 hours

---

### Phase 8.3: Content Reporting (Post-Moderation)

**Add report button to viewer:**
```tsx
// In viewer (recursive-landing)
<button
  onClick={() => setShowReportModal(true)}
  className="fixed top-4 right-4 px-3 py-2 bg-red-600 text-white rounded-lg text-sm"
>
  🚩 Report
</button>

// Report modal
<ReportModal
  contentId={sequence.id}
  onSubmit={async (reason) => {
    await supabase.from('content_reports').insert({
      content_id: sequence.id,
      content_type: 'sequence',
      reason,
      reported_at: new Date().toISOString()
    });
  }}
/>
```

**Admin dashboard:**
- `/admin/reports` - shows all reported content
- Preview reported content
- Hide/Remove/Dismiss actions
- Optional: ban user if repeat offender

**Time estimate:** 3-4 hours

---

### Phase 8.4: Terms of Service & Guidelines

**Create simple ToS:**
```markdown
# Content Guidelines

Your sequences are public and must follow these rules:

✅ Allowed:
- Family-friendly content
- Educational material
- Personal creative works
- Children's stories

❌ Not Allowed:
- Hate speech or harassment
- Illegal content
- Explicit/adult content
- Spam or scams
- Copyright violations (use your own images/videos)

Violations may result in content removal or account suspension.
```

**Where to show:**
- Checkbox during signup: "I agree to the content guidelines"
- Link in footer of recursive-creator
- Next to "Publish" button

**Time estimate:** 1 hour (writing + placement)

---

## Data Structure Changes

### Add to document_data:

```json
{
  "title": "My Story",
  "description": "...",
  "items": [...],

  // NEW FIELDS
  "is_published": "true",      // "true" = public URL works, "false" = private
  "published_at": "2025-11-13T...",  // When published
  "is_featured": "false",      // Separate from published - admin can feature
  "featured_at": null,
  "reported_count": 0,         // Number of reports
  "hidden_by_admin": "false"   // Admin can hide without deleting
}
```

**Migration:** None needed! JSONB is flexible. Just start using these fields.

---

## User Journey

### Creating & Publishing:

1. **Creator creates sequence** in recursive-creator
2. **Clicks "Publish"** toggle (optional, default OFF)
3. **Saves project**
4. **Gets public URL:** `https://recursive.eco/view/abc123`
5. **Shares link** with family, friends, social media
6. **Content is live** - no approval needed
7. **Optional:** Submits to channels for featuring (separate approval)

### Reporting Flow:

1. **Viewer finds inappropriate content**
2. **Clicks "🚩 Report" button**
3. **Selects reason** (inappropriate, spam, etc.)
4. **Report saved** to database
5. **You (admin) review** in dashboard
6. **Take action:** Hide, remove, or dismiss
7. **Optional:** Contact creator, issue warning

---

## Rollout Strategy

### Phase 8.1 (MVP - Start Here)
- ✅ Public viewer route in recursive-landing
- ✅ Publish toggle in recursive-creator
- ✅ Show public URL after publish
- ✅ Terms of service page

**Time:** ~5-6 hours
**Risk:** Low (manual moderation for first few weeks)

### Phase 8.2 (Enhanced)
- ✅ Report button + modal
- ✅ Admin reports dashboard
- ✅ Hide/remove actions

**Time:** ~3-4 hours
**When:** After first 10-20 published projects

### Phase 8.3 (Scaling)
- ✅ Automated content filtering (image moderation API)
- ✅ User reputation system
- ✅ Featured content workflow (admin approval for channels)

**Time:** ~8-10 hours
**When:** After 50+ active users

---

## Safety Best Practices

### 1. Clear Expectations
- Show "This will be public" warning before publish
- Terms of service linked prominently
- Examples of appropriate content

### 2. Easy Reporting
- Obvious report button
- Simple form (don't require login to report)
- Thank you message after report

### 3. Fast Response
- Check reports daily (at start)
- Respond within 24-48 hours
- Hide content immediately if clearly violating

### 4. Communication
- Email creators when content is removed
- Explain why (link to specific rule)
- Opportunity to appeal

### 5. Escalation Path
- First violation: Warning
- Second violation: Temporary suspension
- Third violation: Permanent ban
- Severe violations: Immediate ban

---

## FAQ for Creators

**Q: Who can see my project?**
A: If published, anyone with the link. It's not searchable or listed anywhere unless you submit it to a channel.

**Q: Can I unpublish later?**
A: Yes! Toggle "Published" off in your dashboard and the URL will stop working.

**Q: How do I get featured on channels?**
A: Submit your published project to a channel. We'll review it for featuring (separate approval).

**Q: What if someone shares my link without permission?**
A: Unpublish it or contact us. But remember: publishing means it's public.

**Q: Can I edit after publishing?**
A: Yes! Your changes update the public URL immediately.

---

## Comparison: Published vs Featured

| | Published | Featured |
|---|---|---|
| **URL works** | ✅ Yes | ✅ Yes |
| **Discoverable** | ❌ No | ✅ Yes (on channel) |
| **Approval needed** | ❌ No | ✅ Yes (admin review) |
| **Can share link** | ✅ Yes | ✅ Yes |
| **Listed on site** | ❌ No | ✅ Yes |

**Key insight:** Published = public but not promoted. Featured = actively shown to users.

---

## Legal Note

**I'm not a lawyer, but generally:**
- User-generated content platforms use post-moderation (Option A)
- Section 230 protects platforms from user content liability (US)
- You must respond to legitimate complaints
- Having terms of service + reporting mechanism shows good faith
- COPPA doesn't apply (your users are adults, not children)

**Recommend:**
- Have a lawyer review your terms of service
- Include DMCA takedown procedure (copyright)
- Consider getting liability insurance if scaling

---

## Next Steps

1. **Decide:** Pre-approval or post-moderation?
2. **If post-moderation (recommended):**
   - Implement Phase 8.1 (viewer + publish toggle)
   - Write terms of service
   - Add reporting in Phase 8.2
3. **Test with trusted users first** (friends/family)
4. **Monitor closely** for first few weeks
5. **Iterate based on feedback**

**Timeline:** ~1-2 weeks for full implementation

---

**Ready to implement?** Let me know and I'll start with Phase 8.1!
