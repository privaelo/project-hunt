import { query, QueryCtx, mutation, internalMutation, internalQuery } from "./_generated/server";
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
    .withIndex("by_externalUserId", (q) => q.eq("externalUserId", identity.subject))
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

    const [team, focusAreas, projects, follows] = await Promise.all([
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
      department: user.department ?? null,
      userIntent: user.userIntent ?? null,
      focusAreas: focusAreas.map((fa) => ({
        _id: fa._id,
        name: fa.name,
        group: fa.group,
        icon: fa.icon,
      })),
      projectCount: projects.length,
      followingCount: follows.length,
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

// Extracts Cognito custom claims that should be kept in sync with the user record.
// Add new synced attributes here — they will automatically be applied in all
// three ensureUser code paths (returning user, email re-link, new user insert).
function extractCognitoAttributes(identity: Record<string, unknown>) {
  const department = identity["custom:department"] as string | undefined;
  const avatarUrlId = identity["picture"] as string | undefined;

  return {
    ...(department !== undefined ? { department } : {}),
    ...(avatarUrlId !== undefined ? { avatarUrlId } : {}),
  };
}

// Called by the client after Cognito authentication to ensure the user
// record exists and is linked to the current Cognito identity.
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const cognitoSub = identity.subject;
    const email = identity.email;
    const name = identity.name ?? email ?? "Unknown User";

    const syncedAttrs = extractCognitoAttributes(identity as Record<string, unknown>);

    // 1. Try lookup by externalUserId (Cognito sub)
    const existingByExternalId = await ctx.db
      .query("users")
      .withIndex("by_externalUserId", (q) => q.eq("externalUserId", cognitoSub))
      .unique();

    if (existingByExternalId) {
      const changed = (Object.keys(syncedAttrs) as Array<keyof typeof syncedAttrs>).some(
        (k) => syncedAttrs[k] !== undefined && existingByExternalId[k] !== syncedAttrs[k]
      );
      if (changed) {
        await ctx.db.patch(existingByExternalId._id, syncedAttrs);
      }
      return existingByExternalId._id;
    }

    // 2. Try re-linking by email (for users migrated from WorkOS)
    if (email) {
      const emailLower = email.toLowerCase();
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email_lower", (q) => q.eq("emailLower", emailLower))
        .first();

      if (existingByEmail) {
        await ctx.db.patch(existingByEmail._id, {
          externalUserId: cognitoSub,
          workosUserId: undefined,
          ...syncedAttrs,
        });
        return existingByEmail._id;
      }
    }

    // 3. Create new user
    const userId = await ctx.db.insert("users", {
      externalUserId: cognitoSub,
      email: email ?? undefined,
      emailLower: email ? email.toLowerCase() : undefined,
      name,
      onboardingCompleted: false,
      ...syncedAttrs,
    });

    return userId;
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

// One-time backfill: populate emailLower for existing users that predate this field.
// Run once via the Convex dashboard after deploying: internal:users:backfillEmailLower
export const backfillEmailLower = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    for (const user of users) {
      if (user.email && user.emailLower === undefined) {
        await ctx.db.patch(user._id, { emailLower: user.email.toLowerCase() });
        updated++;
      }
    }
    return { updated };
  },
});

export const getEmailRecipient = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    return {
      name: user.name,
      email: user.email ?? null,
    };
  },
});
