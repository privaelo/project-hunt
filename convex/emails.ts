import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
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

// ─── Queue drainer ───────────────────────────────────────────────────────────

const DRAIN_BATCH_SIZE = 50;

export const getPendingEmails = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailQueue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(args.limit);
  },
});

export const markEmailSent = internalMutation({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "sent",
      sentAt: Date.now(),
    });
  },
});

export const markEmailFailed = internalMutation({
  args: { emailId: v.id("emailQueue"), reason: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: "failed",
      failureReason: args.reason,
    });
  },
});

export const drainEmailQueue = internalAction({
  handler: async (ctx) => {
    const batch = await ctx.runQuery(internal.emails.getPendingEmails, {
      limit: DRAIN_BATCH_SIZE,
    });

    if (batch.length === 0) return;

    let sent = 0;
    let failed = 0;

    for (const email of batch) {
      try {
        await ctx.runAction(internal.emails.sendEmail, {
          userId: email.userId,
          type: email.type,
          payload: email.payload,
        });
        await ctx.runMutation(internal.emails.markEmailSent, {
          emailId: email._id,
        });
        sent++;
      } catch (error) {
        await ctx.runMutation(internal.emails.markEmailFailed, {
          emailId: email._id,
          reason: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    console.log(
      `[drainEmailQueue] Processed ${batch.length} emails: ${sent} sent, ${failed} failed`
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
