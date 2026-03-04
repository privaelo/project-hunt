"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "@/components/CommentForm";
import { CommentThread } from "@/components/CommentThread";
import { RichTextContent } from "@/components/RichTextContent";
import Link from "next/link";
import { Forward, Pencil, Trash2 } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SpaceIcon } from "@/components/SpaceIcon";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";


export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { isAuthenticated, user } = useCurrentUser();
  const threadId = id as Id<"threads">;
  const thread = useQuery(api.threads.getById, { threadId });
  const comments = useQuery(api.threads.getComments, { threadId });
  const toggleUpvote = useMutation(api.threads.toggleUpvote);
  const updateThread = useMutation(api.threads.updateThread);
  const deleteThread = useMutation(api.threads.deleteThread);
  const addComment = useMutation(api.threads.addComment);
  const deleteComment = useMutation(api.threads.deleteComment);
  const toggleCommentUpvote = useMutation(api.threads.toggleCommentUpvote);
  const [shareOpen, setShareOpen] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user && thread && thread.userId === user._id;

  const topLevelComments =
    comments?.filter((c) => !c.parentCommentId && !c.isDeleted) || [];

  const handleUpvote = async () => {
    try {
      await toggleUpvote({ threadId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
      toast.error("Failed to upvote. Please try again.");
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShareOpen(true);
  };

  const handleStartEdit = () => {
    if (!thread) return;
    setEditTitle(thread.title);
    setEditBody(thread.body || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditBody("");
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      await updateThread({
        threadId,
        title: editTitle.trim(),
        body: editBody.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update thread:", error);
      toast.error("Failed to update thread. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteThread({ threadId });
      if (thread?.focusArea) {
        router.push(`/space/${thread.focusArea._id}`);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Failed to delete thread. Please try again.");
      setIsDeleting(false);
    }
  };

  if (thread === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading thread...</div>
        </div>
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-900">
              Thread not found
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-5xl px-6 pt-4 pb-10">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {thread.focusArea && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/space/${thread.focusArea._id}`}>
                      g/{thread.focusArea.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem className="max-w-[200px] min-w-0">
              <BreadcrumbPage className="truncate" title={thread.title}>
                {thread.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="space-y-8 lg:flex lg:items-start lg:gap-10 lg:space-y-0">
          <section className="flex-1 min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500 sm:flex-nowrap">
                <div className="flex items-center gap-2">
                  {thread.focusArea ? (
                    <SpaceIcon
                      icon={thread.focusArea.icon}
                      name={thread.focusArea.name}
                      size="md"
                    />
                  ) : (
                    <Avatar className="h-8 w-8 bg-zinc-100 text-xs font-semibold text-zinc-600">
                      <AvatarImage
                        src={thread.creatorAvatar}
                        alt={thread.creatorName || "User"}
                      />
                      <AvatarFallback>
                        {(thread.creatorName || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    {thread.focusArea && (
                      <Link
                        href={`/space/${thread.focusArea._id}`}
                        className="whitespace-nowrap text-xs font-semibold text-zinc-900 hover:underline"
                      >
                        g/{thread.focusArea.name}
                      </Link>
                    )}
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Link
                        href={`/profile/${thread.userId}`}
                        className="whitespace-nowrap text-zinc-900 hover:underline"
                      >
                        u/{thread.creatorName || "Unknown User"}
                      </Link>
                      <span className="text-zinc-300">&bull;</span>
                      <span>{getRelativeTime(thread.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                    placeholder="Thread title"
                    className="text-base font-medium"
                    disabled={isSaving}
                    autoFocus
                  />
                  <Textarea
                    value={editBody}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditBody(e.target.value)}
                    placeholder="Add more context (optional)"
                    className="min-h-16 text-sm"
                    disabled={isSaving}
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteOpen(true)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isSaving || !editTitle.trim()}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-zinc-900">
                      {thread.title}
                    </h1>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEdit}
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {thread.body && <RichTextContent html={thread.body} />}
                </>
              )}
            </div>

            <div id="discussion" className="space-y-6">
              <div className="space-y-4">
                <CommentForm
                  onSubmit={(content) => addComment({ threadId, content })}
                />
                {comments === undefined ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    Loading comments...
                  </div>
                ) : topLevelComments.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-zinc-500">
                      No comments yet. Start the conversation?
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topLevelComments.map((comment) => (
                      <CommentThread
                        key={comment._id}
                        comment={comment}
                        allComments={comments}
                        onDelete={(id) => deleteComment({ commentId: id as Id<"threadComments"> })}
                        onToggleUpvote={(id) => toggleCommentUpvote({ commentId: id as Id<"threadComments"> })}
                        onSubmitReply={(content, parentId) => addComment({ threadId, content, parentCommentId: parentId as Id<"threadComments"> })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="w-full lg:w-72 xl:w-80">
            <div className="rounded-lg bg-zinc-100 p-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-500">
                      {thread.commentCount}{" "}
                      {thread.commentCount === 1 ? "comment" : "comments"}
                    </div>
                    {isAuthenticated ? (
                      <motion.div
                        whileTap={{ scale: 1.1, rotate: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 700,
                          damping: 20,
                        }}
                      >
                        <Button
                          variant={thread.hasUpvoted ? "default" : "outline"}
                          onClick={handleUpvote}
                          className={`h-9 rounded-md px-3 text-sm font-semibold hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all ${thread.hasUpvoted ? "!text-primary-foreground hover:!bg-primary hover:!text-primary-foreground" : "!text-foreground hover:!bg-background hover:!text-foreground"}`}
                        >
                          &uarr; {thread.upvoteCount}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        whileTap={{ scale: 1.1, rotate: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 700,
                          damping: 20,
                        }}
                      >
                        <Button
                          variant="outline"
                          className="h-9 rounded-md border-zinc-200 px-3 text-sm font-semibold !text-foreground hover:!bg-background hover:!text-foreground hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all"
                          asChild
                        >
                          <Link href="/sign-in" prefetch={false}>
                            &uarr; {thread.upvoteCount}
                          </Link>
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div>
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-full bg-accent text-accent-foreground border-accent hover:bg-background hover:text-foreground hover:border-input"
                    onClick={handleShare}
                  >
                    <Forward className="h-4 w-4" />
                    Share
                  </Button>
                </div>

              </div>
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link copied!</DialogTitle>
            <DialogDescription>
              The link to this thread has been copied to your clipboard.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this thread?</DialogTitle>
            <DialogDescription>
              This will permanently delete this thread along with all its
              comments and upvotes. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
