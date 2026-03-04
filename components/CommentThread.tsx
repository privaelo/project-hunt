"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "./CommentForm";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/app/useCurrentUser";
import Link from "next/link";
import { Reply, Trash2 } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";

export interface BaseComment {
  _id: string;
  userId: Id<"users">;
  content: string;
  parentCommentId?: string;
  createdAt: number;
  isDeleted?: boolean;
  upvotes?: number;
  hasUpvoted?: boolean;
  userName: string;
  userAvatar: string;
}

interface CommentThreadProps {
  comment: BaseComment;
  allComments: BaseComment[];
  onDelete: (commentId: string) => Promise<unknown>;
  onToggleUpvote: (commentId: string) => Promise<unknown>;
  onSubmitReply: (content: string, parentCommentId: string) => Promise<unknown>;
  depth?: number;
}

export function CommentThread({
  comment,
  allComments,
  onDelete,
  onToggleUpvote,
  onSubmitReply,
  depth = 0,
}: CommentThreadProps) {
  const { user } = useCurrentUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingUpvote, setIsTogglingUpvote] = useState(false);

  const replies = allComments.filter(
    (c) => c.parentCommentId === comment._id && !c.isDeleted
  );

  const isOwner = user?._id === comment.userId;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    try {
      await onDelete(comment._id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (comment.isDeleted) {
    return null;
  }

  const currentUpvotes = comment.upvotes ?? 0;
  const hasUpvoted = comment.hasUpvoted ?? false;

  const handleToggleUpvote = async () => {
    if (isTogglingUpvote) return;

    setIsTogglingUpvote(true);
    try {
      await onToggleUpvote(comment._id);
    } catch (error) {
      console.error("Failed to toggle comment upvote:", error);
      toast.error("Failed to update upvote. Please try again.");
    } finally {
      setIsTogglingUpvote(false);
    }
  };

  return (
    <div>
      <div className="py-3">
        <div className="flex items-start gap-3">
          <Link
            href={`/profile/${comment.userId}`}
            className="flex items-center gap-3"
          >
            <Avatar className="h-8 w-8 bg-zinc-100">
              <AvatarImage
                src={comment.userAvatar}
                alt={comment.userName || "User"}
              />
              <AvatarFallback className="text-xs font-semibold text-zinc-600">
                {(comment.userName || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-sm text-zinc-500">
              <Link
                href={`/profile/${comment.userId}`}
                className="font-medium text-zinc-900 hover:underline"
              >
                {comment.userName || "Unknown User"}
              </Link>
              <span>{getRelativeTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm leading-5 text-zinc-600 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant={hasUpvoted ? "default" : "outline"}
                size="sm"
                onClick={handleToggleUpvote}
                disabled={isTogglingUpvote}
                className="h-7 px-2 text-xs"
              >
                ↑ {currentUpvotes}
              </Button>
              {depth < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-7 px-2"
                  title="Reply"
                >
                  <Reply className="h-4 w-4" />
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReplyForm && (
        <div className="ml-11 mt-3">
          <CommentForm
            onSubmit={(content) => onSubmitReply(content, comment._id)}
            onCancel={() => setShowReplyForm(false)}
            placeholder="Write a reply..."
            submitText="Reply"
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l-2 border-zinc-300 pl-4">
          {replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              allComments={allComments}
              onDelete={onDelete}
              onToggleUpvote={onToggleUpvote}
              onSubmitReply={onSubmitReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
