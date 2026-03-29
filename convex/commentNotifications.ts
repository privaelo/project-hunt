import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isEmailEnabled, EMAIL_DEDUP_WINDOW_MS } from "./emails";

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Enqueues a comment-activity email for the content owner.
 * Called from both project and thread addComment mutations.
 *
 * Skips if:
 * - The commenter is the content owner
 * - The owner has projectActivity emails disabled
 * - A comment_activity email was already enqueued for this user within the dedup window
 */
export async function enqueueCommentEmail(
  ctx: MutationCtx,
  args: {
    contentType: "project" | "thread";
    contentId: string;
    contentTitle: string;
    contentOwnerUserId: Id<"users">;
    commenterUserId: Id<"users">;
    commenterName: string;
    commentSnippet: string;
  }
): Promise<void> {
  if (args.commenterUserId === args.contentOwnerUserId) return;

  const owner = await ctx.db.get(args.contentOwnerUserId);
  if (!owner) return;
  if (!isEmailEnabled(owner, "projectActivity")) return;

  // Dedup: skip if a comment_activity email was recently enqueued for this user
  const cutoff = Date.now() - EMAIL_DEDUP_WINDOW_MS;
  const recentEmail = await ctx.db
    .query("emailQueue")
    .withIndex("by_userId_type_createdAt", (q) =>
      q
        .eq("userId", args.contentOwnerUserId)
        .eq("type", "comment_activity")
        .gte("createdAt", cutoff)
    )
    .first();

  if (recentEmail) return;

  await ctx.db.insert("emailQueue", {
    userId: args.contentOwnerUserId,
    type: "comment_activity",
    status: "pending",
    payload: {
      contentType: args.contentType,
      contentId: args.contentId,
      contentTitle: args.contentTitle,
      commenterName: args.commenterName,
      commentSnippet: args.commentSnippet,
    },
    createdAt: Date.now(),
  });
}

/**
 * Enqueues a reply-activity email for the parent comment author.
 * Called from addComment when parentCommentId is set.
 *
 * Skips if:
 * - The replier is the parent comment author
 * - The parent comment author has projectActivity emails disabled
 * - A comment_activity email was already enqueued for this user within the dedup window
 */
export async function enqueueReplyEmail(
  ctx: MutationCtx,
  args: {
    contentType: "project" | "thread";
    contentId: string;
    contentTitle: string;
    parentCommentUserId: Id<"users">;
    replierUserId: Id<"users">;
    replierName: string;
    commentSnippet: string;
  }
): Promise<void> {
  if (args.replierUserId === args.parentCommentUserId) return;

  const parentAuthor = await ctx.db.get(args.parentCommentUserId);
  if (!parentAuthor) return;
  if (!isEmailEnabled(parentAuthor, "projectActivity")) return;

  // Dedup: skip if a comment_activity email was recently enqueued for this user
  const cutoff = Date.now() - EMAIL_DEDUP_WINDOW_MS;
  const recentEmail = await ctx.db
    .query("emailQueue")
    .withIndex("by_userId_type_createdAt", (q) =>
      q
        .eq("userId", args.parentCommentUserId)
        .eq("type", "comment_activity")
        .gte("createdAt", cutoff)
    )
    .first();

  if (recentEmail) return;

  await ctx.db.insert("emailQueue", {
    userId: args.parentCommentUserId,
    type: "comment_activity",
    status: "pending",
    payload: {
      contentType: args.contentType,
      contentId: args.contentId,
      contentTitle: args.contentTitle,
      commenterName: args.replierName,
      commentSnippet: args.commentSnippet,
      isReply: true,
    },
    createdAt: Date.now(),
  });
}
