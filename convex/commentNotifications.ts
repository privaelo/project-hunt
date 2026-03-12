import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isEmailEnabled } from "./emails";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

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
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
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
