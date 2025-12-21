# Copilot Instructions for Garden (Project Hunt)

## Project Overview

Garden is an internal Product Hunt-style platform that provides launch visibility for teams. It enables teams to share progress, unblock faster, and celebrate momentum through project showcases, upvoting, and commenting.

## Tech Stack

### Core Framework
- **Next.js 16** with App Router (React 19.2)
- **TypeScript** with strict mode enabled
- **Tailwind CSS 4** for styling

### Backend & Database
- **Convex** for backend, database, and real-time functionality
- **Convex RAG** for AI-powered search and recommendations
- **Convex Auth** for authentication helpers

### Authentication
- **WorkOS AuthKit** for authentication and user management
- **Clerk** integration for additional auth features

### UI Components
- **shadcn/ui** components (Radix UI primitives)
- **Lucide React** for icons
- **Framer Motion** for animations
- **Embla Carousel** for carousels

### Analytics & Monitoring
- **PostHog** for product analytics

### AI Integration
- **AI SDK** (@ai-sdk/openai, @ai-sdk/react) for AI features

## Project Structure

```
/app              - Next.js App Router pages and API routes
/components       - React components
  /ui             - shadcn/ui components
/convex           - Convex backend functions and schema
/lib              - Utility functions and helpers
/public           - Static assets
```

## Development Setup

### Prerequisites
- Node.js 20+
- npm (package manager)

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access the application
# http://localhost:3000
```

### Available Scripts

- `npm run dev` - Start the Next.js development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Coding Conventions

### TypeScript
- Always use TypeScript for new files
- Use strict mode (enabled in tsconfig.json)
- Define proper types and interfaces
- Avoid using `any` type unless absolutely necessary
- Use `type` for object shapes and `interface` for contracts

### React Components
- Use functional components with hooks
- Use `"use client"` directive for client components
- Use Server Components by default (Next.js App Router convention)
- Props should be properly typed with TypeScript interfaces
- Component files should be in PascalCase (e.g., `SearchBar.tsx`)

### Styling
- Use Tailwind CSS utility classes
- Follow the existing color scheme (zinc-based palette)
- Use the provided CSS variables for theming
- Components use `className` prop for styling customization

### Code Organization
- One component per file
- Export main component as default or named export based on context
- Group related utilities in `/lib` directory
- Keep Convex functions in `/convex` directory organized by domain

### Naming Conventions
- Components: PascalCase (e.g., `SearchBar`, `CommentForm`)
- Functions/variables: camelCase (e.g., `searchProjects`, `userId`)
- Files: PascalCase for components, camelCase for utilities
- Convex schema tables: camelCase (e.g., `projects`, `focusAreas`)
- Database IDs: Use Convex `Id<"tableName">` type

## Convex Backend

### Schema Design
- Schema is defined in `/convex/schema.ts`
- Use proper indexing for query optimization
- Main tables: projects, users, teams, comments, upvotes, focusAreas

### Convex Functions
- Queries: For reading data (use `query`)
- Mutations: For writing data (use `mutation`)
- Actions: For external API calls or AI operations (use `action`)
- HTTP endpoints: Defined in `/convex/http.ts`

### Authentication
- Use WorkOS for user authentication
- User data stored in Convex `users` table
- Link users with `workosUserId` for WorkOS integration

## State Management
- **Primary**: Use Convex React hooks (`useQuery`, `useMutation`, `useAction`) for all Convex data fetching and mutations
- **Local state**: Use React hooks (useState, useEffect) for component-level state
- **External APIs**: Use TanStack Query only when fetching from non-Convex external APIs

## Key Features

### Projects
- Users can create and share projects
- Projects have focus areas, readiness status (in_progress/ready_to_use)
- Support for media file uploads
- AI-powered search functionality

### Social Features
- Upvoting on projects
- Nested commenting system
- User profiles with avatars

### Teams
- Team-based organization
- Team members can collaborate on projects

## Environment Variables

Key environment variables (stored in `.env.local`):
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI` - WorkOS redirect URI
- Convex configuration
- WorkOS API keys
- PostHog configuration

## Best Practices

1. **Always use the latest Next.js conventions** (App Router, Server Components)
2. **Keep components small and focused** on a single responsibility
3. **Use TypeScript types from Convex** (`Id`, `Doc`, generated API types)
4. **Handle loading and error states** in UI components
5. **Use semantic HTML** and proper accessibility attributes
6. **Follow the existing code style** in the repository
7. **Test changes locally** before committing
8. **Keep dependencies up to date** but review breaking changes

## Common Patterns

### Data Fetching (Client Component)
```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const data = useQuery(api.projects.list);
```

### Mutations (Client Component)
```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const createProject = useMutation(api.projects.create);
await createProject({ name: "My Project", ... });
```

### Path Aliases
- Use `@/*` to import from the root directory
- Example: `import { api } from "@/convex/_generated/api"`

## AI Features

The project includes AI-powered features using OpenAI:
- Semantic search for projects
- Similar project recommendations
- RAG (Retrieval-Augmented Generation) integration

## Performance Considerations

- Use Next.js Image component for images
- Implement proper loading states for async operations
- Use Convex indexes for efficient queries
- Consider pagination for large lists

## Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Validate user input in Convex functions
- Follow authentication best practices with WorkOS

## Deployment

- Designed for deployment on Vercel
- Automatic deployments from main branch
- Environment variables configured in Vercel dashboard
- PostHog proxying configured for better analytics tracking
