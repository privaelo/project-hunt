"use client";

import { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { MessageCircle } from "lucide-react";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { Separator } from "@/components/ui/separator";
import { Facepile } from "@/components/Facepile";
import { useCurrentUser } from "@/app/useCurrentUser";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string | undefined;
};

type Project = {
  _id: Id<"projects">;
  _creationTime: number;
  name: string;
  summary?: string;
  team?: string;
  upvotes: number;
  viewCount: number;
  commentCount: number;
  hasUpvoted: boolean;
  userId: Id<"users">;
  creatorName: string;
  creatorAvatar: string;
  focusArea: FocusArea | null;
  readinessStatus?: "in_progress" | "ready_to_use";
  previewMedia: Array<{
    _id: string;
    storageId: string;
    type: string;
    url: string | null;
  }>;
  adoptionCount: number;
  adopters: Array<{
    _id: Id<"users">;
    name: string;
    avatarUrl: string;
  }>;
  hasAdopted: boolean;
};

type NewestProject = {
  _id: Id<"projects">;
  name: string;
  team: string;
  upvotes: number;
  creatorName: string;
  creatorAvatar: string;
  _creationTime: number;
};

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

export default function Home() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.listPaginated,
    {},
    { initialNumItems: 15 }
  );
  const { isAuthenticated, user } = useCurrentUser();
  const toggleUpvote = useMutation(api.projects.toggleUpvote);
  const toggleAdoption = useMutation(api.projects.toggleAdoption);

  // Build current user object for Facepile
  const currentUser = user
    ? { _id: user._id, name: user.name, avatarUrl: user.avatarUrlId || "" }
    : null;

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  // Infinite scroll with Intersection Observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMoreCallback = useCallback(() => {
    if (canLoadMore) {
      loadMore(15);
    }
  }, [canLoadMore, loadMore]);

  useEffect(() => {
    if (!canLoadMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCallback();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, loadMoreCallback]);

  const handleUpvote = async (projectId: Id<"projects">) => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  const handleAdopt = async (projectId: Id<"projects">) => {
    try {
      await toggleAdoption({ projectId });
    } catch (error) {
      console.error("Failed to toggle adoption:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 pb-16 pt-10">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                What people are making
              </h2>

            </div>
            <ShareProjectCallout />
            <LayoutGroup>
              <div className="space-y-0">
                {isLoading ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    Loading projects...
                  </div>
                ) : results.length ? (
                  <>
                    {results.map((project, index) => (
                      <React.Fragment key={project._id}>
                        {index > 0 && <Separator className="bg-zinc-200" />}
                        <motion.div
                          layout
                          layoutId={project._id}
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        >
                          <ProjectRow
                            project={project}
                            onUpvote={handleUpvote}
                            onAdopt={handleAdopt}
                            currentUser={currentUser}
                            isAuthenticated={isAuthenticated}
                          />
                        </motion.div>
                      </React.Fragment>
                    ))}
                    {/* Infinite scroll sentinel */}
                    <div ref={loadMoreRef} className="h-4" />
                    {isLoadingMore && (
                      <div className="py-4 text-center text-sm text-zinc-500">
                        Loading more projects...
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState />
                )}
              </div>
            </LayoutGroup>
          </div>

          <div className="flex flex-col gap-8">
            <NewestProjects />
          </div>
        </section>
      </main>
    </div>
  );
}

function ShareProjectCallout() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm">
      <div>
        <p className="text-sm text-zinc-600">
          Working on something? Share it in two lines.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Authenticated>
          <Link href="/submit">
            <Button size="sm" className="whitespace-nowrap">
              Share what you&apos;re working on
            </Button>
          </Link>
        </Authenticated>
        <Unauthenticated>
            <Button size="sm" className="whitespace-nowrap" asChild>
              <Link href="/sign-in" prefetch={false}>
                Share what you&apos;re working on
              </Link>
            </Button>
        </Unauthenticated>
        <AuthLoading>
          <Button size="sm" className="whitespace-nowrap" disabled>
            Share what you&apos;re working on
          </Button>
        </AuthLoading>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onUpvote,
  onAdopt,
  currentUser,
  isAuthenticated,
}: {
  project: Project;
  onUpvote: (projectId: Id<"projects">) => void;
  onAdopt: (projectId: Id<"projects">) => void;
  currentUser: { _id: Id<"users">; name: string; avatarUrl: string } | null;
  isAuthenticated: boolean;
}) {
  const router = useRouter();

  const handleProjectClick = () => {
    router.push(`/project/${project._id}`);
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(project._id);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/project/${project._id}#discussion`);
  };

  const handleAdoptClick = () => {
    onAdopt(project._id);
  };

  const hasMedia = project.previewMedia.length > 0;

  return (
    <div
      className="flex flex-col gap-2 pb-3 pt-3 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4"
      onClick={handleProjectClick}
    >
      {/* Header: Focus area, time, views, facepile */}
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${project.userId}`}
            className="font-medium text-zinc-600 transition-colors hover:text-green-600"
            onClick={(e) => e.stopPropagation()}
          >
            {project.focusArea
              ? `g/${project.focusArea.name}`
              : `u/${project.creatorName}`}
          </Link>
          <span className="text-zinc-300">•</span>
          <span>{getRelativeTime(project._creationTime)}</span>
        </div>
        <Facepile
          adopters={project.adopters}
          totalCount={project.adoptionCount}
          maxVisible={4}
          size="sm"
          hasAdopted={project.hasAdopted}
          currentUser={currentUser}
          isAuthenticated={isAuthenticated}
          onToggle={handleAdoptClick}
          projectId={project._id}
        />
      </div>

      {/* Title */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-xl font-semibold text-zinc-900">{project.name}</h3>
        <ReadinessBadge status={project.readinessStatus} />
      </div>

      {/* Media carousel OR summary - not both */}
      {hasMedia ? (
        <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <ProjectMediaCarousel media={project.previewMedia} />
        </div>
      ) : project.summary ? (
        <p className="text-sm leading-5 text-zinc-600 line-clamp-2 break-words">
          {project.summary}
        </p>
      ) : null}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
            <Button
              variant={project.hasUpvoted ? "default" : "outline"}
              size="sm"
              onClick={handleUpvoteClick}
              className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all ${project.hasUpvoted ? "hover:!bg-primary hover:!text-primary-foreground" : "hover:!bg-background hover:!text-foreground"}`}
            >
              <span aria-hidden="true">↑</span>
              <span>{project.upvotes}</span>
            </Button>
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium hover:!bg-background hover:!text-foreground hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all"
              asChild
            >
              <Link href="/sign-in" prefetch={false}>
                <span aria-hidden="true">↑</span>
                <span>{project.upvotes}</span>
              </Link>
            </Button>
          </motion.div>
        )}
        <motion.div whileTap={{ scale: 1.15, rotate: -3 }} transition={{ type: "spring", stiffness: 800, damping: 20 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 rounded-full px-3 h-8 text-sm font-medium hover:!bg-background hover:!text-foreground hover:ring-2 hover:ring-accent hover:ring-offset-2 transition-all"
            aria-label={`View ${project.commentCount} comments`}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>{project.commentCount}</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-zinc-100/60 p-6 text-center text-sm text-zinc-500 space-y-3">
      <p className="font-medium text-zinc-900">Quiet right now.</p>
      <p className="text-zinc-600">
        Plant something?
      </p>
      <Link href="/submit">
        <Button size="sm" className="whitespace-nowrap">
          Share what you&apos;re working on
        </Button>
      </Link>
    </div>
  );
}

function NewestProjectCard({ project }: { project: NewestProject }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/project/${project._id}`);
  };

  return (
    <div
      className="cursor-pointer space-y-2 rounded-lg p-3 transition-colors hover:bg-zinc-100"
      onClick={handleClick}
    >
      {/* Project Name */}
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-zinc-900 text-sm leading-tight line-clamp-2 flex-1">
          {project.name}
        </h4>
        <span className="text-xs text-zinc-500 whitespace-nowrap">
          {getRelativeTime(project._creationTime)}
        </span>
      </div>

      {/* Metadata: Team, Upvotes */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {project.team && (
          <>
            <span className="font-medium text-zinc-700">{project.team}</span>
            <span>•</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <span>↑</span>
          <span>{project.upvotes}</span>
        </span>
      </div>
    </div>
  );
}

function NewestProjects() {
  const newestProjects = useQuery(api.projects.getNewestProjects, { limit: 3 });

  return (
    <div className="flex flex-col gap-4 max-w-[320px]">
      <div className="flex items-center gap-2 px-3">
        <h3 className="text-2xl font-semibold text-zinc-900">Recently shared</h3>
      </div>

      {!newestProjects ? (
        // Loading state
        <div className="space-y-3 px-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : newestProjects.length === 0 ? (
        // Empty state
        <p className="text-sm text-zinc-500 px-3">Nothing here yet.</p>
      ) : (
        // Projects list
        <div className="flex flex-col gap-3">
          {newestProjects.map((project) => (
            <NewestProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
