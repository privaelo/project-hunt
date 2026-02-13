import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./rag";
import { vNamespaceId } from "@convex-dev/rag";

// Internal mutation to upsert a user
export const upsertUser = internalMutation({
  args: {
    externalUserId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrlId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_externalUserId", (q) => q.eq("externalUserId", args.externalUserId))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrlId: args.avatarUrlId,
      });
      console.log(`Updated user: ${args.name} (${args.externalUserId})`);
      return { action: "updated" as const, userId: existing._id };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      externalUserId: args.externalUserId,
      email: args.email,
      name: args.name,
      avatarUrlId: args.avatarUrlId,
      onboardingCompleted: false,
    });
    console.log(`Created user: ${args.name} (${args.externalUserId})`);
    return { action: "created" as const, userId };
  },
});

export const deleteOrphanedRagEntries = internalMutation({
  args: {
    namespaceId: v.optional(vNamespaceId),
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { namespaceId, cursor, dryRun }) => {
    const page = await rag.list(ctx, {
      ...(namespaceId ? { namespaceId } : {}),
      paginationOpts: { cursor: cursor ?? null, numItems: 100 },
    });

    let deleted = 0;

    for (const entry of page.page) {
      const project = await ctx.db
        .query("projects")
        .withIndex("by_entryId", (q) => q.eq("entryId", entry.entryId))
        .first();

      if (!project) {
        if (!dryRun) {
          await rag.deleteAsync(ctx, { entryId: entry.entryId });
        }
        deleted += 1;
      }
    }

    return {
      deleted,
      continueCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
    };
  },
});
