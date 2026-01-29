// components/ProjectRow.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ProjectMediaCarousel } from "@/components/ProjectMediaCarousel";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { Facepile } from "@/components/Facepile";

export type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string | undefined;
};

export type ProjectRowData = {
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

interface ProjectRowProps {
  project: ProjectRowData;
  onUpvote: (projectId: Id<"projects">) => void;
  onAdopt: (projectId: Id<"projects">) => void;
  currentUser: { _id: Id<"users">; name: string; avatarUrl: string } | null;
  isAuthenticated: boolean;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

export function ProjectRow({
  project,
  onUpvote,
  onAdopt,
  currentUser,
  isAuthenticated,
}: ProjectRowProps) {
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
          {project.focusArea ? (
            <Link
              href={`/space/${project.focusArea._id}`}
              className="font-medium text-zinc-600 transition-colors hover:text-green-600"
              onClick={(e) => e.stopPropagation()}
            >
              g/{project.focusArea.name}
            </Link>
          ) : (
            <Link
              href={`/profile/${project.userId}`}
              className="font-medium text-zinc-600 transition-colors hover:text-green-600"
              onClick={(e) => e.stopPropagation()}
            >
              u/{project.creatorName}
            </Link>
          )}
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