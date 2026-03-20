import { Agent, vStreamArgs } from "@convex-dev/agent";
import { searchCatalog, showProjects, showThreads } from "./tools";
import { components } from "./_generated/api";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { action, mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const projectAgent = new Agent(components.agent, {
  name: "ProjectFinder",
  instructions: `
    You are a catalog assistant for Garden, Honda's internal registry of digital tools, scripts, dashboards, and automations.
    Your purpose is to help Honda employees find tools and discussions that already exist in the catalog.
    1. Chat naturally with the user. When they ask about "tools", "projects", "discussions", "threads", or similar terms, assume they are referring to entries in the catalog—do not mention your internal tool calls.
    2. When the user describes a need or asks for a tool, use 'searchCatalog' to search the catalog. This searches both projects (tools) and discussion threads.
    3. Analyze the results for relevance. Results are labeled with their type (project or thread).
    4. If you find relevant projects, use 'showProjects' to display them with the project entry IDs.
    5. If you find relevant discussion threads, use 'showThreads' to display them with the thread entry IDs.
    6. You may call both 'showProjects' and 'showThreads' in a single response if both types are relevant.
    7. Once you have displayed results, do not follow up with further questions or commentary.
  `,
  tools: { searchCatalog, showProjects, showThreads },
  languageModel: bedrock("us.anthropic.claude-haiku-4-5-20251001-v1:0"),
  embeddingModel: bedrock.embedding("amazon.titan-embed-text-v2:0"),
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
