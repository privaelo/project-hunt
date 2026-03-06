import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import type { Doc } from "./_generated/dataModel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EmailCategory = "weeklyDigest" | "spaceActivity" | "projectActivity";

/**
 * Checks whether a user has a specific email category enabled.
 * Returns true if the preference is undefined (default opt-in).
 */
export function isEmailEnabled(
  user: Doc<"users">,
  category: EmailCategory
): boolean {
  const prefs = user.emailPreferences;
  if (!prefs) return true;
  const value = prefs[category];
  return value !== false;
}

// ─── Internal: enqueue a batch email ──────────────────────────────────────────

export const enqueueEmail = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    referenceId: v.optional(v.string()),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailQueue", {
      userId: args.userId,
      type: args.type,
      referenceId: args.referenceId,
      status: "pending",
      payload: args.payload,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal: sendEmail stub ─────────────────────────────────────────────────

/**
 * Placeholder for SES integration. Both the queue drainer and direct
 * ctx.scheduler.runAfter calls from real-time triggers will invoke this.
 */
export const sendEmail = internalAction({
  args: {
    userId: v.id("users"),
    type: v.string(),
    payload: v.any(),
  },
  handler: async (_ctx, args) => {
    // TODO: Implement SES email sending
    console.log(
      `[sendEmail stub] Would send "${args.type}" email to user ${args.userId}`
    );
  },
});

// ─── User-facing: preferences ─────────────────────────────────────────────────

export const getEmailPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const prefs = user.emailPreferences;
    return {
      weeklyDigest: prefs?.weeklyDigest !== false,
      spaceActivity: prefs?.spaceActivity !== false,
      projectActivity: prefs?.projectActivity !== false,
    };
  },
});

export const updateEmailPreferences = mutation({
  args: {
    weeklyDigest: v.optional(v.boolean()),
    spaceActivity: v.optional(v.boolean()),
    projectActivity: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const current = user.emailPreferences ?? {};
    const updated = {
      weeklyDigest: args.weeklyDigest ?? current.weeklyDigest,
      spaceActivity: args.spaceActivity ?? current.spaceActivity,
      projectActivity: args.projectActivity ?? current.projectActivity,
    };

    await ctx.db.patch(user._id, { emailPreferences: updated });
  },
});
