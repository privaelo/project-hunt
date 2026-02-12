import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./rag";
import { vNamespaceId } from "@convex-dev/rag";

// Internal mutation to insert a domain
export const insertDomain = internalMutation({
  args: {
    domain: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if domain already exists
    const existing = await ctx.db
      .query("allowedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .unique();

    if (existing) {
      console.log(`Domain ${args.domain} already exists, skipping`);
      return;
    }

    await ctx.db.insert("allowedDomains", {
      domain: args.domain,
      organizationId: args.organizationId,
    });
    console.log(`Inserted domain: ${args.domain}`);
  },
});

// Utility to clear all allowed domains (use with caution)
export const clearAllowedDomains = internalMutation({
  args: {},
  handler: async (ctx) => {
    const domains = await ctx.db.query("allowedDomains").collect();
    for (const domain of domains) {
      await ctx.db.delete(domain._id);
    }
    console.log(`Cleared ${domains.length} allowed domains`);
    return { deleted: domains.length };
  },
});

// Migration: Rename workosUserId → externalUserId for Cognito migration
export const migrateWorkosToExternalUserId = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;

    for (const user of users) {
      const doc = user as Record<string, unknown>;
      if (doc.workosUserId && !user.externalUserId) {
        await ctx.db.patch(user._id, {
          externalUserId: doc.workosUserId as string,
        });
        updated++;
        console.log(`Migrated user: ${user.name} (${doc.workosUserId})`);
      }
    }

    console.log(`Migration complete. Updated ${updated} of ${users.length} users.`);
    return { updated, total: users.length };
  },
});

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
