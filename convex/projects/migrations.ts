import { action, internalAction, internalQuery } from "../_generated/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { rag } from "../rag";

export const migrateReadinessStatusAction = action({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    return await ctx.runMutation(internal.projects.migrateReadinessStatus, {});
  },
});

export const migrateReadinessStatus = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    let updated = 0;
    for (const project of projects) {
      if (project.readinessStatus === "in_progress") {
        await ctx.db.patch(project._id, {
          readinessStatus: "early_prototype",
        });
        updated++;
      }
    }
    return { updated };
  },
});

// ─── RAG Re-indexing (embedding model migration) ────────────────────────────

export const getAllProjectIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    return projects.map((p) => ({ _id: p._id, name: p.name, summary: p.summary }));
  },
});

export const reindexProjectInRag = internalAction({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = args.summary ? `${args.name}\n\n${args.summary}` : args.name;
    const { entryId } = await rag.add(ctx, {
      namespace: "projects",
      text,
      key: args.projectId,
    });
    await ctx.runMutation(internal.projects.updateEntryId, {
      projectId: args.projectId,
      entryId,
    });
  },
});

export const reindexAllProjectsInRag = internalAction({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.runQuery(internal.projects.getAllProjectIds, {});
    let scheduled = 0;
    for (const project of projects) {
      await ctx.scheduler.runAfter(
        scheduled * 200,
        internal.projects.reindexProjectInRag,
        { projectId: project._id, name: project.name, summary: project.summary },
      );
      scheduled++;
    }
    return { scheduled };
  },
});
