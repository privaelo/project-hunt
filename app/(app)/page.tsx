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
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/app/useCurrentUser";
import { ProjectRow } from "@/components/ProjectRow";
import type { ProjectRowData } from "@/lib/types";
import { MessageCircle } from "lucide-react";
import { SpaceIcon } from "@/components/SpaceIcon";

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
      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 pb-16 pt-4">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              What people are working on
            </h1>
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
                            project={project as ProjectRowData}
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
            <TrendingThreads />
          </div>
        </section>
      </main>
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

function TrendingThreads() {
  const trendingThreads = useQuery(api.threads.getTrendingThreads, { limit: 5 });
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3">
        <h3 className="text-lg font-semibold text-zinc-900">Trending Threads</h3>
      </div>

      {!trendingThreads ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-3/4" />
              <div className="h-3 bg-zinc-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : trendingThreads.length === 0 ? (
        <p className="text-sm text-zinc-500 px-3">No threads yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {trendingThreads.map((thread) => (
            <div
              key={thread._id}
              className="rounded-lg p-3 transition-colors hover:bg-zinc-50 space-y-1.5 cursor-pointer"
              onClick={() => router.push(`/thread/${thread._id}`)}
            >
              {thread.spaceName && thread.spaceId && (
                <Link
                  href={`/space/${thread.spaceId}`}
                  className="flex items-center gap-1 text-xs font-medium text-zinc-600 transition-colors hover:text-green-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SpaceIcon
                    icon={thread.spaceIcon ?? undefined}
                    name={thread.spaceName}
                    size="xs"
                  />
                  g/{thread.spaceName}
                </Link>
              )}
              <h4 className="font-semibold text-zinc-900 text-sm leading-tight line-clamp-2">
                {thread.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex items-center gap-0.5">
                  <span>&uarr;</span> {thread.upvoteCount}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="h-3 w-3" /> {thread.commentCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


