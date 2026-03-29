import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { isEmailEnabled, EMAIL_DEDUP_WINDOW_MS } from "./emails";
import { pruneNotifications } from "./notifications";

// ─── Mention parsing ─────────────────────────────────────────────────────────

const PLAIN_TEXT_MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;
const HTML_MENTION_RE = /class="mention"[^>]*data-id="([^"]+)"/g;

/**
 * Extracts mentioned user IDs from plain text content.
 * Mention format: @[Username](userId)
 */
export function parseMentionsFromPlainText(content: string): string[] {
  const ids: string[] = [];
  let match;
  while ((match = PLAIN_TEXT_MENTION_RE.exec(content)) !== null) {
    ids.push(match[2]);
  }
  PLAIN_TEXT_MENTION_RE.lastIndex = 0;
  return [...new Set(ids)];
}

/**
 * Extracts mentioned user IDs from Quill HTML content.
 * Mention format: <span class="mention" data-id="userId" ...>@Name</span>
 */
export function parseMentionsFromHtml(html: string): string[] {
  const ids: string[] = [];
  let match;
  while ((match = HTML_MENTION_RE.exec(html)) !== null) {
    ids.push(match[1]);
  }
  HTML_MENTION_RE.lastIndex = 0;
  return [...new Set(ids)];
}

// ─── User search for mention typeahead ───────────────────────────────────────

export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const limit = args.limit ?? 8;

    if (!args.query.trim()) {
      return [];
    }

    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(limit + 1); // fetch one extra to account for filtering current user

    return results
      .filter((u) => u._id !== currentUser?._id)
      .slice(0, limit)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        avatarUrlId: u.avatarUrlId ?? "",
      }));
  },
});

// ─── Mention notifications ───────────────────────────────────────────────────

/**
 * Creates in-app notifications and enqueues emails for mentioned users.
 *
 * @param excludeUserIds - Users already being notified by other means
 *   (e.g., the project owner gets a "comment" notification, so skip duplicate "mention").
 */
export async function createMentionNotifications(
  ctx: MutationCtx,
  args: {
    mentionedUserIds: string[];
    actorUserId: Id<"users">;
    projectId?: Id<"projects">;
    threadId?: Id<"threads">;
    commentId?: Id<"comments">;
    threadCommentId?: Id<"threadComments">;
    contentTitle: string;
    contentSnippet?: string;
    excludeUserIds: Set<string>;
  }
): Promise<void> {
  const {
    mentionedUserIds,
    actorUserId,
    projectId,
    threadId,
    commentId,
    threadCommentId,
    contentTitle,
    contentSnippet,
    excludeUserIds,
  } = args;

  const recipientIds = [...new Set(mentionedUserIds)].filter(
    (id) => id !== actorUserId && !excludeUserIds.has(id)
  );

  if (recipientIds.length === 0) return;

  const actor = await ctx.db.get(actorUserId);
  const actorName = actor?.name ?? "Someone";
  const now = Date.now();

  for (const recipientId of recipientIds) {
    const recipientUserId = recipientId as Id<"users">;

    let recipient;
    try {
      recipient = await ctx.db.get(recipientUserId);
    } catch {
      // recipientId was parsed from user-controlled text and may not be a valid Convex ID
      continue;
    }
    if (!recipient) continue;

    await ctx.db.insert("notifications", {
      recipientUserId,
      actorUserId,
      projectId,
      threadId,
      threadCommentId,
      type: "mention",
      commentId,
      isRead: false,
      createdAt: now,
      lastActivityAt: now,
    });

    await pruneNotifications(ctx, recipientUserId);

    await enqueueMentionEmail(ctx, {
      recipient,
      actorName,
      contentTitle,
      contentSnippet,
      projectId,
      threadId,
    });
  }
}

async function enqueueMentionEmail(
  ctx: MutationCtx,
  args: {
    recipient: Doc<"users">;
    actorName: string;
    contentTitle: string;
    contentSnippet?: string;
    projectId?: Id<"projects">;
    threadId?: Id<"threads">;
  }
): Promise<void> {
  const { recipient } = args;
  if (!recipient.email) return;
  if (!recipient.onboardingCompleted) return;
  if (!isEmailEnabled(recipient, "mentions")) return;

  const cutoff = Date.now() - EMAIL_DEDUP_WINDOW_MS;
  const recentEmail = await ctx.db
    .query("emailQueue")
    .withIndex("by_userId_type_createdAt", (q) =>
      q
        .eq("userId", recipient._id)
        .eq("type", "mention_activity")
        .gte("createdAt", cutoff)
    )
    .first();

  if (recentEmail) return;

  await ctx.db.insert("emailQueue", {
    userId: recipient._id,
    type: "mention_activity",
    status: "pending",
    payload: {
      mentionerName: args.actorName,
      contentType: args.threadId ? "thread" : "project",
      contentId: (args.threadId ?? args.projectId) as string,
      contentTitle: args.contentTitle,
      commentSnippet: args.contentSnippet?.slice(0, 200),
    },
    createdAt: Date.now(),
  });
}
