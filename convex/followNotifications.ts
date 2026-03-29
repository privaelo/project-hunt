import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isEmailEnabled, EMAIL_DEDUP_WINDOW_MS } from "./emails";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enqueues an email to a project follower when someone comments on a project
 * they follow. Skips the recipient if they are the commenter. Callers are
 * responsible for excluding the project owner before calling this helper.
 */
export async function enqueueFollowedCommentEmail(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users">;
    projectId: Id<"projects">;
    projectName: string;
    commenterName: string;
    commentSnippet: string;
  }
): Promise<void> {
  if (args.recipientUserId === args.actorUserId) return;

  const recipient = await ctx.db.get(args.recipientUserId);
  if (!recipient?.email) return;
  if (!recipient.onboardingCompleted) return;
  if (!isEmailEnabled(recipient, "followedProjectComment")) return;

  const cutoff = Date.now() - EMAIL_DEDUP_WINDOW_MS;
  const recentEmail = await ctx.db
    .query("emailQueue")
    .withIndex("by_userId_type_createdAt", (q) =>
      q
        .eq("userId", args.recipientUserId)
        .eq("type", "followed_project_comment")
        .gte("createdAt", cutoff)
    )
    .first();

  if (recentEmail) return;

  await ctx.db.insert("emailQueue", {
    userId: args.recipientUserId,
    type: "followed_project_comment",
    status: "pending",
    payload: {
      projectId: args.projectId,
      projectName: args.projectName,
      commenterName: args.commenterName,
      commentSnippet: args.commentSnippet,
    },
    createdAt: Date.now(),
  });
}

/**
 * Enqueues an email to a project follower when the project is updated or a new
 * version is released. Skips the actor (the person who made the update).
 */
export async function enqueueFollowedProjectUpdateEmail(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users">;
    projectId: Id<"projects">;
    projectName: string;
    actorName: string;
  }
): Promise<void> {
  if (args.recipientUserId === args.actorUserId) return;

  const recipient = await ctx.db.get(args.recipientUserId);
  if (!recipient?.email) return;
  if (!recipient.onboardingCompleted) return;
  if (!isEmailEnabled(recipient, "followedProjectUpdate")) return;

  const cutoff = Date.now() - EMAIL_DEDUP_WINDOW_MS;
  const recentEmail = await ctx.db
    .query("emailQueue")
    .withIndex("by_userId_type_createdAt", (q) =>
      q
        .eq("userId", args.recipientUserId)
        .eq("type", "followed_project_update")
        .gte("createdAt", cutoff)
    )
    .first();

  if (recentEmail) return;

  await ctx.db.insert("emailQueue", {
    userId: args.recipientUserId,
    type: "followed_project_update",
    status: "pending",
    payload: {
      projectId: args.projectId,
      projectName: args.projectName,
      actorName: args.actorName,
    },
    createdAt: Date.now(),
  });
}
