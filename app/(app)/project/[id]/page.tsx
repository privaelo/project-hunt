"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/useCurrentUser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "@/components/CommentForm";
import { CommentThread } from "@/components/CommentThread";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { ProjectFileDownload } from "@/components/ProjectFileDownload";
import { RichTextContent } from "@/components/RichTextContent";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { Facepile } from "@/components/Facepile";
import Link from "next/link";
import { Eye, Link2, Pencil, Share } from "lucide-react";
import { SpaceIcon } from "@/components/SpaceIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const VIEWER_ID_STORAGE_KEY = "ph_viewer_id";

function getOrCreateViewerId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(VIEWER_ID_STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const created =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VIEWER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

function formatProjectLink(url: string, label?: string): {
  href: string;
  label: string;
} | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  if (label?.trim()) {
    return { href, label: label.trim() };
  }
  try {
    const hostname = new URL(href).hostname.replace(/^www\./, "");
    return {
      href,
      label: hostname || trimmed,
    };
  } catch {
    return {
      href,
      label: trimmed,
    };
  }
}

function getProjectLinks(project: { links?: Array<{ url: string; label?: string }> | null }): Array<{ href: string; label: string }> {
  if (!project.links || project.links.length === 0) return [];
  return project.links
    .map((l) => formatProjectLink(l.url, l.label))
    .filter((l): l is NonNullable<typeof l> => l !== null);
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { isAuthenticated, user } = useCurrentUser();
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const projectMedia = useQuery(api.projects.getProjectMedia, { projectId });
  const projectFile = useQuery(api.projects.getProjectFile, { projectId });
  const comments = useQuery(api.comments.getComments, { projectId });
  const toggleUpvote = useMutation(api.projects.toggleUpvote);
  const toggleAdoption = useMutation(api.projects.toggleAdoption);
  const trackView = useMutation(api.projects.trackView);
  const trackedProjectId = useRef<Id<"projects"> | null>(null);

  const isOwner = user && project && project.userId === user._id;
  const [shareOpen, setShareOpen] = useState(false);

  // Get top-level comments (no parent)
  const topLevelComments =
    comments?.filter((c) => !c.parentCommentId && !c.isDeleted) || [];

  useEffect(() => {
    if (!project) {
      return;
    }

    if (trackedProjectId.current === projectId) {
      return;
    }

    const viewerId = getOrCreateViewerId();
    if (!viewerId) {
      return;
    }

    trackedProjectId.current = projectId;
    void trackView({ projectId, viewerId });
  }, [project, projectId, trackView]);

  const handleUpvote = async () => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShareOpen(true);
  };

  const handleAdopt = async () => {
    try {
      await toggleAdoption({ projectId });
    } catch (error) {
      console.error("Failed to toggle adoption:", error);
    }
  };

  if (project === undefined) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center text-zinc-500">Loading project...</div>
        </div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <p className="text-xl font-semibold text-zinc-900">
              Project not found
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

  const projectLinks = getProjectLinks(project);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="space-y-8 lg:flex lg:items-start lg:gap-10 lg:space-y-0">
          <section className="flex-1 min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500 sm:flex-nowrap">
                <div className="flex items-center gap-2">
                  {project.focusArea ? (
                    <SpaceIcon icon={project.focusArea.icon} name={project.focusArea.name} size="md" />
                  ) : (
                    <Avatar className="h-8 w-8 bg-zinc-100 text-xs font-semibold text-zinc-600">
                      <AvatarImage
                        src={project.creatorAvatar}
                        alt={project.creatorName || "User"}
                      />
                      <AvatarFallback>
                        {(project.creatorName || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    {project.focusArea && (
                      <Link
                        href={`/space/${project.focusArea._id}`}
                        className="whitespace-nowrap text-xs font-semibold text-zinc-900 hover:underline"
                      >
                        g/{project.focusArea.name}
                      </Link>
                    )}
                    <Link
                      href={`/profile/${project.userId}`}
                      className="whitespace-nowrap text-xs text-zinc-500 hover:underline"
                    >
                      u/{project.creatorName || "Unknown User"}
                    </Link>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.viewCount ?? 0} views
                  </div>
                )}
              </div>

              <div className="relative">
                {isOwner && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/project/${id}/edit`)}
                    className="absolute -left-20 top-0"
                    size="icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-zinc-900">
                    {project.name}
                  </h1>
                  <ReadinessBadge status={project.readinessStatus} />
                </div>
              </div>
              {projectMedia && projectMedia.length > 0 && (
                <div className="mt-2">
                  <ProjectMediaCarousel media={projectMedia} />
                </div>
              )}

              {project.summary && (
                <RichTextContent html={project.summary} />
              )}
            </div>

            <div id="discussion" className="space-y-6">
              <div className="space-y-4">
                <CommentForm projectId={projectId} />
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
                        projectId={projectId}
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
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Used by
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <Facepile
                        adopters={project.adopters}
                        totalCount={project.adoptionCount}
                        maxVisible={6}
                        size="sm"
                        hasAdopted={project.hasAdopted}
                        showLabel={false}
                        currentUser={
                          user
                            ? {
                                _id: user._id,
                                name: user.name,
                                avatarUrl: user.avatarUrlId || "",
                              }
                            : null
                        }
                        isAuthenticated={isAuthenticated}
                        onToggle={handleAdopt}
                        projectId={projectId}
                      />
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
                            variant={project.hasUpvoted ? "default" : "outline"}
                            onClick={handleUpvote}
                            className={`h-9 rounded-md px-3 text-sm font-semibold hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all ${project.hasUpvoted ? "!text-primary-foreground hover:!bg-primary hover:!text-primary-foreground" : "!text-foreground hover:!bg-background hover:!text-foreground"}`}
                          >
                            ↑ {project.upvotes}
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
                              ↑ {project.upvotes}
                            </Link>
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-full bg-accent text-accent-foreground border-accent hover:bg-background hover:text-foreground hover:border-input"
                    onClick={handleShare}
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </Button>
                </div>

                {(projectLinks.length > 0 || (projectFile && projectFile.url)) && (
                  <div className="space-y-3 border-t border-zinc-300 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Links &amp; Downloads
                    </p>
                    <div className="space-y-2">
                      {projectFile && projectFile.url && (
                        <ProjectFileDownload
                          filename={projectFile.filename}
                          fileSize={projectFile.fileSize}
                          url={projectFile.url}
                        />
                      )}
                      {projectLinks.map((pl, i) => (
                        <a
                          key={i}
                          href={pl.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-m font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
                        >
                          <Link2 className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                          {pl.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
              The link to this project has been copied to your clipboard.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
