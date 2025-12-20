"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { MessageCircle, Flame } from "lucide-react";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { FocusAreaBadges } from "@/components/FocusAreaBadges";
import { ReadinessBadge } from "@/components/ReadinessBadge";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string;
};

type Project = {
  _id: Id<"projects">;
  name: string;
  summary: string;
  team?: string;
  upvotes: number;
  commentCount: number;
  hasUpvoted: boolean;
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

type ActiveUser = {
  _id: Id<"users">;
  name: string;
  avatarUrlId: string;
  team: string;
  score: number;
  projectCount: number;
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
  const projects = useQuery(api.projects.list);
  const toggleUpvote = useMutation(api.projects.toggleUpvote);

  const filteredProjects = useMemo(() => {
    return projects ?? [];
  }, [projects]);

  const handleUpvote = async (projectId: Id<"projects">) => {
    try {
      await toggleUpvote({ projectId });
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                Tools built inside Honda
              </h2>
              <p className="mt-2 text-lg text-zinc-600">
                If it made work easier, it belongs here.
              </p>
            </div>
            <ShareProjectCallout />
            <LayoutGroup>
              <div className="space-y-0">
                {!projects ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    Loading projects...
                  </div>
                ) : filteredProjects.length ? (
                  filteredProjects.map((project) => (
                    <motion.div
                      key={project._id}
                      layout
                      layoutId={project._id}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    >
                      <ProjectRow
                        project={project}
                        onUpvote={handleUpvote}
                      />
                    </motion.div>
                  ))
                ) : (
                  <EmptyState />
                )}
              </div>
            </LayoutGroup>
          </div>

          <div className="flex flex-col gap-8">
            <TopContributors />
            <NewestProjects />
          </div>
        </section>
      </main>
    </div>
  );
}

function ShareProjectCallout() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm text-zinc-600">
          Have one? Share it in two lines.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Authenticated>
          <Link href="/submit">
            <Button size="sm" className="whitespace-nowrap">
              Share something you built
            </Button>
          </Link>
        </Authenticated>
        <Unauthenticated>
            <Button size="sm" className="whitespace-nowrap" asChild>
              <Link href="/sign-in" prefetch={false}>
                Share something you built
              </Link>
            </Button>
        </Unauthenticated>
        <AuthLoading>
          <Button size="sm" className="whitespace-nowrap" disabled>
            Share something you built
          </Button>
        </AuthLoading>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onUpvote,
}: {
  project: Project;
  onUpvote: (projectId: Id<"projects">) => void;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

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

  const hasMedia = project.previewMedia.length > 0;

  return (
    <div
      className="flex flex-col gap-3 pb-4 pt-4 cursor-pointer hover:bg-zinc-100 rounded-lg transition-colors px-4 -mx-4"
      onClick={handleProjectClick}
    >
      {/* Header: Creator info, team */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Avatar className="h-6 w-6 bg-zinc-100 text-xs font-semibold text-zinc-600">
            <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
            <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-zinc-700">{project.creatorName || "Unknown User"}</span>
        </span>
        {project.team && (
          <>
            <span className="text-zinc-300">•</span>
            <span className="whitespace-nowrap text-zinc-500">{project.team}</span>
          </>
        )}
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
      ) : (
        <p className="text-sm text-zinc-600 line-clamp-2 break-words">
          {project.summary}
        </p>
      )}

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
      <p className="font-medium text-zinc-900">Nothing here yet.</p>
      <p className="text-zinc-600">
        Be the first to share a workaround that made work easier.
      </p>
      <Link href="/submit">
        <Button size="sm" className="whitespace-nowrap">
          Share something you built
        </Button>
      </Link>
    </div>
  );
}

function ActiveUserCard({ user }: { user: ActiveUser }) {
  return (
    <div className="rounded-lg p-3 transition-colors hover:bg-zinc-100">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 bg-zinc-100">
          <AvatarImage src={user.avatarUrlId} alt={user.name || "User"} />
          <AvatarFallback className="text-xs font-semibold text-zinc-600">
            {(user.name || "U").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-zinc-900 text-sm line-clamp-1">
            {user.name}
          </h4>
          {user.team && (
            <p className="text-xs text-zinc-500 line-clamp-1">{user.team}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-lg font-semibold text-zinc-900">{user.score}</span>
        </div>
      </div>
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

function TopContributors() {
  const topUsers = useQuery(api.users.getActiveUsers, { limit: 4 });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-3">
        <h3 className="text-2xl font-semibold text-zinc-900">Top contributors</h3>
      </div>

      {!topUsers ? (
        <div className="space-y-3 px-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
              <div className="h-3 bg-zinc-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : topUsers.length === 0 ? (
        <p className="text-sm text-zinc-500 px-3">No active contributors yet.</p>
      ) : (
        <div className="flex flex-col gap-0">
          {topUsers.map((user) => (
            <ActiveUserCard key={user._id} user={user} />
          ))}
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
        <h3 className="text-2xl font-semibold text-zinc-900">Newest projects</h3>
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
        <p className="text-sm text-zinc-500 px-3">No projects yet.</p>
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
