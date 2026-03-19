import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, getCurrentUser } from "./users";
import { createProjectNotification } from "./notifications";
import { internal } from "./_generated/api";
import { enqueueCommentEmail, enqueueReplyEmail } from "./commentNotifications";
import { calculateHotScore, propagateHotScoreToMemberships } from "./projects";

export const addComment = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const commentId = await ctx.db.insert("comments", {
      projectId: args.projectId,
      userId: user._id,
      content: args.content,
      parentCommentId: args.parentCommentId,
      createdAt: Date.now(),
      upvotes: 0,
    });

    // Increment project engagement score and update hot score
    const project = await ctx.db.get(args.projectId);
    if (project) {
      const now = Date.now();
      const newEngagementScore = (project.engagementScore ?? 0) + 1;
      const newHotScore = calculateHotScore(newEngagementScore, project._creationTime, now, project.lastVersionAt ?? undefined);
      await ctx.db.patch(args.projectId, {
        engagementScore: newEngagementScore,
        hotScore: newHotScore,
      });
      await propagateHotScoreToMemberships(ctx, args.projectId, newHotScore);
    }

    if (project && project.userId !== user._id) {
      await createProjectNotification(ctx, {
        recipientUserId: project.userId,
        actorUserId: user._id,
        projectId: project._id,
        type: "comment",
        commentId,
      });

      await enqueueCommentEmail(ctx, {
        contentType: "project",
        contentId: args.projectId,
        contentTitle: project.name,
        contentOwnerUserId: project.userId,
        commenterUserId: user._id,
        commenterName: user.name,
        commentSnippet: args.content.slice(0, 200),
      });
    }

    // Notify followers of the project about the new comment
    await ctx.scheduler.runAfter(0, internal.notifications.notifyFollowersOfComment, {
      projectId: args.projectId,
      actorUserId: user._id,
      commentId,
    });

    // Notify the parent comment author when someone replies to their comment
    if (args.parentCommentId && project) {
      const parentComment = await ctx.db.get(args.parentCommentId);
      if (
        parentComment &&
        !parentComment.isDeleted &&
        parentComment.userId !== user._id &&
        parentComment.userId !== project.userId
      ) {
        await enqueueReplyEmail(ctx, {
          contentType: "project",
          contentId: args.projectId,
          contentTitle: project.name,
          parentCommentUserId: parentComment.userId,
          replierUserId: user._id,
          replierName: user.name,
          commentSnippet: args.content.slice(0, 200),
        });
      }
    }

    return commentId;
  },
});

export const getComments = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const sorted = comments.sort((a, b) => a.createdAt - b.createdAt);

    const user = await getCurrentUser(ctx);
    const userId = user?._id;

    const upvotedCommentIds = new Set<string>();
    if (userId) {
      const userUpvotes = await ctx.db
        .query("commentUpvotes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const upvote of userUpvotes) {
        upvotedCommentIds.add(upvote.commentId);
      }
    }

    // Enrich comments with user data; sanitize deleted comments
    const enrichedComments = await Promise.all(
      sorted.map(async (comment) => {
        if (comment.isDeleted) {
          return {
            ...comment,
            content: "[deleted]",
            upvotes: 0,
            hasUpvoted: false,
            userName: "[deleted]",
            userAvatar: "",
          };
        }
        const commentUser = await ctx.db.get(comment.userId);
        return {
          ...comment,
          upvotes: comment.upvotes ?? 0,
          hasUpvoted: upvotedCommentIds.has(comment._id),
          userName: commentUser?.name ?? "Unknown User",
          userAvatar: commentUser?.avatarUrlId ?? "",
        };
      })
    );

    return enrichedComments;
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only allow the comment owner to delete
    if (comment.userId !== user._id) {
      throw new Error("You can only delete your own comments");
    }

    // Soft delete to maintain thread integrity
    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      upvotes: 0,
    });

    // Decrement project engagement score and update hot score
    const project = await ctx.db.get(comment.projectId);
    if (project) {
      const now = Date.now();
      const newEngagementScore = Math.max(0, (project.engagementScore ?? 0) - 1);
      const newHotScore = calculateHotScore(newEngagementScore, project._creationTime, now, project.lastVersionAt ?? undefined);
      await ctx.db.patch(comment.projectId, {
        engagementScore: newEngagementScore,
        hotScore: newHotScore,
      });
      await propagateHotScoreToMemberships(ctx, comment.projectId, newHotScore);
    }

    const existingUpvotes = await ctx.db
      .query("commentUpvotes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    await Promise.all(existingUpvotes.map((upvote) => ctx.db.delete(upvote._id)));
  },
});

export const toggleCommentUpvote = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) {
      throw new Error("Comment not found");
    }

    const userId = user._id;
    const existing = await ctx.db
      .query("commentUpvotes")
      .withIndex("by_comment_and_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", userId)
      )
      .unique();

    const currentUpvotes = comment.upvotes ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      const updatedCount = Math.max(currentUpvotes - 1, 0);
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: false };
    } else {
      await ctx.db.insert("commentUpvotes", {
        commentId: args.commentId,
        userId,
        createdAt: Date.now(),
      });
      const updatedCount = currentUpvotes + 1;
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: true };
    }
  },
});
