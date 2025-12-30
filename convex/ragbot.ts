import { Agent } from "@convex-dev/agent";
import { searchProjects, showProjects } from "./tools";
import { components } from "./_generated/api";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

export const projectAgent = new Agent(components.agent, {
  name: "ProjectFinder",
  instructions: `
    You are a helpful project curator.
    1. Chat naturally with the user.
    2. If they ask for projects, use 'searchProjects' to find them.
    3. Analyze the search results.
    4. If you find good matches, use 'showProjects' to display them.
  `,
  tools: { searchProjects, showProjects },
  languageModel: bedrock("anthropic.claude-haiku-4-5-20251001-v1:0"),
});

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {

    const user = await getCurrentUserOrThrow(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const { threadId } = await projectAgent.createThread(ctx, {
      userId: user._id.toString(),
    });

    return threadId;
  },
});