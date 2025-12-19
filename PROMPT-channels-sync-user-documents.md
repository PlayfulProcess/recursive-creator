# Claude Code Prompt: Sync Channels Submissions to user_documents

Copy this prompt to use with Claude Code in the recursive-channels-fresh project:

---

## Task: Update Channels to Sync Submission Data Back to user_documents

### Background

When users create content in recursive-creator, data is stored in the `user_documents` table. When they submit to channels, the channels app writes to the `tools` table. This creates two sources of truth.

**Goal:** When a user submits/updates their content on channels, also update the corresponding `user_documents` record so recursive-creator always has the latest data.

### What Needs to Happen

When a tool is submitted via SubmitToolModal (or wherever submissions are handled):

1. **Extract the doc_id** from the URL being submitted
   - URL format: `https://recursive.eco/view/{doc_id}`
   - Parse to get the UUID

2. **Update user_documents** with the submission data
   ```typescript
   // After successfully inserting/updating the tools table,
   // also update user_documents.document_data

   const docId = extractDocIdFromUrl(toolUrl); // Extract UUID from URL

   if (docId) {
     await supabase
       .from('user_documents')
       .update({
         document_data: {
           ...existingDocumentData,  // Preserve existing fields
           // Update with submission data:
           title: submittedTitle,
           description: submittedDescription,
           creator_name: submittedBy,
           creator_link: creatorLink,
           thumbnail_url: thumbnail,
           hashtags: category, // category in tools = hashtags in user_documents
         }
       })
       .eq('id', docId);
   }
   ```

3. **Field Mapping** (tools → user_documents.document_data):
   - `tool_data.name` → `document_data.title`
   - `tool_data.description` → `document_data.description`
   - `tool_data.submitted_by` → `document_data.creator_name`
   - `tool_data.creator_link` → `document_data.creator_link`
   - `tool_data.thumbnail` → `document_data.thumbnail_url`
   - `tool_data.category` → `document_data.hashtags`

### Where to Look

1. Find where tools are submitted/created (likely `SubmitToolModal.tsx` or similar)
2. Find the submit handler function
3. After the successful `tools` table insert/update, add the `user_documents` update

### Helper Function Needed

```typescript
function extractDocIdFromUrl(url: string): string | null {
  // Match URLs like:
  // https://recursive.eco/view/{uuid}
  // https://dev.recursive.eco/view/{uuid}
  const match = url.match(/\/view\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
}
```

### Important Notes

1. **Preserve existing document_data** - Don't overwrite fields that channels doesn't know about (like `items`, `is_published`, `creator_id`)
2. **Only update if doc_id is valid** - Some tools might not be from recursive-creator
3. **Error handling** - If user_documents update fails, don't block the tools submission (log error but continue)
4. **This should work for both new submissions and edits**

### Testing

After implementing:
1. Submit a project from recursive-creator to a channel
2. Edit the title/description in the channel submission form
3. Go back to recursive-creator dashboard
4. The card should show the updated title/description (without needing to read from tools table)

---

