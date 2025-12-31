import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { rag } from "./rag";
import { internal } from "./_generated/api";
import { hybridRank } from "@convex-dev/rag";

// Tool 1: The "Eye" (Search)
export const searchProjects = createTool({
  description: "Search the database for projects matching the query.",
  args: z.object({ query: z.string() }),
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
        vectorScoreThreshold: 0.3,
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
        cutoffScore: 0.05,
      }
    );

    // Build a map of entryId -> text from both sources
    const textMap = new Map<string, string>();
    
    // Add vector search results (these have the RAG text)
    entries.forEach((e: { entryId: string; text: string }) => {
      textMap.set(e.entryId, e.text);
    });
    
    // Add full-text search results (reconstruct text from project data)
    fullTextSearchProjects.forEach((p: { entryId?: string; name: string; summary?: string }) => {
      if (p.entryId && !textMap.has(p.entryId)) {
        const text = p.summary ? `${p.name}\n\n${p.summary}` : p.name;
        textMap.set(p.entryId, text);
      }
    });

    // Get text for all hybrid-ranked entries in order
    const combinedResults: string = hybridRankedEntryIds
      .map((entryId: string) => textMap.get(entryId))
      .filter((text: string | undefined): text is string => text !== undefined)
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