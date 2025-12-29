import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authKit } from "./auth";
import { internal } from "./_generated/api";

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

    const { data: organizations } =
      await authKit.workos.organizations.listOrganizations();

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
