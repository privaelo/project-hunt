import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "./_generated/api";

// Tool 1: The "Eye" (Search)
export const searchCatalog = createTool({
  description: "Search the catalog for projects and discussion threads matching the query using hybrid search (vector search and full text search).",
  inputSchema: z.object({ query: z.string() }).describe("The query to be used in the hybrid search to find projects and threads"),
  execute: async (ctx, { query }): Promise<string> => {
    if (query.trim().length < 2) {
      return "Query too short. Please provide at least 2 characters.";
    }

    const results = await ctx.runAction(api.projects.searchCatalog, { query });

    if (results.length === 0) {
      return "No results found matching your query.";
    }

    const projectResults = results.filter((r) => r.type === "project");
    const threadResults = results.filter((r) => r.type === "thread");

    const projectSection = projectResults
      .map((r, index) => {
        const lines = [
          `[Project ${index + 1}]`,
          `Type: project`,
          `Entry ID: ${r.entryId}`,
          `Name: ${r.name}`,
        ];
        if (r.summary) {
          lines.push(`Summary: ${r.summary}`);
        }
        return lines.join("\n");
      })
      .join("\n\n---\n\n");

    const threadSection = threadResults
      .map((r, index) => {
        const lines = [
          `[Thread ${index + 1}]`,
          `Type: thread`,
          `Entry ID: ${r.entryId}`,
          `Title: ${r.name}`,
        ];
        if (r.summary) {
          lines.push(`Body: ${r.summary.slice(0, 200)}`);
        }
        return lines.join("\n");
      })
      .join("\n\n---\n\n");

    const sections = [projectSection, threadSection].filter(Boolean);
    if (sections.length === 1) {
      return sections[0];
    }
    return `${sections[0]}\n\n=== Discussion Threads ===\n\n${sections[1]}`;
  },
});

// Tool 2: The "Mouth" (Structured Output — Projects)
export const showProjects = createTool({
  description: "Display a list of project cards to the user. Use this when you find relevant projects.",
  inputSchema: z.object({
    projectIds: z.array(z.string()).describe("The entryIDs of the relevant projects"),
    summary: z.string().describe("A brief summary of why these were chosen"),
  }),
  execute: async () => {
    // We don't need to do backend logic here.
    // The mere fact that this tool was called is enough for the UI.
    return "Projects displayed to user.";
  },
});

// Tool 3: Display Thread Cards
export const showThreads = createTool({
  description: "Display a list of discussion thread cards to the user. Use this when you find relevant discussion threads.",
  inputSchema: z.object({
    threadIds: z.array(z.string()).describe("The entryIDs of the relevant threads"),
    summary: z.string().describe("A brief summary of why these threads were chosen"),
  }),
  execute: async () => {
    return "Threads displayed to user.";
  },
});
