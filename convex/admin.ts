import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authKit } from "./auth";
import { internal } from "./_generated/api";
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

// One-time action to seed allowed domains from WorkOS organizations
export const seedAllowedDomains = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching organizations from WorkOS...");

    let organizations;
    try {
      const { data } = await authKit.workos.organizations.listOrganizations();
      organizations = data;
    } catch (error) {
      console.error("Failed to fetch organizations from WorkOS", error);
      throw new Error("Failed to fetch organizations from WorkOS");
    }

    console.log(`Found ${organizations.length} organizations`);

    let domainsInserted = 0;

    for (const org of organizations) {
      const domains = org.domains ?? [];
      console.log(
        `Processing org: ${org.name} (${org.id}) with ${domains.length} domains`
      );

      for (const domain of domains) {
        await ctx.runMutation(internal.admin.insertDomain, {
          domain: domain.domain,
          organizationId: org.id,
        });
        domainsInserted++;
      }
    }

    console.log(
      `Seeding complete. Processed ${domainsInserted} domain entries.`
    );

    return {
      success: true,
      organizationsProcessed: organizations.length,
      domainsInserted,
    };
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

// Migration: Remove tokenIdentifier field from all users
export const removeTokenIdentifierFromUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;

    for (const user of users) {
      if ("tokenIdentifier" in user && user.tokenIdentifier !== undefined) {
        await ctx.db.patch(user._id, { tokenIdentifier: undefined });
        updated++;
        console.log(`Removed tokenIdentifier from user: ${user.name}`);
      }
    }

    console.log(`Migration complete. Updated ${updated} of ${users.length} users.`);
    return { updated, total: users.length };
  },
});

// Internal mutation to upsert a user from WorkOS
export const upsertUserFromWorkOS = internalMutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrlId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", args.workosUserId))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrlId: args.avatarUrlId,
      });
      console.log(`Updated user: ${args.name} (${args.workosUserId})`);
      return { action: "updated", userId: existing._id };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      workosUserId: args.workosUserId,
      email: args.email,
      name: args.name,
      avatarUrlId: args.avatarUrlId,
      onboardingCompleted: false,
    });
    console.log(`Created user: ${args.name} (${args.workosUserId})`);
    return { action: "created", userId };
  },
});

// Seed users from WorkOS User Management
export const seedUsersFromWorkOS = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching users from WorkOS...");

    const users = await (await authKit.workos.userManagement.listUsers()).autoPagination();

    console.log(`Found ${users.length} users in WorkOS`);

    let created = 0;
    let updated = 0;

    for (const user of users) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown User";

      const result = await ctx.runMutation(internal.admin.upsertUserFromWorkOS, {
        workosUserId: user.id,
        email: user.email,
        name,
        avatarUrlId: user.profilePictureUrl ?? undefined,
      });

      if (result.action === "created") {
        created++;
      } else {
        updated++;
      }
    }

    console.log(`Seeding complete. Created ${created}, updated ${updated} users.`);

    return {
      success: true,
      usersProcessed: users.length,
      created,
      updated,
    };
  },
});

// Seed both users and allowed domains from WorkOS (convenience function)
export const seedFromWorkOS = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    users: { success: boolean; usersProcessed: number; created: number; updated: number };
    domains: { success: boolean; organizationsProcessed: number; domainsInserted: number };
  }> => {
    console.log("Seeding from WorkOS...");

    const usersResult = await ctx.runAction(internal.admin.seedUsersFromWorkOS, {});
    const domainsResult = await ctx.runAction(internal.admin.seedAllowedDomains, {});

    return {
      success: true,
      users: usersResult,
      domains: domainsResult,
    };
  },
});


export const deleteOrphanedRagEntries = internalMutation({
  args: {
    namespaceId: v.optional(vNamespaceId), // branded id (or omit to scan all namespaces)
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { namespaceId, cursor, dryRun }) => {
    const page = await rag.list(ctx, {
      ...(namespaceId ? { namespaceId } : {}),
      // optionally filter statuses; "ready" is usually what you want to keep clean
      // status: "ready",
      paginationOpts: { cursor: cursor ?? null, numItems: 100 },
    });

    let deleted = 0;

    for (const entry of page.page) {
      // The entryId is the join key you stored on your project documents.
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