// convex/auth.ts
import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const authFunctions: AuthFunctions = internal.auth;

export const authKit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
  additionalEventTypes: [
    "organization_domain.created",
    "organization_domain.deleted",
  ],
});

export const { authKitEvent } = authKit.events({
  "user.created": async (ctx, event) => {
    await ctx.db.insert("users", {
      workosUserId: event.data.id,
      email: event.data.email,
      name: `${event.data.firstName} ${event.data.lastName}`,
      avatarUrlId: event.data.profilePictureUrl ?? undefined,
      onboardingCompleted: false,
    });
  },
  "user.updated": async (ctx, event) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", event.data.id))
      .unique();
    if (!user) {
      console.warn(`User not found: ${event.data.id}`);
      return;
    }
    await ctx.db.patch(user._id, {
      email: event.data.email,
      name: `${event.data.firstName} ${event.data.lastName}`,
    });
  },
  "user.deleted": async (ctx, event) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosUserId", (q) => q.eq("workosUserId", event.data.id))
      .unique();
    if (!user) {
      console.warn(`User not found: ${event.data.id}`);
      return;
    }
    await ctx.db.delete(user._id);
  },

  // Organization domain sync events
  "organization_domain.created": async (ctx, event) => {
    console.log("onDomainCreated", event);

    // Check if domain already exists
    const existing = await ctx.db
      .query("allowedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", event.data.domain))
      .unique();

    if (existing) {
      console.log(`Domain ${event.data.domain} already exists, skipping`);
      return;
    }

    await ctx.db.insert("allowedDomains", {
      domain: event.data.domain,
      organizationId: event.data.organizationId,
    });
  },
  "organization_domain.deleted": async (ctx, event) => {
    console.log("onDomainDeleted", event);

    const domain = await ctx.db
      .query("allowedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", event.data.domain))
      .unique();

    if (domain) {
      await ctx.db.delete(domain._id);
    }
  },
});

// Action handlers (replaces your API route)
export const { authKitAction } = authKit.actions({
  userRegistration: async (ctx, action, response) => {
    const emailDomain = action.userData.email.split("@")[1];

    if (!emailDomain) {
      return response.deny("Invalid email address");
    }

    // Check if domain is allowed
    const allowed = await ctx.db
      .query("allowedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", emailDomain))
      .unique();

    if (!allowed) {
      return response.deny("Email domain not allowed");
    }

    return response.allow();
  },
});