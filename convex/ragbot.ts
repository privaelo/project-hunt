import { Agent } from "@convex-dev/agent";
import { searchProjects, showProjects } from "./tools";
import { components } from "./_generated/api";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { openai } from "@ai-sdk/openai";
import { action, mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

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
  languageModel: bedrock("us.anthropic.claude-haiku-4-5-20251001-v1:0"),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
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

export const sendMessageToAgent = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread } = await projectAgent.continueThread(ctx, {
      threadId: args.threadId,
    });
    const result = await thread.generateText({ prompt: args.prompt });
    return result.text;
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // check if currently authenticated user is the owner of the thread
    const user = await getCurrentUserOrThrow(ctx);
    if (!user) {
      throw new Error("User not found");
    }
    const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId: args.threadId });
    if (!thread) {
      throw new Error("Thread not found");
    }
    if (thread.userId !== user._id) {
       throw new Error("Unauthorized: User does not own this thread");
    }

    return await projectAgent.listMessages(ctx, { threadId: args.threadId, paginationOpts: args.paginationOpts });
  },
});