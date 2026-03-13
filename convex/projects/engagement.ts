import { mutation, query } from "../_generated/server";
import { internalMutation as internalMutationFromFunctions } from "../functions";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUser } from "../users";
import {
  createProjectNotification,
  syncUpvoteNotification,
  upsertUpvoteNotification,
} from "../notifications";
import { calculateHotScore } from "./helpers";

export const trackView = mutation({
  args: {
    projectId: v.id("projects"),
    viewerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projectViews")
      .withIndex("by_project_and_viewer", (q) =>
        q.eq("projectId", args.projectId).eq("viewerId", args.viewerId)
      )
      .first();
    if (existing) {
      return { counted: false };
    }
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    await ctx.db.insert("projectViews", {
      projectId: args.projectId,
      viewerId: args.viewerId,
      viewedAt: Date.now(),
    });
    await ctx.db.patch(args.projectId, {
      viewCount: (project.viewCount ?? 0) + 1,
    });
    return { counted: true };
  },
});

export const toggleUpvote = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existingUpvote = await ctx.db
      .query("upvotes")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (existingUpvote) {
      await ctx.db.delete(existingUpvote._id);
      const now = Date.now();
      const newEngagementScore = Math.max(0, (project.engagementScore ?? 0) - 1);
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, project._creationTime, now, project.lastVersionAt ?? undefined),
      });
      if (project.userId !== user._id) {
        await syncUpvoteNotification(ctx, {
          recipientUserId: project.userId,
          projectId: args.projectId,
        });
      }
    } else {
      const now = Date.now();
      await ctx.db.insert("upvotes", {
        projectId: args.projectId,
        userId: user._id,
        createdAt: now,
      });
      const newEngagementScore = (project.engagementScore ?? 0) + 1;
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, project._creationTime, now, project.lastVersionAt ?? undefined),
      });
      if (project.userId !== user._id) {
        await upsertUpvoteNotification(ctx, {
          recipientUserId: project.userId,
          projectId: args.projectId,
        });
      }
    }
  },
});

export const toggleAdoption = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existingAdoption = await ctx.db
      .query("adoptions")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (existingAdoption) {
      await ctx.db.delete(existingAdoption._id);
      return { adopted: false };
    } else {
      await ctx.db.insert("adoptions", {
        projectId: args.projectId,
        userId: user._id,
        createdAt: Date.now(),
      });
      if (project.userId !== user._id) {
        await createProjectNotification(ctx, {
          recipientUserId: project.userId,
          actorUserId: user._id,
          projectId: project._id,
          type: "adoption",
        });
      }
      return { adopted: true };
    }
  },
});

export const hasUserUpvoted = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return false;
    }
    const upvote = await ctx.db
      .query("upvotes")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", user._id)
      )
      .first();
    return !!upvote;
  },
});

export const getUpvoteCount = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const upvotes = await ctx.db
      .query("upvotes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return upvotes.length;
  },
});

export const getAdopters = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const adoptions = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
    const adoptersWithInfo = await Promise.all(
      adoptions.map(async (adoption) => {
        const user = await ctx.db.get(adoption.userId);
        return {
          _id: adoption.userId,
          name: user?.name ?? "Unknown User",
          avatarUrl: user?.avatarUrlId ?? "",
        };
      })
    );
    return adoptersWithInfo;
  },
});

export const refreshHotScores = internalMutationFromFunctions({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    for (const project of projects) {
      const hotScore = calculateHotScore(
        project.engagementScore ?? 0,
        project._creationTime,
        now,
        project.lastVersionAt ?? undefined
      );
      await ctx.db.patch(project._id, { hotScore });
    }
    return { updated: projects.length };
  },
});
