import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { rag } from "./rag";
import { internal } from "./_generated/api";
import { hybridRank } from "@convex-dev/rag";

// Tool 1: The "Eye" (Search)
export const searchProjects = createTool({
  description: "Search the database for projects matching the query using hybrid search (vector search and full text search).",
  args: z.object({ query: z.string() }).describe("The query to be used in the hybrid search to find projects"),
  handler: async (ctx, { query }): Promise<string> => {
    // Don't search if query is too short
    if (query.trim().length < 2) {
      return "Query too short. Please provide at least 2 characters.";
    }

    // Run both vector and full-text searches in parallel for better results
    const [vectorSearchResults, fullTextSearchProjects] = await Promise.all([
      rag.search(ctx, {
        namespace: "projects",
        query: query,
        limit: 15,
        vectorScoreThreshold: 0.2,
      }),
      ctx.runQuery(internal.projects.fullTextSearchProjects, {
        query: query,
        limit: 15,
      }),
    ]);

    const { entries } = vectorSearchResults;

    // Extract entryIds from both search results
    const entryIds = entries.map((e: { entryId: string }) => e.entryId);
    const fullTextEntryIds = fullTextSearchProjects
      .map((p: { entryId?: string }) => p.entryId)
      .filter((id: string | undefined): id is string => id !== undefined);

    // Hybrid rank the results (favoring vector search with weight 2:1)
    const hybridRankedEntryIds = hybridRank(
      [entryIds, fullTextEntryIds],
      {
        k: 15,
        weights: [2, 1],
        cutoffScore: 0.01,
      }
    );

    // Build a map of entryId -> structured project info
    type ProjectInfo = { name: string; summary?: string };
    const projectMap = new Map<string, ProjectInfo>();
    
    // Add full-text search results first (these have structured data)
    fullTextSearchProjects.forEach((p: { entryId?: string; name: string; summary?: string }) => {
      if (p.entryId) {
        projectMap.set(p.entryId, { name: p.name, summary: p.summary });
      }
    });
    
    // Add vector search results (parse name/summary from RAG text if not already in map)
    entries.forEach((e: { entryId: string; text: string }) => {
      if (!projectMap.has(e.entryId)) {
        // RAG text format is: "name\n\nsummary" or just "name"
        const parts = e.text.split("\n\n");
        const name = parts[0] || "Untitled";
        const summary = parts.length > 1 ? parts.slice(1).join("\n\n") : undefined;
        projectMap.set(e.entryId, { name, summary });
      }
    });

    // Format results with clear labels
    const combinedResults: string = hybridRankedEntryIds
      .map((entryId: string, index: number) => {
        const project = projectMap.get(entryId);
        if (!project) return null;
        
        const lines = [
          `[Result ${index + 1}]`,
          `Entry ID: ${entryId}`,
          `Name: ${project.name}`,
        ];
        if (project.summary) {
          lines.push(`Summary: ${project.summary}`);
        }
        return lines.join("\n");
      })
      .filter((text: string | null): text is string => text !== null)
      .join("\n\n---\n\n");

    return combinedResults || "No projects found matching your query.";
  },
});

// Tool 2: The "Mouth" (Structured Output)
export const showProjects = createTool({
  description: "Display a list of project cards to the user. Use this when you find relevant projects.",
  args: z.object({
    projectIds: z.array(z.string()).describe("The entryIDs of the relevant projects"),
    summary: z.string().describe("A brief summary of why these were chosen"),
  }),
  handler: async () => {
    // We don't need to do backend logic here. 
    // The mere fact that this tool was called is enough for the UI.
    return "Projects displayed to user.";
  },
});