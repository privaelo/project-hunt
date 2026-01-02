import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

const NOTIFICATION_HISTORY_LIMIT = 50;

async function pruneNotifications(
  ctx: MutationCtx,
  recipientUserId: Id<"users">
) {
  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_last_activity", (q) =>
      q.eq("recipientUserId", recipientUserId)
    )
    .order("desc")
    .collect();

  const overflow = notifications.slice(NOTIFICATION_HISTORY_LIMIT);
  await Promise.all(overflow.map((notification) => ctx.db.delete(notification._id)));
}

export async function createProjectNotification(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    actorUserId: Id<"users">;
    projectId: Id<"projects">;
    type: "comment" | "adoption" | "project_update";
    commentId?: Id<"comments">;
  }
) {
  const now = Date.now();
  await ctx.db.insert("notifications", {
    recipientUserId: args.recipientUserId,
    actorUserId: args.actorUserId,
    projectId: args.projectId,
    type: args.type,
    commentId: args.commentId,
    isRead: false,
    createdAt: now,
    lastActivityAt: now,
  });

  await pruneNotifications(ctx, args.recipientUserId);
}

export const notifyProjectUpdate = internalMutation({
  args: {
    projectId: v.id("projects"),
    actorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return;
    }

    const adoptions = await ctx.db
      .query("adoptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const recipients = Array.from(
      new Set(adoptions.map((adoption) => adoption.userId))
    ).filter((userId) => userId !== args.actorUserId);

    if (recipients.length === 0) {
      return;
    }

    await Promise.all(
      recipients.map((recipientUserId) =>
        createProjectNotification(ctx, {
          recipientUserId,
          actorUserId: args.actorUserId,
          projectId: args.projectId,
          type: "project_update",
        })
      )
    );
  },
});

async function updateUpvoteNotification(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    projectId: Id<"projects">;
    touch: boolean;
  }
) {
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_project_type", (q) =>
      q.eq("recipientUserId", args.recipientUserId)
        .eq("projectId", args.projectId)
        .eq("type", "upvote")
    )
    .unique();

  if (!existing && !args.touch) {
    return;
  }

  const upvotes = await ctx.db
    .query("upvotes")
    .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
    .collect();

  const filteredUpvotes = upvotes.filter(
    (upvote) => upvote.userId !== args.recipientUserId
  );
  const count = filteredUpvotes.length;

  if (count === 0) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return;
  }

  const latestUpvote = filteredUpvotes.sort(
    (a, b) => b.createdAt - a.createdAt
  )[0];

  if (!latestUpvote) {
    return;
  }

  const now = Date.now();

  if (existing) {
    const patch: {
      count: number;
      actorUserId: Id<"users">;
      lastActivityAt?: number;
      isRead?: boolean;
    } = {
      count,
      actorUserId: latestUpvote.userId,
    };

    if (args.touch) {
      patch.lastActivityAt = now;
      patch.isRead = false;
    }

    await ctx.db.patch(existing._id, patch);
    return;
  }

  await ctx.db.insert("notifications", {
    recipientUserId: args.recipientUserId,
    actorUserId: latestUpvote.userId,
    projectId: args.projectId,
    type: "upvote",
    count,
    isRead: false,
    createdAt: now,
    lastActivityAt: now,
  });

  await pruneNotifications(ctx, args.recipientUserId);
}

export async function upsertUpvoteNotification(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    projectId: Id<"projects">;
  }
) {
  await updateUpvoteNotification(ctx, { ...args, touch: true });
}

export async function syncUpvoteNotification(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<"users">;
    projectId: Id<"projects">;
  }
) {
  await updateUpvoteNotification(ctx, { ...args, touch: false });
}

export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) =>
        q.eq("recipientUserId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const getNotifications = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_last_activity", (q) =>
        q.eq("recipientUserId", user._id)
      )
      .order("desc")
      .take(args.limit);

    return await Promise.all(
      notifications.map(async (notification) => {
        const [actor, project, comment] = await Promise.all([
          ctx.db.get(notification.actorUserId),
          ctx.db.get(notification.projectId),
          notification.commentId ? ctx.db.get(notification.commentId) : null,
        ]);

        return {
          _id: notification._id,
          type: notification.type,
          projectId: notification.projectId,
          commentId: notification.commentId,
          count: notification.count,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          lastActivityAt: notification.lastActivityAt,
          actorName: actor?.name ?? "Someone",
          actorAvatar: actor?.avatarUrlId ?? "",
          projectName: project?.name ?? "your tool",
          isReply: Boolean(comment?.parentCommentId),
        };
      })
    );
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) =>
        q.eq("recipientUserId", user._id).eq("isRead", false)
      )
      .collect();

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});
