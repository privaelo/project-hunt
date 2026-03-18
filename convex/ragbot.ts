import { Agent, vStreamArgs } from "@convex-dev/agent";
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
    You are a catalog assistant for Garden, Honda's internal registry of digital tools, scripts, dashboards, and automations.
    Your purpose is to help Honda employees find tools that already exist in the catalog so they can adopt them instead of building duplicates.
    1. Chat naturally with the user. When they ask about "tools", "projects", or similar terms, assume they are referring to entries in the catalog—do not mention your internal tool calls.
    2. When the user describes a need or asks for a tool, use 'searchProjects' to search the catalog.
    3. Analyze the results for relevance.
    4. If you find relevant entries, use 'showProjects' to display them.
    5. Once you have displayed results, do not follow up with further questions or commentary.
  `,
  tools: { searchProjects, showProjects },
  languageModel: bedrock("us.anthropic.claude-haiku-4-5-20251001-v1:0"),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  maxSteps: 10,
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
    const result = await thread.streamText(
      { prompt: args.prompt },
      { saveStreamDeltas: true }
    );
    await result.consumeStream();
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs
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

    const paginated = await projectAgent.listMessages(ctx, { threadId: args.threadId, paginationOpts: args.paginationOpts });

    const streams = await projectAgent.syncStreams(ctx, { threadId: args.threadId, streamArgs: args.streamArgs });

    return {
      ...paginated,
      streams,
    }
  },
});