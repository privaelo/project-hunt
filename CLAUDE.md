# CLAUDE.md — Garden (project-hunt)

## What This Is

**Garden** is an internal tool-sharing platform for the workplace. Employees can share scripts, dashboards, and automations they've built, upvote and comment on others' work, and adopt tools they find useful. There is also an AI-powered chat assistant for discovering tools via natural language.

The app title in `app/layout.tsx` is "Garden"; the repo is named `project-hunt`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI, Lucide React |
| Backend/DB | Convex (real-time backend-as-a-service) |
| Auth | AWS Cognito via AWS Amplify, bridged to Convex via OIDC |
| AI / RAG | `@convex-dev/agent`, `@convex-dev/rag`, Amazon Bedrock (Claude Haiku), OpenAI embeddings |
| Analytics | PostHog (proxied via Next.js rewrites; initialized in `instrumentation-client.ts`) |
| Animation | Motion (Framer Motion v12) |
| Rich Text | `react-quill-new` (editor), `dompurify` (sanitizer), `react-markdown` (renderer) |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable` (media reordering) |
| Email | AWS SES v2 (`@aws-sdk/client-sesv2`) for transactional email delivery |
| Toasts | Sonner (replaces `alert()` and silent failures throughout) |

---

## Project Structure

```
project-hunt/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout — sets up fonts, ConvexClientProvider, Header, Sonner Toaster
│   ├── globals.css             # Global styles (Tailwind entry)
│   ├── (app)/                  # Route group: authenticated/main app
│   │   ├── layout.tsx          # Protected layout — OnboardingGuard, Sidebar, auth gating
│   │   ├── OnboardingGuard.tsx # Redirects to /onboarding if not completed
│   │   ├── page.tsx            # Home feed (paginated project list)
│   │   ├── about/page.tsx
│   │   ├── create-team/page.tsx
│   │   ├── create-thread/page.tsx  # Standalone thread creation page
│   │   ├── profile/[id]/page.tsx   # User profile — tabs for Built/Uses; shows department
│   │   ├── project/[id]/page.tsx       # Project detail
│   │   ├── project/[id]/edit/page.tsx  # Project edit form
│   │   ├── space/[id]/page.tsx         # Focus area/space feed (tabs: Projects + Threads)
│   │   ├── thread/[id]/page.tsx        # Thread detail + comments
│   │   └── submit/                     # Multi-step project submission
│   │       ├── page.tsx
│   │       └── confirm/page.tsx
│   ├── callback/page.tsx       # OAuth callback
│   ├── onboarding/page.tsx     # New user onboarding (collects userIntent)
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── useCurrentUser.ts       # Hook: returns { isAuthenticated, user }
│
├── components/
│   ├── ui/                     # shadcn/ui base components (do not modify manually)
│   │   └── sonner.tsx          # Custom Sonner toaster wrapper with Lucide icons
│   ├── auth/AuthPage.tsx       # Auth UI wrapper
│   ├── chat/                   # AI chat components (ProjectCardsDisplay, SearchingIndicator)
│   ├── ConvexClientProvider.tsx # Convex + Cognito auth bridge
│   ├── app-sidebar.tsx         # Main navigation sidebar
│   ├── header.tsx              # Top navigation bar
│   ├── LandingPage.tsx         # Public landing page component
│   ├── ProjectRow.tsx          # Project list item card (ArrowBigUp upvote icon)
│   ├── ProjectMediaCarousel.tsx # Media carousel for project detail
│   ├── ProjectFileDownload.tsx # File download section on project detail
│   ├── SimilarProjectsPreview.tsx # Similar projects shown on /submit
│   ├── Facepile.tsx            # Adopter avatar group
│   ├── ReadinessBadge.tsx      # Readiness status badge
│   ├── SpaceIcon.tsx           # Renders a space's emoji icon or initial fallback
│   ├── SpacePicker.tsx         # Combobox for selecting a focus area (space)
│   ├── CreateThreadForm.tsx    # Inline form for creating a thread in a space
│   ├── ThreadRow.tsx           # Thread list item card
│   ├── CommentThread.tsx / CommentForm.tsx  # Shared comment UI for both projects and threads
│   ├── ChatInterface.tsx / MessageList.tsx  # AI chat UI
│   ├── LinksEditor.tsx         # Links editing UI for project forms
│   ├── RichTextEditor.tsx / RichTextContent.tsx
│   ├── MediaUploadField.tsx / FileUploadField.tsx
│   └── ...
│
├── convex/                     # Convex backend (functions + schema)
│   ├── schema.ts               # Database schema (source of truth)
│   ├── convex.config.ts        # Convex component registration (rag, agent, migrations)
│   ├── auth.config.ts          # OIDC provider config (Cognito)
│   ├── auth.ts                 # Convex auth helpers
│   ├── functions.ts            # Shared internal mutation helper
│   ├── http.ts                 # HTTP router (currently empty)
│   ├── crons.ts                # Scheduled jobs (hot scores, weekly digests, email queue drainer)
│   ├── projects.ts             # Proxy re-exporter for convex/projects/*
│   ├── projects/               # Project domain — split by responsibility
│   │   ├── lifecycle.ts        # create, update, delete, confirm, backfill
│   │   ├── listing.ts          # list, getById, paginated queries, getTopProjectsBySpace
│   │   ├── engagement.ts       # upvotes, adoptions, views, hot score refresh
│   │   ├── search.ts           # full-text and semantic search
│   │   ├── media.ts            # file/media upload/delete/reorder
│   │   ├── migrations.ts       # data migrations
│   │   └── helpers.ts          # calculateHotScore, enrichProjects
│   ├── emails.ts               # Email sending (SES v2), queue drainer, user preferences
│   ├── emailRenderer.ts        # HTML + plain-text email templates (weekly digest)
│   ├── digests.ts              # Weekly digest orchestrator, per-user data gathering, enqueuing
│   ├── threads.ts              # Threads feature: CRUD, upvotes, comments, hot score
│   ├── ragbot.ts               # AI agent (ProjectFinder) + thread management
│   ├── rag.ts                  # RAG component init
│   ├── tools.ts                # Agent tools: searchProjects, showProjects
│   ├── users.ts                # User management (ensureUser, getCurrentUser, getEmailRecipient, department sync)
│   ├── teams.ts
│   ├── comments.ts             # Project comments
│   ├── notifications.ts
│   ├── focusAreas.ts           # Focus area CRUD + follow/unfollow, member count
│   ├── admin.ts
│   ├── seed.ts
│   ├── playground.ts
│   └── _generated/             # Auto-generated by Convex CLI — never edit manually
│
├── lib/
│   ├── types.ts                # Centralized shared TypeScript types
│   ├── utils.ts                # Utility functions (cn, etc.)
│   ├── amplify-config.ts       # AWS Amplify configuration (Cognito)
│   └── fileSize.ts
│
├── hooks/
│   └── use-mobile.ts
│
├── instrumentation-client.ts   # PostHog client initialization (Next.js instrumentation)
├── public/                     # Static assets
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── components.json             # shadcn/ui config
└── package.json
```

---

## Development Commands

```bash
# Frontend (Next.js)
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # Run ESLint

# Backend (Convex) — run in parallel with Next.js
npx convex dev     # Start Convex dev server (watches convex/ directory)
npx convex deploy  # Deploy Convex backend to production
```

Both `npm run dev` and `npx convex dev` must be running simultaneously during local development.

---

## Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_CONVEX_URL=          # Convex deployment URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
NEXT_PUBLIC_COGNITO_DOMAIN=
NEXT_PUBLIC_COGNITO_REDIRECT_URI=
NEXT_PUBLIC_COGNITO_SIGN_OUT_URI= # Optional; falls back to origin of REDIRECT_URI
NEXT_PUBLIC_POSTHOG_KEY=         # PostHog project API key
```

**Convex backend** (set via Convex dashboard or `convex env set`):
```
COGNITO_REGION=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
AWS_REGION=                     # AWS region (shared by Bedrock, SES, etc.)
AWS_ACCESS_KEY_ID=              # IAM access key (shared by Bedrock, SES, etc.)
AWS_SECRET_ACCESS_KEY=          # IAM secret key (shared by Bedrock, SES, etc.)
SES_FROM_EMAIL=                 # Verified SES sender address (e.g., garden@company.com)
```

---

## Database Schema (convex/schema.ts)

Key tables and their purpose:

| Table | Purpose |
|---|---|
| `projects` | Core project records; `status: "pending" \| "active"` |
| `mediaFiles` | Images/videos attached to projects (ordered) |
| `projectFiles` | Downloadable files attached to projects |
| `upvotes` | Per-user upvotes on projects |
| `adoptions` | Per-user "I'm using this" signals |
| `projectViews` | Unique view tracking per viewer ID |
| `comments` | Threaded comments on projects (soft delete; retained if replies exist) |
| `commentUpvotes` | Per-user upvotes on project comments |
| `emailQueue` | Outbound email queue (pending → sent/failed); drained by cron |
| `notifications` | Aggregated activity notifications |
| `users` | User profiles; `onboardingCompleted` gates access; `department` from Cognito |
| `userFocusAreas` | User ↔ focus area interest associations (follow/join) |
| `teams` | Team/group records |
| `focusAreas` | Taxonomy spaces (like subreddits); shown in sidebar |
| `threads` | Discussion threads within a space; has hot score like projects |
| `threadUpvotes` | Per-user upvotes on threads |
| `threadComments` | Threaded comments on threads (soft delete) |
| `threadCommentUpvotes` | Per-user upvotes on thread comments |

All tables have relevant indexes — always use `.withIndex()` for queries, never `.filter()` alone on large collections.

---

## Authentication Flow

1. User signs in via AWS Cognito (OAuth/OIDC)
2. AWS Amplify obtains the Cognito ID token
3. `ConvexClientProvider` (`components/ConvexClientProvider.tsx`) bridges the token to Convex via `ConvexProviderWithAuth`
4. `EnsureUser` component calls `api.users.ensureUser` once per session to create/sync the user record
5. `OnboardingGuard` checks `user.onboardingCompleted`; redirects to `/onboarding` if false
6. `useCurrentUser` hook (`app/useCurrentUser.ts`) provides `{ isAuthenticated, user }` throughout the app

**Never bypass `OnboardingGuard`** — all authenticated app pages live under `app/(app)/`.

### Cognito Attribute Sync

`ensureUser` extracts attributes from the Cognito identity token using an internal helper:

```ts
function extractCognitoAttributes(identity: Record<string, unknown>) {
  const department = identity["custom:department"] as string | undefined;
  const avatarUrlId = identity["picture"] as string | undefined;
  return {
    ...(department !== undefined ? { department } : {}),
    ...(avatarUrlId !== undefined ? { avatarUrlId } : {}),
  };
}
```

The `department` field comes from the `custom:department` Cognito attribute and is stored on the `users` table. It is displayed on the user profile page.

---

## Convex Backend Conventions

### Function types
- `query` — read-only, reactive (use for data fetching)
- `mutation` — read-write database operations
- `action` — can call external APIs and run queries/mutations; used for RAG, AI, and multi-step operations
- `internalQuery` / `internalMutation` — server-only, not callable from the client

### Projects module pattern
The `convex/projects/` directory organizes functions by responsibility. `convex/projects.ts` is a proxy that re-exports everything — this keeps `api.projects.*` and `internal.projects.*` stable.

When adding new project-related functions, place them in the appropriate file under `convex/projects/` and re-export from `convex/projects.ts`.

### Auth in Convex functions
```ts
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

// In a query — returns null if unauthenticated
const user = await getCurrentUser(ctx);

// In a mutation — throws if unauthenticated
const user = await getCurrentUserOrThrow(ctx);
```

### Internal mutations from functions.ts
```ts
import { internalMutation as internalMutationFromFunctions } from "../functions";
```
Use this import (not the direct `_generated` one) for internal mutations within the projects domain.

---

## Frontend Conventions

### Client vs Server Components
- All interactive components use `'use client'` at the top
- Pages under `app/(app)/` are client components (the layout is `'use client'`)
- Static/metadata-only pages can be server components

### Path Alias
`@/*` maps to the project root. Always use `@/` for imports:
```ts
import { api } from "@/convex/_generated/api";
import { ProjectRow } from "@/components/ProjectRow";
import type { ProjectRowData } from "@/lib/types";
```

### Convex data access in React
```ts
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const projects = useQuery(api.projects.listPaginated, { ... });
const toggleUpvote = useMutation(api.projects.toggleUpvote);
const { results, status, loadMore } = usePaginatedQuery(api.projects.listPaginated, {}, { initialNumItems: 15 });
```

### Shared Types
All shared TypeScript types live in `lib/types.ts`. Key types:
- `ProjectRowData` — enriched project for list/card display
- `ThreadRowData` — enriched thread for list/card display
- `ReadinessStatus` — union of project maturity levels
- `UserRef` — `{ _id, name, avatarUrl }`
- `FocusArea` — `{ _id, name, group, icon }`
- `OptimisticMessage` — for AI chat optimistic UI
- `LinkItem`, `ExistingFileItem`, `NewProjectFileItem`, `ExistingMediaItem`, `NewFileItem`

Add new shared types here rather than defining them inline or in component files.

### UI Components
- `components/ui/` contains shadcn/ui components — add new ones with `npx shadcn add <component>`
- Do not edit `components/ui/` files directly unless patching a bug
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes

### Toast Notifications (Sonner)
Use Sonner for all user-facing feedback. Never use `alert()` or silently swallow errors.

```ts
import { toast } from "sonner";

toast.success("Project saved!");
toast.error("Something went wrong.");
toast.loading("Saving…");
```

The `<Toaster />` is mounted in `app/layout.tsx`. The custom wrapper at `components/ui/sonner.tsx` adds Lucide icons and theme awareness.

---

## Project Ranking / Hot Score

Projects and threads are ranked using a Hacker News-style hot score:

```
hotScore = (engagementScore + 1) / (ageHours + 2)^1.0
```

**Projects**:
- `engagementScore` = upvote count + comment count
- Updated on every upvote/comment
- Also refreshed hourly via cron job (`convex/crons.ts` → `internal.projects.refreshHotScores`)
- Pinned projects always appear first regardless of score
- Feed index: `by_status_hotScore`; space feed index: `by_status_focusArea_hotScore`

**Threads**:
- Same formula; `engagementScore` = upvote count + comment count
- Updated inline on every upvote/comment in `convex/threads.ts`
- Feed index: `by_focusArea_hotScore`; global trending index: `by_hotScore`

`calculateHotScore` lives in `convex/projects/helpers.ts` and is shared by both projects and threads.

---

## Threads Feature

Threads are lightweight Reddit-style discussions tied to a Focus Area (Space). Each thread belongs to exactly one space and participates in hot-score ranking separately from projects.

### Backend (`convex/threads.ts`)

Key exported mutations:
- `createThread({ title, body?, focusAreaId })` — requires auth
- `updateThread({ threadId, title, body? })` — owner only
- `deleteThread({ threadId })` — owner only; cascades to comments + upvotes
- `toggleUpvote({ threadId })` — toggles upvote, updates hot score
- `addComment({ threadId, content, parentCommentId? })` — requires auth
- `deleteComment({ commentId })` — soft delete (sets `isDeleted: true`)
- `toggleCommentUpvote({ commentId })` — toggles comment upvote

Key exported queries:
- `getById({ threadId })` — returns thread enriched with creator info, focusArea, hasUpvoted
- `listPaginatedBySpace({ focusAreaId, paginationOpts })` — paginated, sorted by hot score
- `getTopThreadsBySpace({ focusAreaId, limit? })` — top N by hot score (used in sidebar)
- `getTrendingThreads({ limit? })` — top N across all spaces
- `getComments({ threadId })` — all non-deleted comments enriched with user info + hasUpvoted

### Routes
- `app/(app)/space/[id]/page.tsx` — Space page with "Projects" and "Threads" tabs
- `app/(app)/thread/[id]/page.tsx` — Thread detail with inline edit/delete and comments
- `app/(app)/create-thread/page.tsx` — Standalone thread creation (uses `SpacePicker`)

### Components
- `ThreadRow` — compact thread card (title, upvote count, comment count, creator, timestamp)
- `CreateThreadForm` — inline form for creating a thread within a space page
- `CommentForm` — shared comment input used for both projects and threads
- `CommentThread` — shared recursive threaded comment display used for both projects and threads

---

## Focus Areas (Spaces)

Focus areas are taxonomy tags rendered as "Spaces" in the sidebar (styled like `g/name`). Each project can belong to one focus area, and each thread *must* belong to one. Users can follow/join spaces.

Key backend functions in `convex/focusAreas.ts`:
- `listActive` — all active spaces
- `getById({ id })` — single space by ID
- `toggleFollowSpace({ focusAreaId })` — follow/unfollow (requires auth)
- `isFollowingSpace({ focusAreaId })` — boolean, current user
- `getMemberCount({ focusAreaId })` — count of followers

The space page (`app/(app)/space/[id]/page.tsx`) shows member count, a Join button, and two tabs (Projects, Threads). A context-aware sidebar cross-promotes the other content type.

New spaces are created via `CreateFocusAreaDialog`.

---

## AI / RAG System

The AI chat assistant lives in `convex/ragbot.ts`:

- **Agent**: `projectAgent` using `@convex-dev/agent`
- **LLM**: Amazon Bedrock (`us.anthropic.claude-haiku-4-5-20251001-v1:0`)
- **Embeddings**: OpenAI `text-embedding-3-small`
- **Tools**: `searchProjects` (semantic RAG search), `showProjects` (renders results to UI)
- **RAG namespace**: `"projects"` — project names + summaries are indexed on create/update

When a project is created or updated, `rag.add()` is called to upsert its embedding. On project deletion, `rag.delete()` removes it.

---

## Weekly Digest & Email Pipeline

The app sends weekly digest emails summarizing platform activity. The pipeline uses a **3-tier architecture** with a cron-based queue drainer for delivery.

### Pipeline Flow

```
Cron (Monday 9am) → generateWeeklyDigests (action, convex/digests.ts)
  └─ loop: getEligibleUserBatch (50 users/batch, cursor-based)
       └─ generateDigestBatch (action)
            └─ per user: gatherUserDigestData (query) → enqueueDigestEmail (mutation)
                 └─ inserts into emailQueue { status: "pending" }

Cron (every 5 min) → drainEmailQueue (action, convex/emails.ts)
  └─ fetches up to 14 pending emails (matching SES rate limits)
  └─ per email: sendEmail → renders HTML via emailRenderer.ts → sends via SES v2
  └─ marks each row "sent" or "failed" with reason
```

### Key Files

| File | Responsibility |
|---|---|
| `convex/digests.ts` | Orchestrator action, per-user data gathering, email enqueuing with deduplication |
| `convex/emails.ts` | `sendEmail` (SES v2 integration), queue drainer, email preference queries/mutations |
| `convex/emailRenderer.ts` | `renderWeeklyDigestEmail` — typed HTML + plain-text templates with `escapeHtml` |
| `convex/users.ts` | `getEmailRecipient` — internal query returning `{ name, email }` for a user |

### Digest Data Shape

Each digest email payload contains:
- `ownProjectActivity` — per-project stats (new upvotes, comments, adoptions, views)
- `ownProjectTotals` — aggregated totals across all owned projects
- `followedSpaceActivity` — top projects and new threads in followed spaces
- `platformHighlights` — trending projects and threads across all spaces
- `periodStart` / `periodEnd` — timestamps defining the digest window

### Email Queue

The `emailQueue` table tracks every outbound email with status transitions: `pending → sent | failed`. Key indexes:
- `by_status_createdAt` — used by the queue drainer to fetch oldest pending emails first
- `by_userId_type_createdAt` — used for deduplication (1-hour window prevents duplicate digests)

### Email Preferences

Users can opt out of email categories via `emailPreferences` on the `users` table. Categories: `weeklyDigest`, `spaceActivity`, `projectActivity`. All default to opt-in (enabled if undefined). Preferences are checked during digest generation, not at send time.

---

## Notifications

Notifications are aggregated (upserted) per `(recipient, project, type)` tuple. Types:
- `"comment"` — someone commented on your project
- `"upvote"` — upvote count notification (aggregated)
- `"adoption"` — someone adopted your project
- `"project_update"` — a project you've interacted with was updated

---

## CI/CD

- **Push to `main`** → GitHub Actions runs `npx convex deploy` to production (self-hosted Convex)
- **All branch pushes** → mirrored to a separate work repo (`project-garden-mirror`)

Secrets required:
- `CONVEX_SELF_HOSTED_URL`
- `CONVEX_SELF_HOSTED_ADMIN_KEY`
- `MIRROR_TOKEN`

---

## Key Patterns and Things to Know

1. **Project submission is two-step**: `/submit` creates a `pending` project + shows similar projects. `/submit/confirm` activates it (`confirmProject` mutation sets `status: "active"`).

2. **Readiness status** has a legacy value (`"in_progress"`) kept for migration compatibility. New projects use: `just_an_idea | early_prototype | mostly_working | ready_to_use`.

3. **`convex/_generated/`** is auto-generated — never edit these files. Run `npx convex dev` to regenerate after schema or function changes.

4. **Media ordering** uses an explicit `order` field on `mediaFiles`. Use `reorderProjectMedia` to update order. Always query with `by_project_ordered` index and `.order("asc")`.

5. **View tracking** deduplicates by `viewerId` string (can be user ID or anonymous session ID). A view is only counted once per viewer per project.

6. **`allFields`** on projects is a denormalized string used for full-text search indexing (indexed via `searchIndex("allFields", ...)`).

7. **`Authenticated` / `Unauthenticated`** components from `convex/react` are used to conditionally render content based on auth state (see `app/(app)/layout.tsx`).

8. **PostHog analytics** is initialized in `instrumentation-client.ts` (Next.js client instrumentation hook) and proxied through Next.js rewrites (`/ingest/*` → PostHog endpoints) to avoid ad blockers. Requires `NEXT_PUBLIC_POSTHOG_KEY` env var.

9. **Threads do not have notifications** — only project activity triggers notifications. This is intentional; do not add thread notifications without discussing the aggregation strategy.

10. **`SpacePicker`** is a controlled combobox component (`components/SpacePicker.tsx`) used on the standalone `/create-thread` page to let users pick which space a thread belongs to.

11. **Thread comments share UI components with project comments** — `CommentForm` and `CommentThread` are used for both. The backend tables differ (`threadComments` / `threadCommentUpvotes` vs `comments` / `commentUpvotes`), but the frontend components are consolidated.

12. **Deleted comments with replies are retained** — when a comment is soft-deleted, it remains visible as `[deleted]` if it has non-deleted replies, preventing orphaned reply threads. The filter logic lives on the project detail page.

13. **Upvote icons use `ArrowBigUp`** from Lucide React — not thumbs-up or heart icons. Use `ArrowBigUp` consistently for all upvote affordances across projects, threads, and comments.

14. **Department field on users** — populated automatically from the Cognito `custom:department` attribute during `ensureUser`. Displayed on the profile page. Do not prompt users to enter it manually.

15. **User profile page** — shows `department` if populated; does not display `userIntent` labels to the user. The `userIntent` field (`"looking" | "sharing" | "both"`) is collected at onboarding and available in the backend but is not currently surfaced in the UI.

16. **Email sending uses a queue pattern** — never call SES directly from mutations. Always insert into `emailQueue` and let the cron-based drainer handle delivery. This provides rate limiting (14 emails/batch, matching SES limits), automatic retry, and full audit trail.

17. **Email templates live in `convex/emailRenderer.ts`** — all HTML must use `escapeHtml()` for user-generated content. Templates include both HTML and plain-text versions. Add new email types by adding a renderer function and a case in `sendEmail`'s type dispatch.

18. **SES shares AWS credentials with Bedrock** — `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are shared across all AWS services (Bedrock, SES). The IAM role must have both Bedrock and SES permissions. `SES_FROM_EMAIL` must also be set and the sender address verified in SES.

19. **`hotScore` must be propagated to `projectSpaces`** — The `projectSpaces` table denormalizes `hotScore` from `projects` to enable a single paginated index scan per space feed. Any code path that patches `hotScore` on a project must also call `propagateHotScoreToMemberships(ctx, projectId, newHotScore)` from `convex/projects/spaces.ts`. Current call sites: `toggleUpvote`, `addComment`, `deleteComment`, `createVersion`, `confirmProject`, `refreshHotScores`.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
