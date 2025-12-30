import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { rag } from "./rag";

// Tool 1: The "Eye" (Search)
export const searchProjects = createTool({
  description: "Search the database for projects matching the query.",
  args: z.object({ query: z.string() }),
  handler: async (ctx, { query }) => {
    // Perform the RAG search
    // Search for similar projects (excluding this one)
    const results = await rag.search(ctx, {
      namespace: "projects",
      query: query,
      limit: 10,
    });
    // Return text context to the LLM so it can analyze relevance
    return results.text;
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