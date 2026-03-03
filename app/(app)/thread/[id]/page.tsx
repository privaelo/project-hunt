"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThreadCommentForm } from "@/components/ThreadCommentForm";
import { ThreadCommentThread } from "@/components/ThreadCommentThread";
import { RichTextContent } from "@/components/RichTextContent";
import Link from "next/link";
import { Forward } from "lucide-react";
import { SpaceIcon } from "@/components/SpaceIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { isAuthenticated } = useCurrentUser();
  const threadId = id as Id<"threads">;
  const thread = useQuery(api.threads.getById, { threadId });
  const comments = useQuery(api.threads.getComments, { threadId });
  const toggleUpvote = useMutation(api.threads.toggleUpvote);
  const [shareOpen, setShareOpen] = useState(false);

  const topLevelComments =
    comments?.filter((c) => !c.parentCommentId && !c.isDeleted) || [];

  const handleUpvote = async () => {
    try {
      await toggleUpvote({ threadId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShareOpen(true);
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
      <main className="mx-auto max-w-5xl px-6 py-10">
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
                        className="whitespace-nowrap hover:underline"
                      >
                        u/{thread.creatorName || "Unknown User"}
                      </Link>
                      <span className="text-zinc-300">&bull;</span>
                      <span>{getRelativeTime(thread.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-zinc-900">
                {thread.title}
              </h1>

              {thread.body && <RichTextContent html={thread.body} />}
            </div>

            <div id="discussion" className="space-y-6">
              <div className="space-y-4">
                <ThreadCommentForm threadId={threadId} />
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
                      <ThreadCommentThread
                        key={comment._id}
                        comment={comment}
                        allComments={comments}
                        threadId={threadId}
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
    </div>
  );
}
