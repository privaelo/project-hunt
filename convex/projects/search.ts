import { action, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { rag } from "../rag";
import type { Id } from "../_generated/dataModel";
import { hybridRank } from "@convex-dev/rag";

export const fullTextSearchProjects = internalQuery({
  args: {
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withSearchIndex("allFields", (q) => q.search("allFields", args.query))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(args.limit);
  },
});

export const searchProjects = action({
  args: {
    query: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: Id<"projects">;
      name: string;
      summary?: string;
    }>
  > => {
    if (args.query.trim().length < 2) {
      return [];
    }
    const [{ entries }, fullTextSearchProjects] = await Promise.all([
      rag.search(ctx, {
        namespace: "projects",
        query: args.query,
        limit: 15,
        vectorScoreThreshold: 0.3,
      }),
      ctx.runQuery(internal.projects.fullTextSearchProjects, {
        query: args.query,
        limit: 15,
      }),
    ]);
    const entryIds = entries.map((e: { entryId: string }) => e.entryId);
    const fullTextEntryIds = fullTextSearchProjects
      .map((p: { entryId?: string }) => p.entryId)
      .filter((id: string | undefined): id is string => id !== undefined);
    const hybridRankedEntryIds = hybridRank(
      [entryIds, fullTextEntryIds],
      {
        k: 15,
        weights: [2, 1],
        cutoffScore: 0.05,
      }
    );
    const allProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: hybridRankedEntryIds,
        excludeProjectId: undefined,
      }
    );
    type ProjectWithEntryId = (typeof allProjects)[number];
    const projectMap = new Map(allProjects.map((p: ProjectWithEntryId) => [p.entryId!, p]));
    const projects = hybridRankedEntryIds
      .map((entryId) => projectMap.get(entryId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
    return projects.map((p) => ({
      _id: p._id,
      name: p.name,
      summary: p.summary,
    }));
  },
});

export const getSimilarProjects = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: Id<"projects">;
      name: string;
      summary?: string;
      team: string;
      upvotes: number;
      creatorId: Id<"users">;
      creatorName: string;
      creatorAvatar: string;
    }>
  > => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) {
      return [];
    }
    const text = project.summary ? `${project.name}\n\n${project.summary}` : project.name;
    const { entries } = await rag.search(ctx, {
      namespace: "projects",
      query: text,
      limit: 5,
      vectorScoreThreshold: 0.6,
    });
    const similarProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: args.projectId,
      }
    );
    const projectsWithCounts = await ctx.runQuery(
      internal.projects.populateProjectDetails,
      { projects: similarProjects }
    );
    return projectsWithCounts;
  },
});

export const searchSimilarProjectsByText = action({
  args: {
    name: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: Id<"projects">;
      name: string;
      summary?: string;
      team: string;
      upvotes: number;
      creatorId: Id<"users">;
      creatorName: string;
      creatorAvatar: string;
    }>
  > => {
    const summaryLength = args.summary?.trim().length ?? 0;
    if (args.name.trim().length < 2 && summaryLength < 2) {
      return [];
    }
    const text = args.summary ? `${args.name}\n\n${args.summary}` : args.name;
    const { entries } = await rag.search(ctx, {
      namespace: "projects",
      query: text,
      limit: 5,
      vectorScoreThreshold: 0.6,
    });
    const similarProjects = await ctx.runQuery(
      internal.projects.getProjectsByEntryIds,
      {
        entryIds: entries.map((e) => e.entryId),
        excludeProjectId: undefined,
      }
    );
    const projectsWithCounts = await ctx.runQuery(
      internal.projects.populateProjectDetails,
      { projects: similarProjects }
    );
    return projectsWithCounts;
  },
});
