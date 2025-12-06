New feedback: Ijust found out that if I have a tablet with kids controls, it will need to be Youtube kids links, not Youtube links. So, we will need to be able to import all items from a kids youtube channel and add that as a button. The link is in this format: https://www.youtubekids.com/channel/UCRtrWCTxogJk4iN8vSjXgrg?hl=en-GB

If needed, fetch youtube kids docs to see if and how this is possible. 

# Session 10: Creator UX Improvements

**Date Started:** 2025-12-05
**Branch:** `feature/quick-wins`
**Status:** 🔄 In Progress

---

## Session Goals

Implement Priority 1 (Quick Wins) improvements to creator interface based on user feedback.

---

## User Decisions

1. **Export Format:** PDF (formatted nicely for sharing)
2. **Attribution Policy:** Save originals, allow user overrides, keep both versions (explore dual view later)
3. **Mobile Drag-and-Drop:** Rely on position modal, hide drag handles on mobile
4. **Items Window:** 2 items default, fullscreen option available

---

## Progress Tracker

### Priority 1: Quick Wins (~3 hours)

#### 1.1 Floating Save Button ⏳
- **Status:** Not Started
- **Time Estimate:** 30 minutes
- **Description:** Sticky save button appears when unsaved changes exist
- **Files:** `app/dashboard/sequences/new/page.tsx`

#### 1.2 Submit to Channel Button ⏳
- **Status:** Not Started
- **Time Estimate:** 45 minutes
- **Description:** Replace "Update Published" with cleaner modal + channel submission
- **Files:** `app/dashboard/sequences/new/page.tsx`

#### 1.3 Position Click Modal ⏳
- **Status:** Not Started
- **Time Estimate:** 1 hour
- **Description:** Click position number → modal to change position with quick actions
- **Files:** `app/dashboard/sequences/new/page.tsx`

#### 1.4 Drive File Title in Viewer ⏳
- **Status:** Not Started
- **Time Estimate:** 45 minutes
- **Description:** Display Drive file titles in viewer (like YouTube videos)
- **Files:** `components/viewers/SequenceViewer.tsx`, `recursive-landing/view.html`

---

## Implementation Notes

### Session 10.1 - Setup
- Created SESSION_10.md tracker
- Creating `feature/quick-wins` branch
- Starting with 1.1 (Floating Save Button)

---

## Commits

- [ ] Initial setup and branch creation
- [ ] 1.1 - Floating save button implemented
- [ ] 1.2 - Submit to channel modal implemented
- [ ] 1.3 - Position modal implemented
- [ ] 1.4 - Drive title in viewer implemented
- [ ] Build tested and passing
- [ ] Merged to main

---

## Testing Checklist

- [ ] Floating save button appears on changes
- [ ] Floating save button saves correctly
- [ ] Submit to channel modal shows after publish
- [ ] Channel submission opens with pre-filled data
- [ ] Position modal opens on number click
- [ ] Position modal "Move to Start/End" works
- [ ] Position modal position input works
- [ ] Drive file titles display in viewer
- [ ] All features work on mobile
- [ ] Build passes
- [ ] No console errors

---

## Next Steps After Quick Wins

Priority 2: Core Features (if time permits in this session)
- Drive file title upload + author field
- Items expandable view
- Mobile drag-and-drop refinements

---

## Notes

- User may resume in multiple sittings
- Update this file after each feature completion
- Keep detailed notes for context when resuming


# Notes for extra features:

User original feedback on commit 5fa15fc to main1:

I moved the session file to the project root recursive-creator\SESSION_10.md


The changes you made in creator are very good.

What I would change:
1) IF not too complext, upload title of Drive file as well. When coming from drive, add an author field that is pre-filled with auth email, but that user can edit. 
2) WHen I click the numbers of each item, a pop up appears in which I can insert a new number for that item so I dont need to keep dragging. In the modal there will be also an option to "move to the end" or "move to the beggining". 
3) I also think "Update published button is not necessary because when I save what already has been published, it will update published automatically. SO I would replace the Update Published after Published to "SUbmit to channel", when the person click, it will pop up the content that is being displayed in the page (I see a need to clean up the page now)
Published Successfully!
Your content is now live at: https://recursive.eco/view/0116fc49-9e89-44b0-a838-26d4391c5d2b

📢 Share with the Community
Submit your content to the Kids Stories channel so other families can discover it!

💡 You can also share links from trusted sources like Goodreads (book recommendations), Claude/ChatGPT (AI tools), Amazon (products), or Google Drive (shared files).

📢 Submit to Channel →
Opens in channels.recursive.eco with your content pre-filled. You can review before submitting.
ANd then the person can click again to submit. 

4) I also dont see a need for this full box:
✅ Project Published!
Your project is now live. Share this link:

https://recursive.eco/view/0116fc49-9e89-44b0-a838-26d4391c5d2b
📋 Copy
🔗 View
⚠️ This link is public. Anyone with it can view your project.

I think we can just have a button for view together with the other buttons, maybe a pop up showing this content that pops up after the project has been published? 

5) One thing that is hard in the creator is that when I make a change, I need to scroll all the way down to save. Is it possible to have a save button hovering over somewhere whenever I have unsaver versions? This way people might actually see the live preview that is in the bottom now...

6) In Import Content, I want to be able to import and export things. I want to be able to export the list of links (csv) or the whole program (PDF? or printable html?) that trigger with two different buttons. The program should have title description and all the information we have for each file (thumbnails, duration... etc)

7) I also think that the items should be displayed in a window that fits just the first two, but can augment to fullscreen. 

8) Mobile drag and drop is not really working. Maybe if the item above of the pop up of the position number works, we just hide the drag and drop from mobile? But if it is easy to implement, I would implement it in mobile... I see that when I touch the hamburger icon, it "feels" something, it trembles, but it just not drag... 


In the viewer of recursive_landing:

1) I also want the title and author of the Drive files to be displayed in the viewer of recursive_landing. Just like the Youtube things. 
2) The program in the viewer will later reflect what we are building in creator. iw ant to test there first. I am debating how to make atribution right (give original creator names, links etc) and how to make it adjustable for people to edit it... Right now, creators of list can overwrite everythign and leave the video without the creator name and I am not fully comfortable with that. But if it is their video, it might be ok, still unsure and would like recos. 

Implementation Plan Overview

  ✅ Successfully Merged to Main

  - Drag-and-drop refactor
  - Security patches (CVE-2025-55182)
  - Next.js 15.4.8, React 19.1.2

  🎯 Priority 1: Quick Wins (~3 hours)

  1. Floating Save Button - Always visible, no scrolling needed
  2. Submit to Channel Button - Replace "Update Published" with cleaner workflow
  3. Position Click Modal - Click number → change position, move to start/end
  4. Drive Title in Viewer - Show file names for Drive images

  🔨 Priority 2: Core Features (~3-4 hours)

  1. Drive Title Upload + Author Field - Fetch file names, pre-fill author with email
  2. Items Expandable View - Show 2 items by default, expand to fullscreen
  3. Mobile Drag-and-Drop Fix - Improve touch sensors OR hide on mobile

  🚀 Priority 3: Advanced (~4-5 hours)

  1. Export CSV/PDF - Export link list or printable program
  2. Attribution Policy - Lock original creators, allow display title edits

  ---
  📊 Estimated Timeline

  - Phase 1 (Quick Wins): 1-2 days
  - Phase 2 (Core): 2-3 days
  - Phase 3 (Advanced): 1 week

  Total: ~10-12 hours of development spread over 1-2 weeks

  ---
  ❓ Questions for You

  Before I start implementing:

  1. Export Format: PDF, HTML, or both? Any specific layout preferences?
  2. Attribution: Should original YouTube creator names be locked, or just recommended?
  3. Mobile: Should I fix drag-and-drop or just hide it and rely on position modal?
  4. Items Window: Is showing first 2 items by default the right size?

  Want me to start with Priority 1 (Quick Wins)? These are high-impact, low-complexity improvements that'll ship quickly!

> SO  , can  you build a new md file in the root of recursive.eco saying "session 10" that wie will keep updating with status as I might not be      
 able to run through this in one sitting? Than start with the quick wins. As far as your question, I think the program should look pretty and be     
easy to save and share. I think pdf is better as long as you can format it right. 2) I think the original titles and names shouold always be         
saved and potentially overwritten by the user, but we can always go back to the original if needed (or if the user wants to see it, maybe the        
idea of having one program with original stuff and another with overwritten is one thing that we might explore?) 3) lets rely in the rely 
position modal for now, I dont think a lot of folks will edit a lot in mobile, creating is more for desktop. 4) you tell me, maybe it is 
different for mobile and desktop, but I think 2 will work for now, so ont overthink it, as long as we have optional fullscreen 

● Perfect! Let me create the session tracker and start implementing:

● Write(SESSION_10.md)
  ⎿  Wrote 1 lines to SESSION_10.md
     # Session 10: Creator UX Improvem
