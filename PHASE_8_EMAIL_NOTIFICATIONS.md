# Phase 8 Enhancement: Email Notifications & Dashboard URLs

> **Added features based on user feedback:**
> 1. Email notification when someone publishes
> 2. Show public URL in dashboard for published projects

---

## Feature 1: Email Notifications on Publish

### Option A: Supabase Database Webhooks (Recommended)

**How it works:**
1. User publishes a project (sets `is_published: 'true'`)
2. Supabase webhook triggers on UPDATE
3. Sends HTTP POST to edge function
4. Edge function sends email to admin

**Setup:**

#### Step 1: Create Edge Function

```bash
# Create Supabase edge function
cd supabase
mkdir -p functions/notify-admin-publish
```

**File: `supabase/functions/notify-admin-publish/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ADMIN_EMAIL = 'pp@playfulprocess.com'; // Your email
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  try {
    const { record, old_record } = await req.json();

    // Check if is_published changed from false to true
    const wasPublished = old_record?.document_data?.is_published === 'false';
    const isNowPublished = record?.document_data?.is_published === 'true';

    if (!wasPublished || !isNowPublished) {
      return new Response('Not a publish event', { status: 200 });
    }

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Recursive Creator <noreply@recursive.eco>',
        to: [ADMIN_EMAIL],
        subject: '🎉 New Project Published!',
        html: `
          <h2>New Project Published</h2>
          <p><strong>Title:</strong> ${record.document_data.title}</p>
          <p><strong>Description:</strong> ${record.document_data.description || 'No description'}</p>
          <p><strong>Items:</strong> ${record.document_data.items?.length || 0}</p>
          <p><strong>Published by:</strong> ${record.user_id}</p>
          <br>
          <p><a href="https://recursive.eco/view/${record.id}">View Project</a></p>
          <p><a href="https://creator.recursive.eco/dashboard">Go to Dashboard</a></p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send email');
    }

    return new Response('Email sent', { status: 200 });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

#### Step 2: Deploy Edge Function

```bash
supabase functions deploy notify-admin-publish
```

#### Step 3: Create Database Webhook

**In Supabase Dashboard:**
1. Go to Database → Webhooks
2. Click "Create a new hook"
3. Configure:
   - **Name:** notify-admin-on-publish
   - **Table:** user_documents
   - **Events:** UPDATE
   - **HTTP Request:**
     - Method: POST
     - URL: `https://[PROJECT].supabase.co/functions/v1/notify-admin-publish`
     - Headers: `Authorization: Bearer [ANON_KEY]`

#### Step 4: Add Environment Variable

```bash
# In Supabase edge function secrets
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

**Get Resend API Key:**
1. Sign up at https://resend.com (free tier: 100 emails/day)
2. Create API key
3. Add to Supabase secrets

---

### Option B: Client-Side API Call (Simpler, Less Reliable)

**Alternative if you don't want to set up webhooks:**

```typescript
// In /app/dashboard/sequences/new/page.tsx
// After successful save when is_published changes to true

const sendPublishNotification = async (projectData) => {
  try {
    await fetch('/api/notify-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectData.id,
        title: projectData.document_data.title,
        userId: user.id
      })
    });
  } catch (err) {
    // Silent fail - don't block user if email fails
    console.error('Failed to send notification:', err);
  }
};

// Call after successful publish
if (isPublished && !editingId) {
  await sendPublishNotification(insertData);
}
```

**File: `/app/api/notify-publish/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { projectId, title, userId } = await req.json();

  // Send email via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Recursive Creator <noreply@recursive.eco>',
      to: ['pp@playfulprocess.com'],
      subject: '🎉 New Project Published!',
      html: `
        <h2>New Project Published</h2>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Project ID:</strong> ${projectId}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <br>
        <p><a href="https://recursive.eco/view/${projectId}">View Project</a></p>
      `,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Environment Variable:**
```env
# .env.local and Vercel
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

## Feature 2: Show Public URL in Dashboard

### Update Dashboard Page

**File: `/app/dashboard/page.tsx`**

Add URL display for published projects:

```tsx
{sequences.map((sequence) => (
  <div key={sequence.id} className="border border-gray-200 rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">
          {sequence.document_data.title}
        </h3>

        {/* NEW: Show public URL if published */}
        {sequence.document_data.is_published === 'true' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              🌐 Published
            </span>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={`https://recursive.eco/view/${sequence.id}`}
                readOnly
                className="flex-1 text-xs px-2 py-1 bg-gray-50 border border-gray-300 rounded font-mono"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://recursive.eco/view/${sequence.id}`);
                  // Show toast or alert
                  alert('Link copied!');
                }}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Copy link"
              >
                📋 Copy
              </button>
              <a
                href={`https://recursive.eco/view/${sequence.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                title="Open in new tab"
              >
                🔗 Open
              </a>
            </div>
          </div>
        )}

        {sequence.document_data.description && (
          <p className="text-sm text-gray-600 mt-1">
            {sequence.document_data.description}
          </p>
        )}

        {/* Rest of existing code... */}
      </div>
    </div>
  </div>
))}
```

### Update Sequence Creator Page

**File: `/app/dashboard/sequences/new/page.tsx`**

Show URL after publishing:

```tsx
// Add state for showing URL
const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

// In handleSaveDraft, after successful save
if (insertError) throw insertError;

setSuccess(true);
console.log('✅ Project created successfully:', insertData.id);

// If published, show URL
if (isPublished) {
  setPublishedUrl(`https://recursive.eco/view/${insertData.id}`);
}

// Transition to edit mode
router.push(`/dashboard/sequences/new?id=${insertData.id}`);
```

**UI after save:**

```tsx
{/* Success message with URL */}
{success && publishedUrl && (
  <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
    <h3 className="text-green-400 font-semibold mb-2">
      ✅ Project Published!
    </h3>
    <p className="text-sm text-gray-300 mb-3">
      Your project is now live. Share this link:
    </p>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={publishedUrl}
        readOnly
        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
        onClick={(e) => e.target.select()}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(publishedUrl);
          alert('Link copied to clipboard!');
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        📋 Copy
      </button>
      <a
        href={publishedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
      >
        🔗 View
      </a>
    </div>
    <p className="text-xs text-gray-500 mt-2">
      ⚠️ This link is public. Anyone with it can view your project.
    </p>
  </div>
)}
```

---

## Implementation Checklist

### Email Notifications:
- [ ] Sign up for Resend account (https://resend.com)
- [ ] Get API key
- [ ] Choose Option A (webhooks) or B (API route)
- [ ] If Option A:
  - [ ] Create edge function
  - [ ] Deploy edge function
  - [ ] Configure database webhook
  - [ ] Add RESEND_API_KEY secret
- [ ] If Option B:
  - [ ] Create `/api/notify-publish` route
  - [ ] Add RESEND_API_KEY to .env.local
  - [ ] Add RESEND_API_KEY to Vercel env vars
  - [ ] Call API after publish
- [ ] Test with real publish event
- [ ] Check admin email receives notification

### Dashboard URL Display:
- [ ] Update `/app/dashboard/page.tsx`
  - [ ] Add published badge
  - [ ] Add URL input field
  - [ ] Add copy button
  - [ ] Add open button
- [ ] Update `/app/dashboard/sequences/new/page.tsx`
  - [ ] Show success message with URL
  - [ ] Add copy button
  - [ ] Add view button
- [ ] Test URL display for published projects
- [ ] Test URL display for unpublished projects (should not show)
- [ ] Test copy functionality
- [ ] Test open in new tab functionality

---

## Email Service Comparison

| Service | Free Tier | Setup Difficulty | Recommended |
|---------|-----------|------------------|-------------|
| **Resend** | 100/day | Easy | ✅ Yes |
| SendGrid | 100/day | Medium | ⚠️ Ok |
| Mailgun | 100/day | Medium | ⚠️ Ok |
| Supabase Email | Included | Hard | ❌ No (limited) |

**Recommendation:** Use Resend - it's designed for developers and has the simplest API.

---

## Testing Plan

1. **Create test project** in recursive-creator
2. **Publish it** (toggle publish on)
3. **Check email** - did you receive notification?
4. **Check dashboard** - does URL show?
5. **Click copy button** - does it copy?
6. **Click open button** - does it open viewer?
7. **Create unpublished project** - URL should NOT show

---

## Time Estimate

- **Email notifications:** 1-2 hours (including Resend setup)
- **Dashboard URL display:** 1 hour
- **Testing:** 30 minutes

**Total:** ~2.5-3.5 hours

---

## Next Steps

1. Choose email notification method (Option A or B)
2. Set up Resend account
3. Implement email notifications
4. Implement dashboard URL display
5. Test end-to-end
6. Deploy to production

Ready to implement? Let me know which option you prefer for email notifications!
