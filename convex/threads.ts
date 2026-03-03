import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import { calculateHotScore } from "./projects/helpers";

// ─── Creation ────────────────────────────────────────────────────────────────

export const createThread = mutation({
  args: {
    title: v.string(),
    body: v.optional(v.string()),
    focusAreaId: v.id("focusAreas"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

    const threadId = await ctx.db.insert("threads", {
      title: args.title.trim(),
      body: args.body?.trim() || undefined,
      userId: user._id,
      focusAreaId: args.focusAreaId,
      upvoteCount: 0,
      commentCount: 0,
      engagementScore: 0,
      hotScore: calculateHotScore(0, now, now),
      createdAt: now,
    });

    return threadId;
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getById = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const currentUser = await getCurrentUser(ctx);

    const [creator, focusArea] = await Promise.all([
      ctx.db.get(thread.userId),
      ctx.db.get(thread.focusAreaId),
    ]);

    let hasUpvoted = false;
    if (currentUser) {
      const existingUpvote = await ctx.db
        .query("threadUpvotes")
        .withIndex("by_thread_and_user", (q) =>
          q.eq("threadId", args.threadId).eq("userId", currentUser._id)
        )
        .unique();
      hasUpvoted = !!existingUpvote;
    }

    return {
      ...thread,
      creatorName: creator?.name ?? "Unknown User",
      creatorAvatar: creator?.avatarUrlId ?? "",
      hasUpvoted,
      focusArea: focusArea
        ? {
            _id: focusArea._id,
            name: focusArea.name,
            group: focusArea.group,
            icon: focusArea.icon,
          }
        : null,
    };
  },
});

export const listPaginatedBySpace = query({
  args: {
    focusAreaId: v.id("focusAreas"),
    sort: v.optional(
      v.union(
        v.literal("trending"),
        v.literal("new"),
        v.literal("most_commented")
      )
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const sort = args.sort ?? "trending";
    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    let paginatedResult;

    if (sort === "new") {
      paginatedResult = await ctx.db
        .query("threads")
        .withIndex("by_focusArea_createdAt", (q) =>
          q.eq("focusAreaId", args.focusAreaId)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (sort === "most_commented") {
      paginatedResult = await ctx.db
        .query("threads")
        .withIndex("by_focusArea_commentCount", (q) =>
          q.eq("focusAreaId", args.focusAreaId)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      // trending (default)
      paginatedResult = await ctx.db
        .query("threads")
        .withIndex("by_focusArea_hotScore", (q) =>
          q.eq("focusAreaId", args.focusAreaId)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const enrichedThreads = await Promise.all(
      paginatedResult.page.map(async (thread) => {
        const [creator, focusArea] = await Promise.all([
          ctx.db.get(thread.userId),
          ctx.db.get(thread.focusAreaId),
        ]);

        let hasUpvoted = false;
        if (userId) {
          const existingUpvote = await ctx.db
            .query("threadUpvotes")
            .withIndex("by_thread_and_user", (q) =>
              q.eq("threadId", thread._id).eq("userId", userId)
            )
            .unique();
          hasUpvoted = !!existingUpvote;
        }

        return {
          ...thread,
          creatorName: creator?.name ?? "Unknown User",
          creatorAvatar: creator?.avatarUrlId ?? "",
          hasUpvoted,
          focusArea: focusArea
            ? {
                _id: focusArea._id,
                name: focusArea.name,
                group: focusArea.group,
                icon: focusArea.icon,
              }
            : null,
        };
      })
    );

    return {
      ...paginatedResult,
      page: enrichedThreads,
    };
  },
});

// ─── Upvotes ─────────────────────────────────────────────────────────────────

export const toggleUpvote = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const existing = await ctx.db
      .query("threadUpvotes")
      .withIndex("by_thread_and_user", (q) =>
        q.eq("threadId", args.threadId).eq("userId", user._id)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.delete(existing._id);
      const newUpvoteCount = Math.max(0, thread.upvoteCount - 1);
      const newEngagementScore = Math.max(
        0,
        (thread.engagementScore ?? 0) - 1
      );
      await ctx.db.patch(args.threadId, {
        upvoteCount: newUpvoteCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
      return { upvoted: false };
    } else {
      await ctx.db.insert("threadUpvotes", {
        threadId: args.threadId,
        userId: user._id,
        createdAt: now,
      });
      const newUpvoteCount = thread.upvoteCount + 1;
      const newEngagementScore = (thread.engagementScore ?? 0) + 1;
      await ctx.db.patch(args.threadId, {
        upvoteCount: newUpvoteCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
      return { upvoted: true };
    }
  },
});

// ─── Comments ────────────────────────────────────────────────────────────────

export const addComment = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
    parentCommentId: v.optional(v.id("threadComments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const commentId = await ctx.db.insert("threadComments", {
      threadId: args.threadId,
      userId: user._id,
      content: args.content,
      parentCommentId: args.parentCommentId,
      createdAt: Date.now(),
      upvotes: 0,
    });

    // Increment thread engagement score and comment count
    const thread = await ctx.db.get(args.threadId);
    if (thread) {
      const now = Date.now();
      const newCommentCount = thread.commentCount + 1;
      const newEngagementScore = (thread.engagementScore ?? 0) + 1;
      await ctx.db.patch(args.threadId, {
        commentCount: newCommentCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
    }

    return commentId;
  },
});

export const getComments = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("threadComments")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const sorted = comments.sort((a, b) => a.createdAt - b.createdAt);

    const currentUser = await getCurrentUser(ctx);
    const userId = currentUser?._id;

    const enrichedComments = await Promise.all(
      sorted.map(async (comment) => {
        const commentUser = await ctx.db.get(comment.userId);

        let hasUpvoted = false;
        if (userId) {
          const existing = await ctx.db
            .query("threadCommentUpvotes")
            .withIndex("by_comment_and_user", (q) =>
              q.eq("commentId", comment._id).eq("userId", userId)
            )
            .unique();
          hasUpvoted = !!existing;
        }

        return {
          ...comment,
          upvotes: comment.upvotes ?? 0,
          hasUpvoted,
          userName: commentUser?.name ?? "Unknown User",
          userAvatar: commentUser?.avatarUrlId ?? "",
        };
      })
    );

    return enrichedComments;
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("threadComments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== user._id)
      throw new Error("You can only delete your own comments");

    await ctx.db.patch(args.commentId, {
      isDeleted: true,
      upvotes: 0,
    });

    // Decrement thread engagement score and comment count
    const thread = await ctx.db.get(comment.threadId);
    if (thread) {
      const now = Date.now();
      const newCommentCount = Math.max(0, thread.commentCount - 1);
      const newEngagementScore = Math.max(
        0,
        (thread.engagementScore ?? 0) - 1
      );
      await ctx.db.patch(comment.threadId, {
        commentCount: newCommentCount,
        engagementScore: newEngagementScore,
        hotScore: calculateHotScore(newEngagementScore, thread.createdAt, now),
      });
    }

    // Clean up comment upvotes
    const existingUpvotes = await ctx.db
      .query("threadCommentUpvotes")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    await Promise.all(existingUpvotes.map((upvote) => ctx.db.delete(upvote._id)));
  },
});

export const toggleCommentUpvote = mutation({
  args: { commentId: v.id("threadComments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.isDeleted) throw new Error("Comment not found");

    const existing = await ctx.db
      .query("threadCommentUpvotes")
      .withIndex("by_comment_and_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", user._id)
      )
      .unique();

    const currentUpvotes = comment.upvotes ?? 0;

    if (existing) {
      await ctx.db.delete(existing._id);
      const updatedCount = Math.max(currentUpvotes - 1, 0);
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: false };
    } else {
      await ctx.db.insert("threadCommentUpvotes", {
        commentId: args.commentId,
        userId: user._id,
        createdAt: Date.now(),
      });
      const updatedCount = currentUpvotes + 1;
      await ctx.db.patch(args.commentId, { upvotes: updatedCount });
      return { upvotes: updatedCount, hasUpvoted: true };
    }
  },
});
