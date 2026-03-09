import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { isEmailEnabled } from "./emails";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ─── Internal queries ────────────────────────────────────────────────────────

export const getSpaceInfo = internalQuery({
  args: { focusAreaId: v.id("focusAreas") },
  handler: async (ctx, args) => {
    const space = await ctx.db.get(args.focusAreaId);
    if (!space) return null;
    return {
      _id: space._id,
      name: space.name,
      icon: space.icon,
      isActive: space.isActive,
    };
  },
});

export const getSpaceFollowers = internalQuery({
  args: {
    focusAreaId: v.id("focusAreas"),
    excludeUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_focus_area", (q) =>
        q.eq("focusAreaId", args.focusAreaId)
      )
      .collect();

    const eligibleFollowers: Array<{ userId: typeof args.excludeUserId }> = [];

    for (const membership of memberships) {
      if (membership.userId === args.excludeUserId) continue;

      const user = await ctx.db.get(membership.userId);
      if (!user) continue;
      if (!user.onboardingCompleted) continue;
      if (!isEmailEnabled(user, "spaceActivity")) continue;

      eligibleFollowers.push({ userId: user._id });
    }

    return eligibleFollowers;
  },
});

// ─── Internal mutation: enqueue with dedup ───────────────────────────────────

export const enqueueSpaceActivityEmail = internalMutation({
  args: {
    userId: v.id("users"),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;

    const recentEmail = await ctx.db
      .query("emailQueue")
      .withIndex("by_userId_type_createdAt", (q) =>
        q
          .eq("userId", args.userId)
          .eq("type", "space_activity")
          .gte("createdAt", cutoff)
      )
      .first();

    if (recentEmail) return;

    await ctx.db.insert("emailQueue", {
      userId: args.userId,
      type: "space_activity",
      status: "pending",
      payload: args.payload,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal action: orchestrator ───────────────────────────────────────────

export const notifySpaceFollowers = internalAction({
  args: {
    focusAreaId: v.id("focusAreas"),
    contentType: v.union(v.literal("project"), v.literal("thread")),
    contentId: v.string(),
    contentTitle: v.string(),
    creatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const space = await ctx.runQuery(
      internal.spaceNotifications.getSpaceInfo,
      { focusAreaId: args.focusAreaId }
    );

    if (!space || !space.isActive) return;

    const creatorUser = await ctx.runQuery(
      internal.users.getEmailRecipient,
      { userId: args.creatorUserId }
    );

    const followers = await ctx.runQuery(
      internal.spaceNotifications.getSpaceFollowers,
      {
        focusAreaId: args.focusAreaId,
        excludeUserId: args.creatorUserId,
      }
    );

    if (followers.length === 0) return;

    const payload = {
      focusAreaName: space.name,
      focusAreaIcon: space.icon,
      contentType: args.contentType,
      contentId: args.contentId,
      contentTitle: args.contentTitle,
      creatorName: creatorUser?.name ?? "Someone",
    };

    for (const follower of followers) {
      await ctx.runMutation(
        internal.spaceNotifications.enqueueSpaceActivityEmail,
        {
          userId: follower.userId,
          payload,
        }
      );
    }

    console.log(
      `[spaceNotifications] Enqueued space_activity emails for ${followers.length} follower(s) in space "${space.name}"`
    );
  },
});
// redeploy