import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { isEmailEnabled } from "./emails";

const BATCH_SIZE = 50;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TOP_PROJECTS_PER_SPACE = 3;
const MAX_NEW_THREADS_PER_SPACE = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnProjectActivity {
  projectId: Id<"projects">;
  projectName: string;
  newUpvotes: number;
  newComments: number;
  newAdoptions: number;
  newViews: number;
}

interface SpaceActivity {
  focusAreaId: Id<"focusAreas">;
  focusAreaName: string;
  focusAreaIcon?: string;
  topProjects: {
    projectId: Id<"projects">;
    projectName: string;
    upvotes: number;
    creatorName: string;
  }[];
  newThreads: {
    threadId: Id<"threads">;
    threadTitle: string;
    creatorName: string;
  }[];
}

interface DigestData {
  ownProjectActivity: OwnProjectActivity[];
  ownProjectTotals: {
    totalNewUpvotes: number;
    totalNewComments: number;
    totalNewAdoptions: number;
    totalNewViews: number;
  };
  followedSpaceActivity: SpaceActivity[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isDigestEmpty(data: DigestData): boolean {
  const { ownProjectTotals, followedSpaceActivity } = data;
  const hasOwnActivity =
    ownProjectTotals.totalNewUpvotes > 0 ||
    ownProjectTotals.totalNewComments > 0 ||
    ownProjectTotals.totalNewAdoptions > 0 ||
    ownProjectTotals.totalNewViews > 0;
  return !hasOwnActivity && followedSpaceActivity.length === 0;
}

// ─── Internal: orchestrator action (cron entry point) ─────────────────────────

export const generateWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    const periodEnd = Date.now();
    const periodStart = periodEnd - SEVEN_DAYS_MS;

    let cursor: string | undefined = undefined;
    let totalProcessed = 0;

    while (true) {
      const batch: { userIds: Id<"users">[]; nextCursor: string | null } =
        await ctx.runQuery(internal.digests.getEligibleUserBatch, {
          cursor: cursor,
          batchSize: BATCH_SIZE,
        });

      if (batch.userIds.length > 0) {
        await ctx.runAction(internal.digests.generateDigestBatch, {
          userIds: batch.userIds,
          periodStart,
          periodEnd,
        });
        totalProcessed += batch.userIds.length;
      }

      if (!batch.nextCursor) break;
      cursor = batch.nextCursor;
    }

    console.log(
      `[generateWeeklyDigests] Processed ${totalProcessed} users for period ${new Date(periodStart).toISOString()} – ${new Date(periodEnd).toISOString()}`
    );
  },
});

// ─── Internal: get eligible users (paginated) ────────────────────────────────

export const getEligibleUserBatch = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("users")
      .paginate({ cursor: args.cursor ?? null, numItems: args.batchSize });

    const eligibleIds: Id<"users">[] = [];
    for (const user of results.page) {
      if (!user.onboardingCompleted) continue;
      if (!isEmailEnabled(user, "weeklyDigest")) continue;
      eligibleIds.push(user._id);
    }

    return {
      userIds: eligibleIds,
      nextCursor: results.isDone ? null : results.continueCursor,
    };
  },
});

// ─── Internal: batch processing ───────────────────────────────────────────────

export const generateDigestBatch = internalAction({
  args: {
    userIds: v.array(v.id("users")),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    for (const userId of args.userIds) {
      const digestData: DigestData = await ctx.runQuery(
        internal.digests.gatherUserDigestData,
        {
          userId,
          periodStart: args.periodStart,
          periodEnd: args.periodEnd,
        }
      );

      if (isDigestEmpty(digestData)) continue;

      await ctx.runMutation(internal.digests.writeDigestRecord, {
        userId,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        ...digestData,
      });
    }
  },
});

// ─── Internal: per-user data gathering ────────────────────────────────────────

export const gatherUserDigestData = internalQuery({
  args: {
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, periodStart, periodEnd } = args;

    // ── Section 1: Activity on user's own projects ──

    const userProjects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const activeProjects = userProjects.filter((p) => p.status === "active");

    const ownProjectActivity: OwnProjectActivity[] = [];
    let totalNewUpvotes = 0;
    let totalNewComments = 0;
    let totalNewAdoptions = 0;
    let totalNewViews = 0;

    for (const project of activeProjects) {
      const upvotes = await ctx.db
        .query("upvotes")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const newUpvotes = upvotes.filter(
        (u) => u.createdAt >= periodStart && u.createdAt < periodEnd
      ).length;

      const comments = await ctx.db
        .query("comments")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const newComments = comments.filter(
        (c) =>
          c.createdAt >= periodStart &&
          c.createdAt < periodEnd &&
          !c.isDeleted
      ).length;

      const adoptions = await ctx.db
        .query("adoptions")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const newAdoptions = adoptions.filter(
        (a) => a.createdAt >= periodStart && a.createdAt < periodEnd
      ).length;

      const views = await ctx.db
        .query("projectViews")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      const newViews = views.filter(
        (v) => v.viewedAt >= periodStart && v.viewedAt < periodEnd
      ).length;

      if (newUpvotes > 0 || newComments > 0 || newAdoptions > 0 || newViews > 0) {
        ownProjectActivity.push({
          projectId: project._id,
          projectName: project.name,
          newUpvotes,
          newComments,
          newAdoptions,
          newViews,
        });
      }

      totalNewUpvotes += newUpvotes;
      totalNewComments += newComments;
      totalNewAdoptions += newAdoptions;
      totalNewViews += newViews;
    }

    // ── Section 2: Activity in followed spaces ──

    const followedSpaces = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const followedSpaceActivity: SpaceActivity[] = [];

    for (const follow of followedSpaces) {
      const focusArea = await ctx.db.get(follow.focusAreaId);
      if (!focusArea || !focusArea.isActive) continue;

      // Top projects in this space created during the period
      const spaceProjects = await ctx.db
        .query("projects")
        .withIndex("by_status_focusArea_hotScore", (q) =>
          q.eq("status", "active").eq("focusAreaId", focusArea._id)
        )
        .order("desc")
        .collect();

      const newSpaceProjects = spaceProjects.filter(
        (p) => p._creationTime >= periodStart && p._creationTime < periodEnd
      );

      const topProjects: SpaceActivity["topProjects"] = [];
      for (const project of newSpaceProjects.slice(0, MAX_TOP_PROJECTS_PER_SPACE)) {
        const creator = await ctx.db.get(project.userId);
        topProjects.push({
          projectId: project._id,
          projectName: project.name,
          upvotes: project.upvotes,
          creatorName: creator?.name ?? "Unknown",
        });
      }

      // New threads in this space created during the period
      const spaceThreads = await ctx.db
        .query("threads")
        .withIndex("by_focusArea_hotScore", (q) =>
          q.eq("focusAreaId", focusArea._id)
        )
        .order("desc")
        .collect();

      const newSpaceThreads = spaceThreads.filter(
        (t) => t.createdAt >= periodStart && t.createdAt < periodEnd
      );

      const newThreads: SpaceActivity["newThreads"] = [];
      for (const thread of newSpaceThreads.slice(0, MAX_NEW_THREADS_PER_SPACE)) {
        const creator = await ctx.db.get(thread.userId);
        newThreads.push({
          threadId: thread._id,
          threadTitle: thread.title,
          creatorName: creator?.name ?? "Unknown",
        });
      }

      if (topProjects.length > 0 || newThreads.length > 0) {
        followedSpaceActivity.push({
          focusAreaId: focusArea._id,
          focusAreaName: focusArea.name,
          focusAreaIcon: focusArea.icon,
          topProjects,
          newThreads,
        });
      }
    }

    return {
      ownProjectActivity,
      ownProjectTotals: {
        totalNewUpvotes,
        totalNewComments,
        totalNewAdoptions,
        totalNewViews,
      },
      followedSpaceActivity,
    } satisfies DigestData;
  },
});

// ─── Internal: write digest record ────────────────────────────────────────────

export const writeDigestRecord = internalMutation({
  args: {
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    ownProjectActivity: v.array(
      v.object({
        projectId: v.id("projects"),
        projectName: v.string(),
        newUpvotes: v.number(),
        newComments: v.number(),
        newAdoptions: v.number(),
        newViews: v.number(),
      })
    ),
    ownProjectTotals: v.object({
      totalNewUpvotes: v.number(),
      totalNewComments: v.number(),
      totalNewAdoptions: v.number(),
      totalNewViews: v.number(),
    }),
    followedSpaceActivity: v.array(
      v.object({
        focusAreaId: v.id("focusAreas"),
        focusAreaName: v.string(),
        focusAreaIcon: v.optional(v.string()),
        topProjects: v.array(
          v.object({
            projectId: v.id("projects"),
            projectName: v.string(),
            upvotes: v.number(),
            creatorName: v.string(),
          })
        ),
        newThreads: v.array(
          v.object({
            threadId: v.id("threads"),
            threadTitle: v.string(),
            creatorName: v.string(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Deduplicate: skip if a digest already exists for this user and period
    const existing = await ctx.db
      .query("weeklyDigests")
      .withIndex("by_userId_periodEnd", (q) =>
        q.eq("userId", args.userId).eq("periodEnd", args.periodEnd)
      )
      .first();

    if (existing) return;

    const digestId = await ctx.db.insert("weeklyDigests", {
      userId: args.userId,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      status: "pending",
      ownProjectActivity: args.ownProjectActivity,
      ownProjectTotals: args.ownProjectTotals,
      followedSpaceActivity: args.followedSpaceActivity,
      createdAt: Date.now(),
    });

    // Enqueue the email for the batch sender
    await ctx.runMutation(internal.emails.enqueueEmail, {
      userId: args.userId,
      type: "weekly_digest",
      referenceId: digestId,
      payload: {
        ownProjectActivity: args.ownProjectActivity,
        ownProjectTotals: args.ownProjectTotals,
        followedSpaceActivity: args.followedSpaceActivity,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
      },
    });
  },
});
