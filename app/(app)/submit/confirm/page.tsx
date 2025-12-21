"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";

type Project = {
  _id: Id<"projects">;
  name: string;
  summary?: string;
  team: string;
  upvotes: number;
  status?: "pending" | "active";
  creatorName: string;
  creatorAvatar: string;
};

const thingsThatBelong = [
  "a script you wrote for yourself",
  "a tool your manager asked you to build",
  "a department dashboard",
  "a deadline workaround",
  "a prototype that never shipped",
  "a compliance/reporting solution",
];

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
      alert("Failed to confirm project. Please try again.");
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
      alert("Failed to cancel project. Please try again.");
      setIsProcessing(false);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-center text-zinc-500">Invalid project ID</p>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-center text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="mb-2 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Share something you built</h2>
          <Accordion type="single" collapsible>
            <AccordionItem value="things" className="border-b-0">
              <AccordionTrigger className="py-1 text-sm font-medium text-zinc-700">
                If you built something to make work easier, it belongs here, even if it&apos;s rough, unfinished, or hacky.
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
                  {thingsThatBelong.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <section className="mx-auto w-full max-w-5xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">Your project</h3>
                <p className="text-sm text-zinc-500">
                  Quick check before it goes live.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900">
                    {project.name}
                  </h3>
                  {project.summary && (
                    <p className="mt-2 text-sm text-zinc-600">
                      {project.summary}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
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
                <h3 className="text-lg font-semibold text-zinc-900">Similar projects</h3>
                <p className="text-sm text-zinc-500">
                  If you see a close match, it might be worth connecting or sharing notes.
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
              Not yet
            </Button>
          </div>

          <p className="text-center text-xs text-zinc-400">
            Posting rough work is encouraged. You can always edit later.
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
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
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
  return (
    <Link
      href={`/project/${project._id}`}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl p-2 transition-colors hover:bg-zinc-100/60"
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-zinc-900">
            {project.name}
          </h4>
          {project.summary && (
            <p className="mt-1 text-sm text-zinc-600">
              {project.summary}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-2">
            <Avatar className="h-9 w-9 bg-zinc-100 text-sm font-semibold text-zinc-600">
              <AvatarImage src={project.creatorAvatar} alt={project.creatorName || "User"} />
              <AvatarFallback>{(project.creatorName || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>
              By{" "}
              <span className="font-medium text-zinc-900">{project.creatorName || "Unknown User"}</span>
            </span>
          </span>
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
            <span>↑</span>
            <span className="font-medium text-zinc-900">
              {project.upvotes}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
