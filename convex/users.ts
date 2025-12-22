import { query, QueryCtx, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// this is the mutation that stores the user in the database downstream of workos user registration action
export const store = mutation({
  args: { workosUserId: v.string(), name: v.string(), avatarUrlId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    // Note: If you don't want to define an index right away, you can use
    // ctx.db.query("users")
    //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    //  .unique();
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      // If we've seen this identity before but the name or avatar url has changed, patch the value.
      if (user.name !== args.name || user.avatarUrlId !== args.avatarUrlId) {
        await ctx.db.patch(user._id, { name: args.name, avatarUrlId: args.avatarUrlId });
      }
      return user._id;
    }
    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: args.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
      avatarUrlId: args.avatarUrlId,
      workosUserId: args.workosUserId,
      onboardingCompleted: false,
    });
  },
});

// export const upsertFromClerk = internalMutation({
//   args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
//   async handler(ctx, { data }) {
//     const userAttributes = {
//       name: `${data.first_name} ${data.last_name}`,
//       externalId: data.id,
//       avatarUrlId: data.image_url,
//       email: data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address,
//     };

//     const user = await userByExternalId(ctx, data.id);
//     if (user === null) {
//       await ctx.db.insert("users", userAttributes);
//     } else {
//       await ctx.db.patch(user._id, userAttributes);
//     }
//   },
// });

// export const deleteFromClerk = internalMutation({
//   args: { clerkUserId: v.string() },
//   async handler(ctx, { clerkUserId }) {
//     const user = await userByExternalId(ctx, clerkUserId);

//     if (user !== null) {
//       await ctx.db.delete(user._id);
//     } else {
//       console.warn(
//         `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
//       );
//     }
//   },
// });

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
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// export async function getCurrentUser(ctx: QueryCtx) {
//   const identity = await ctx.auth.getUserIdentity();
//   if (identity === null) {
//     return null;
//   }
//   return await userByTokenIdentifier(ctx, identity.tokenIdentifier);
// }

// other users will be fetched by their document id according to convex conventions
// export async function userByTokenIdentifier(ctx: QueryCtx, tokenIdentifier: string) {
//   return await ctx.db
//     .query("users")
//     .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
//     .unique();
// }

// Get focus areas for a specific user
export const getUserFocusAreas = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userFocusAreas = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Fetch the actual focus area details
    const focusAreas = await Promise.all(
      userFocusAreas.map(async (ufa) => {
        return await ctx.db.get(ufa.focusAreaId);
      })
    );

    return focusAreas.filter((fa) => fa !== null);
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

    const [team, focusAreaLinks, projects, adoptions] = await Promise.all([
      user.teamId ? ctx.db.get(user.teamId) : Promise.resolve(null),
      ctx.db
        .query("userFocusAreas")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("projects")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("adoptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
    ]);

    const focusAreas = await Promise.all(
      focusAreaLinks.map(async (link) => {
        const focusArea = await ctx.db.get(link.focusAreaId);
        if (!focusArea) {
          return null;
        }
        return {
          _id: focusArea._id,
          name: focusArea.name,
          group: focusArea.group,
        };
      })
    );

    return {
      _id: user._id,
      name: user.name,
      avatarUrlId: user.avatarUrlId ?? "",
      team: team?.name ?? "",
      userIntent: user.userIntent ?? null,
      focusAreas: focusAreas.filter((fa): fa is NonNullable<typeof fa> => fa !== null),
      projectCount: projects.length,
      adoptionCount: adoptions.length,
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    focusAreaIds: v.array(v.id("focusAreas")),
    userIntent: v.optional(v.union(v.literal("looking"), v.literal("sharing"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Update user with team and mark onboarding as completed
    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      teamId: args.teamId,
      userIntent: args.userIntent,
    });

    // Clear existing focus area relationships before adding new ones
    const existingFocusAreas = await ctx.db
      .query("userFocusAreas")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    await Promise.all(existingFocusAreas.map((ufa) => ctx.db.delete(ufa._id)));

    // Create userFocusArea relationships in junction table
    const createdAt = Date.now();
    await Promise.all(
      args.focusAreaIds.map((focusAreaId) =>
        ctx.db.insert("userFocusAreas", {
          userId: user._id,
          focusAreaId,
          createdAt,
        })
      )
    );

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
