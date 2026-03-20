"use client";

import { Suspense, useEffect, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { stripHtml } from "@/lib/utils";
import { ArrowBigUp } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

type Project = {
  _id: Id<"projects">;
  name: string;
  summary?: string;
  team: string;
  upvotes: number;
  status?: "pending" | "active";
  userId?: Id<"users">;
  creatorId?: Id<"users">;
  creatorName: string;
  creatorAvatar: string;
};

function ConfirmSubmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") as Id<"projects"> | null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [similarProjects, setSimilarProjects] = useState<Project[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);

  const project = useQuery(
    api.projects.getById,
    projectId ? { projectId } : "skip"
  );
  const confirmProject = useMutation(api.projects.confirmProject);
  const cancelProject = useAction(api.projects.cancelProject);
  const getSimilarProjects = useAction(api.projects.getSimilarProjects);

  // Fetch similar projects when component mounts
  useEffect(() => {
    if (projectId) {
      getSimilarProjects({ projectId })
        .then((projects) => {
          setSimilarProjects(projects);
          setIsLoadingSimilar(false);
        })
        .catch((error) => {
          console.error("Failed to fetch similar projects:", error);
          setIsLoadingSimilar(false);
        });
    }
  }, [projectId, getSimilarProjects]);

  const handleConfirm = async () => {
    if (!projectId) return;
    setIsProcessing(true);

    try {
      await confirmProject({ projectId });
      router.push("/");
    } catch (error) {
      console.error("Failed to confirm project:", error);
      toast.error("Failed to confirm project. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!projectId) return;
    setIsProcessing(true);

    try {
      await cancelProject({ projectId });
      router.push("/");
    } catch (error) {
      console.error("Failed to cancel project:", error);
      toast.error("Failed to cancel project. Please try again.");
      setIsProcessing(false);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
          <p className="text-center text-zinc-500">Invalid project ID</p>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
          <p className="text-center text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/submit">Register a Tool</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Confirm</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-2 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Register a tool in the catalog</h2>
        </div>

        <section className="mx-auto w-full max-w-5xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">Your entry</h3>
                <p className="text-sm text-zinc-500">
                  Review before it&apos;s added to the catalog.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900">
                    {project.name}
                  </h3>
                  {project.summary && (
                    <p className="mt-2 text-sm text-zinc-600">
                      {stripHtml(project.summary)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                  {project.userId ? (
                    <Link
                      href={`/profile/${project.userId}`}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
                        <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
                        <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>
                        By{" "}
                        <span className="font-medium text-zinc-900 hover:underline">
                          {project.creatorName || "Unknown User"}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
                        <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
                        <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>
                        By{" "}
                        <span className="font-medium text-zinc-900">
                          {project.creatorName || "Unknown User"}
                        </span>
                      </span>
                    </span>
                  )}
                  {project.team ? (
                    <>
                      <Separator
                        orientation="vertical"
                        className="hidden h-6 lg:block"
                      />
                      <span>
                        Team{" "}
                        <span className="font-medium text-zinc-900">
                          {project.team}
                        </span>
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">Already in the catalog</h3>
                <p className="text-sm text-zinc-500">
                  Check if a similar tool already exists before adding yours.
                </p>
              </div>

              <div className="space-y-3">
                {isLoadingSimilar ? (
                  <div className="rounded-2xl bg-zinc-100/60 p-4 text-center text-sm text-zinc-500">
                    Loading similar projects...
                  </div>
                ) : similarProjects.length > 0 ? (
                  similarProjects.map((similar) => (
                    <SimilarProjectCard key={similar._id} project={similar} />
                  ))
                ) : (
                  <div className="rounded-2xl bg-zinc-100/60 p-4 text-center text-sm text-zinc-500">
                    No similar projects found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 whitespace-nowrap"
            >
              {isProcessing ? "Sharing..." : "Share this"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 whitespace-nowrap"
            >
              Discard
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-400">
            You can update the details at any time after registering.
          </p>
        </section>
      </main>
    </div>
  );
}

export default function ConfirmSubmission() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50">
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-4">
            <p className="text-center text-zinc-500">Loading...</p>
          </main>
        </div>
      }
    >
      <ConfirmSubmissionContent />
    </Suspense>
  );
}

function SimilarProjectCard({ project }: { project: Project }) {
  const projectHref = `/project/${project._id}`;

  const openProject = () => {
    window.open(projectHref, "_blank", "noopener,noreferrer");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openProject}
      onKeyDown={handleKeyDown}
      className="block cursor-pointer rounded-2xl p-2 transition-colors hover:bg-zinc-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-zinc-900">
            {project.name}
          </h4>
          {project.summary && (
            <p className="mt-1 text-sm text-zinc-600">
              {stripHtml(project.summary)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          {project.creatorId ? (
            <Link
              href={`/profile/${project.creatorId}`}
              className="flex items-center gap-2"
            >
              <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
                <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
                <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>
                By{" "}
                <span className="font-medium text-zinc-900 hover:underline">
                  {project.creatorName || "Unknown User"}
                </span>
              </span>
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
                <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
                <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>
                By{" "}
                <span className="font-medium text-zinc-900">
                  {project.creatorName || "Unknown User"}
                </span>
              </span>
            </span>
          )}
          {project.team ? (
            <>
              <Separator
                orientation="vertical"
                className="hidden h-6 lg:block"
              />
              <span>
                Team{" "}
                <span className="font-medium text-zinc-900">{project.team}</span>
              </span>
            </>
          ) : null}
          <Separator
            orientation="vertical"
            className="hidden h-6 lg:block"
          />
          <span className="flex items-center gap-1">
            <ArrowBigUp className="h-4 w-4" fill="none" aria-hidden="true" />
            <span className="font-medium text-zinc-900">
              {project.upvotes}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
