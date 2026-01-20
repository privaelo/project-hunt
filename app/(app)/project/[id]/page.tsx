"use client";

import { use, useEffect, useRef } from "react";
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
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { Facepile } from "@/components/Facepile";
import Link from "next/link";
import { Eye, Link2, Pencil } from "lucide-react";

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

function formatProjectLink(link?: string | null): {
  href: string;
  label: string;
} | null {
  if (!link) {
    return null;
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return null;
  }

  const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
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

  const projectLink = formatProjectLink(project.link);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="space-y-8 lg:flex lg:items-start lg:gap-10 lg:space-y-0">
          <section className="flex-1 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500 sm:flex-nowrap">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/profile/${project.userId}`}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Avatar className="h-8 w-8 bg-zinc-100 text-xs font-semibold text-zinc-600">
                      <AvatarImage
                        src={project.creatorAvatar}
                        alt={project.creatorName || "User"}
                      />
                      <AvatarFallback>
                        {(project.creatorName || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      By{" "}
                      <span className="font-medium text-zinc-900 hover:underline">
                        {project.creatorName || "Unknown User"}
                      </span>
                    </span>
                  </Link>
                  {project.team && (
                    <>
                      <span className="text-zinc-300">•</span>
                      <span className="whitespace-nowrap">
                        Team{" "}
                        <span className="font-medium text-zinc-900">
                          {project.team}
                        </span>
                      </span>
                    </>
                  )}
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
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm leading-5 text-zinc-600">
                    {project.summary}
                  </p>
                </div>
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

                {(projectLink || (projectFile && projectFile.url)) && (
                  <div className="space-y-3 border-t border-zinc-300 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Open &amp; download
                    </p>
                    {projectLink && (
                      <a
                        href={projectLink.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500"
                      >
                        <Link2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                        {projectLink.label}
                      </a>
                    )}
                    {projectFile && projectFile.url && (
                      <ProjectFileDownload
                        filename={projectFile.filename}
                        fileSize={projectFile.fileSize}
                        url={projectFile.url}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
