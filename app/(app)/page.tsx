"use client";

import { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Eye, Info, MessageCircle, Play } from "lucide-react";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { FocusAreaBadges } from "@/components/FocusAreaBadges";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Facepile } from "@/components/Facepile";
import { useCurrentUser } from "@/app/useCurrentUser";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string;
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
  focusAreas: FocusArea[];
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
                What builders are making
              </h2>
              <p className="mt-2 text-lg text-zinc-600">
                See what&apos;s growing, or share your own.
              </p>
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
            <FocusAreaSpotlight projects={results} userId={user?._id ?? null} />
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
      className="flex flex-col gap-3 pb-4 pt-4 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4"
      onClick={handleProjectClick}
    >
      {/* Header: Creator info, team, facepile */}
      <div className="flex items-center justify-between gap-2 text-sm text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${project.userId}`}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Avatar className="h-6 w-6 bg-zinc-100 text-xs font-semibold text-zinc-600">
              <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
              <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-zinc-700 hover:underline">
              {project.creatorName || "Unknown User"}
            </span>
          </Link>
          {project.team && (
            <>
              <span className="text-zinc-300">•</span>
              <span className="whitespace-nowrap text-zinc-500">{project.team}</span>
            </>
          )}
          <span className="text-zinc-300">•</span>
          <span className="whitespace-nowrap text-zinc-500">
            {getRelativeTime(project._creationTime)}
          </span>
          <span className="text-zinc-300">•</span>
          <span className="flex items-center gap-1 whitespace-nowrap text-xs text-zinc-400">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {project.viewCount}
          </span>
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
        <p className="text-sm text-zinc-600 line-clamp-2 break-words">
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
        {project.focusAreas.length > 0 && (
          <div className="ml-auto">
            <FocusAreaBadges
              focusAreas={project.focusAreas}
              className="text-xs"
            />
          </div>
        )}
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

function FocusAreaSpotlight({
  projects,
  userId,
}: {
  projects: Project[];
  userId: Id<"users"> | null;
}) {
  const focusAreas = useQuery(
    api.users.getUserFocusAreas,
    userId ? { userId } : "skip"
  ) as FocusArea[] | undefined;

  if (!userId) {
    return null;
  }

  if (!focusAreas || focusAreas.length === 0) {
    return null;
  }

  const focusAreaIds = new Set(focusAreas.map((area) => area._id));
  const spotlightProjects = projects
    .filter((project) =>
      project.focusAreas.some((area) => focusAreaIds.has(area._id))
    )
    .slice(0, 4);

  if (spotlightProjects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 bg-zinc-100 p-4 rounded-xl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold text-zinc-900">
            For you
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-700"
                aria-label="About focus area spotlight"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Projects matched to your selected focus areas.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-col gap-0">
        {spotlightProjects.map((project, index) => {
          const matchingFocusAreas = project.focusAreas.filter((area) =>
            focusAreaIds.has(area._id)
          );
          return (
            <React.Fragment key={project._id}>
              {index > 0 && <Separator className="bg-zinc-200" />}
              <SpotlightProjectCard
                project={project}
                focusAreas={matchingFocusAreas}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SpotlightProjectCard({
  project,
  focusAreas,
}: {
  project: Project;
  focusAreas: FocusArea[];
}) {
  const router = useRouter();
  const hasMedia = project.previewMedia && project.previewMedia.length > 0;
  const firstMedia = hasMedia ? project.previewMedia[0] : null;
  const thumbnailUrl = firstMedia ? firstMedia.url : null;
  const isVideo = firstMedia?.type === "video";

  return (
    <div
      className="cursor-pointer flex gap-5 rounded-xl p-4 transition-colors hover:bg-zinc-100"
      onClick={() => router.push(`/project/${project._id}`)}
    >
      <div className="flex flex-col flex-1 min-w-0">
        {/* Title + Time */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <h4 className="text-base font-semibold text-zinc-900 line-clamp-2 leading-snug">
              {project.name}
            </h4>
            <span className="text-zinc-300 mt-[3px] shrink-0 text-xs">•</span>
            <span className="text-xs text-zinc-500 whitespace-nowrap mt-[3px] shrink-0">
              {getRelativeTime(project._creationTime)}
            </span>
          </div>
        </div>

        {/* Footer: Focus Areas - aligned to bottom */}
        {focusAreas.length > 0 && (
          <div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-1 px-1 mt-auto pt-3">
            <FocusAreaBadges focusAreas={focusAreas} className="text-[11px]" />
          </div>
        )}
      </div>

      {/* Thumbnail Column */}
      {thumbnailUrl && (
        <div className="flex-shrink-0 relative w-28 h-20 self-start mt-1 group overflow-hidden rounded-lg bg-zinc-100 border border-zinc-200/50">
          {isVideo ? (
            <video
              src={thumbnailUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          ) : (
            <Image
              src={thumbnailUrl}
              alt={project.name}
              fill
              className="object-cover"
            />
          )}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <div className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
                <Play className="h-3 w-3 fill-white text-white" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewestProjects() {
  const newestProjects = useQuery(api.projects.getNewestProjects, { limit: 3 });

  return (
    <div className="flex flex-col gap-4">
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
