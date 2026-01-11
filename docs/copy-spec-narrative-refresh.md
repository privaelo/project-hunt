# Garden Narrative Refresh — Copy Spec

**Goal:** Shift from catalog/utility feel → social/builder-centric feel
**Principle:** Keep "tool" as the noun when specificity matters. Shift framing to emphasize people and activity.

---

## Priority 1: Home Page (`app/(app)/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 153 | "Tools built inside Honda" | "What builders are making" | Lead with people, not inventory |
| 156 | "If it made work easier, it belongs here." | "See what's growing — or share your own." | Adds invitation, garden metaphor |
| 216 | "Have one? Share it in two lines." | "Working on something? Share it in two lines." | Activity framing |
| 223, 229, 236 | "Share something you built" | "Share what you're working on" | Present tense, active |
| 404 | "Nothing here yet." | "Quiet right now." | Implies temporary state |
| 406 | "Be the first to share a workaround that made work easier." | "Plant something?" | Playful, garden metaphor |
| 491 | "Focus area spotlight" | "For you" | Simpler, personal |
| 609 | "Newest tools" | "Recently shared" | Activity framing over inventory |
| 624 | "No tools yet." | "Nothing here yet" | Softer |

---

## Priority 1: Header/Nav (`components/header.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 114 | "Find Tools" | "Explore" | Discovery over query |
| 206 | "Share a Tool" | "Share" | Simpler, verb-forward |

---

## Priority 1: Empty States (Various Files)

### Home Page (`app/(app)/page.tsx`)
See above (lines 404, 406, 624)

### Profile Page (`app/(app)/profile/[id]/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 259 | "You have not shared any tools yet." | "Your garden is empty — what are you working on?" | Personal, inviting |
| 260 | "No shared tools yet." | "Nothing shared yet" | Neutral for others' profiles |
| 280 | "No tools in use yet." | "Not using anything yet" | Softer |

### Project Detail (`app/(app)/project/[id]/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 313 | "No comments yet. Be the first to start the discussion!" | "No comments yet — start the conversation?" | Shorter, inviting |

---

## Priority 2: About Page (`app/(app)/about/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 13 | "Tools built where the work happens" | "Where builders share what they're making" | People-first |
| 44 | "If it made work easier, it belongs here." | "If you built it, it belongs here." | Builder emphasis |

---

## Priority 2: Submission Flow (`app/(app)/submit/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 153 | "Share something you built" | "Share what you're working on" | Present tense |
| 157 | "If you built something to make work easier, it belongs here, even if it's rough, unfinished, or hacky." | "If you built something, it belongs here — rough, unfinished, or hacky." | Tighter, removes utility framing |

---

## Priority 2: Submission Confirm (`app/(app)/submit/confirm/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 119 | "Share something you built" | "Share what you're working on" | Match submit page |
| 142 | "Quick check before it goes live." | "Quick look before it's live." | Slightly warmer |
| 209 | "If you see a close match, it might be worth connecting or sharing notes." | "See something similar? Might be worth connecting." | Shorter |
| 251 | "Posting rough work is encouraged. You can always edit later." | "Rough is fine. You can always edit later." | Tighter |

---

## Priority 3: Onboarding (`app/onboarding/page.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 75 | "Welcome to Garden" | Keep as-is | Works fine |
| 77 | "Help us personalize your experience by answering a few quick questions." | "Quick questions to get you started." | Shorter |
| 84 | "What brings you to Garden?" | Keep as-is | Clear |
| 91 | "Looking for tools" | "See what others built" | Social framing |
| 98 | "Sharing tools" | "Share what I'm building" | Builder framing |
| 105 | "Both" | "Both" | Keep |

---

## Priority 3: Readiness Badge (`components/ReadinessBadge.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 44 | "This project is stable and usable today." | "Stable and ready to use." | Tighter |
| 46 | "Rough cut — sharing early. Expect rough edges. Feedback and questions are welcome." | "Work in progress — feedback welcome." | Much shorter |

---

## Priority 3: Chat/Search (`components/ChatInterface.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 73 | "Find Tools on Garden" | "Explore Garden" | Matches nav |
| 80 | "What are you trying to do?" | Keep as-is | Good |
| 81 | "Describe your problem and I'll help you find tools" | "Describe what you need — I'll help you find it" | Softer |

---

## Priority 3: Facepile/Adoption (`components/Facepile.tsx`)

| Line | Current | New | Notes |
|------|---------|-----|-------|
| 163 | "I use this" | "I'm using this" | Present continuous, more active |
| 145 | "You're using this · Click to remove" | "You're using this — click to remove" | Minor punctuation |
| 215 | "Used by {count} people" | Keep as-is | Clear |

---

## Do Not Change

These work well as-is:

- Form labels: "Title", "What did you build and why?"
- "In progress" / "Ready to use" status labels
- Focus area terminology
- Error messages
- Team creation flow
- Most tooltips

---

## Summary

| Priority | Surfaces | Effort |
|----------|----------|--------|
| P1 | Home headline, nav labels, key empty states | ~30 min |
| P2 | About page, submission flow | ~20 min |
| P3 | Onboarding, badges, chat, facepile | ~20 min |

Total: ~15-20 string changes across ~10 files.
