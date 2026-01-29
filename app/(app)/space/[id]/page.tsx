"use client";

import { use, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, LayoutGroup } from "motion/react";
import React from "react";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/app/useCurrentUser";
import { ProjectRow, type ProjectRowData } from "@/components/ProjectRow";
import { SpaceIcon } from "@/components/SpaceIcon";

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const focusAreaId = id as Id<"focusAreas">;

  const focusArea = useQuery(api.focusAreas.getById, { id: focusAreaId });
  const { results, status, loadMore } = usePaginatedQuery(
    api.projects.listPaginatedBySpace,
    { focusAreaId },
    { initialNumItems: 15 }
  );
  const { isAuthenticated, user } = useCurrentUser();
  const toggleUpvote = useMutation(api.projects.toggleUpvote);
  const toggleAdoption = useMutation(api.projects.toggleAdoption);

  const currentUser = user
    ? { _id: user._id, name: user.name, avatarUrl: user.avatarUrlId || "" }
    : null;

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

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
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {focusArea && <SpaceIcon icon={focusArea.icon} name={focusArea.name} size="md" />}
            <h2 className="text-3xl font-semibold tracking-tight">
              {focusArea?.name ?? "Loading..."}
            </h2>
          </div>
          {focusArea?.description && (
            <p className="text-sm text-zinc-500">{focusArea.description}</p>
          )}
        </div>

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
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    >
                      <ProjectRow
                        project={project as ProjectRowData}
                        onUpvote={handleUpvote}
                        onAdopt={handleAdopt}
                        currentUser={currentUser}
                        isAuthenticated={isAuthenticated}
                      />
                    </motion.div>
                  </React.Fragment>
                ))}
                <div ref={loadMoreRef} className="h-4" />
                {isLoadingMore && (
                  <div className="py-4 text-center text-sm text-zinc-500">
                    Loading more projects...
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl bg-zinc-100/60 p-6 text-center text-sm text-zinc-500 space-y-3">
                <p className="font-medium text-zinc-900">
                  No projects in this space yet.
                </p>
              </div>
            )}
          </div>
        </LayoutGroup>
      </main>
    </div>
  );
}
