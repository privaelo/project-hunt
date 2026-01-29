import { query, QueryCtx, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const currentWithFocusAreas = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const focusAreaLinks = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const focusAreaIds = focusAreaLinks.map((link) => link.focusAreaId);

    return { ...user, focusAreaIds };
  },
});

// use this to get the current user document for linking _id to other documents and such. If the user is not found, throw an error.
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_workosUserId", (q) => q.eq("workosUserId", identity.subject))
    .unique();
}

// Shared helper: fetch focus areas for a user (used by getUserFocusAreas query and getProfile)
export async function fetchUserFocusAreas(ctx: QueryCtx, userId: Id<"users">) {
  const links = await ctx.db
    .query("userFocusAreas")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const focusAreas = await Promise.all(
    links.map((link) => ctx.db.get(link.focusAreaId))
  );

  return focusAreas.filter((fa) => fa !== null);
}

// Get focus areas for a specific user
export const getUserFocusAreas = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await fetchUserFocusAreas(ctx, args.userId);
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    if (!viewer) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const [team, focusAreas, projects, adoptions] = await Promise.all([
      user.teamId ? ctx.db.get(user.teamId) : Promise.resolve(null),
      fetchUserFocusAreas(ctx, user._id),
      ctx.db
        .query("projects")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("adoptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);

    return {
      _id: user._id,
      name: user.name,
      avatarUrlId: user.avatarUrlId ?? "",
      email: user.email ?? null,
      team: team?.name ?? "",
      userIntent: user.userIntent ?? null,
      focusAreas: focusAreas.map((fa) => ({
        _id: fa._id,
        name: fa.name,
        group: fa.group,
        icon: fa.icon,
      })),
      projectCount: projects.length,
      adoptionCount: adoptions.length,
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    userIntent: v.optional(v.union(v.literal("looking"), v.literal("sharing"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      teamId: args.teamId,
      userIntent: args.userIntent,
    });

    return { success: true };
  },
});

export const getActiveUsers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 4;
    const users = await ctx.db.query("users").collect();

    const usersWithScores = await Promise.all(
      users.map(async (user) => {
        // Only consider how many upvotes the user's projects receive
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const upvoteCounts = await Promise.all(
          projects.map(async (project) => {
            const upvotes = await ctx.db
              .query("upvotes")
              .withIndex("by_project", (q) => q.eq("projectId", project._id))
              .collect();
            return upvotes.length;
          })
        );
        const score = upvoteCounts.reduce((a, b) => a + b, 0);

        // Get team name
        let teamName = "";
        if (user.teamId) {
          const team = await ctx.db.get(user.teamId);
          teamName = team?.name ?? "";
        }

        return {
          _id: user._id,
          name: user.name,
          avatarUrlId: user.avatarUrlId ?? "",
          team: teamName,
          score,
          projectCount: projects.length,
        };
      })
    );

    // Return top users by score (filter out zero activity)
    return usersWithScores
      .filter((u) => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
});
