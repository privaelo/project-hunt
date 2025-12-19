"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDropzone } from "react-dropzone";
import { Upload, Info } from "lucide-react";
import { SimilarProjectsPreview } from "@/components/SimilarProjectsPreview";
import { FocusAreaPicker } from "@/components/FocusAreaPicker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SubmitProject() {
  const router = useRouter();
  const createProject = useAction(api.projects.create);
  const cancelProject = useAction(api.projects.cancelProject);
  const confirmProject = useMutation(api.projects.confirmProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);
  const [formData, setFormData] = useState({
    problem: "",
    solution: "",
    workingTitle: "",
    headline: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<Id<"focusAreas">[]>([]);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"in_progress" | "ready_to_use">("in_progress");
  const [showDetails, setShowDetails] = useState(false);

  const { getRootProps, getInputProps, fileRejections, isDragActive } = useDropzone({
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
    },
    onDrop: (acceptedFiles) => {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    },
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const deriveName = () => {
    const title = formData.workingTitle.trim();
    if (title) return title;
    const headline = formData.headline.trim();
    if (headline) return headline;
    const solution = formData.solution.trim();
    if (solution) return solution.length > 60 ? `${solution.slice(0, 60)}...` : solution;
    const problem = formData.problem.trim();
    if (problem) return problem.length > 60 ? `${problem.slice(0, 60)}...` : problem;
    return "Shared solution";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedProblem = formData.problem.trim();
    const trimmedSolution = formData.solution.trim();

    if (!trimmedProblem || !trimmedSolution) {
      alert("Add a few words about the problem and what you built.");
      setIsSubmitting(false);
      return;
    }

    const summary = `${trimmedProblem}\n\n${trimmedSolution}`;
    const name = deriveName();

    let createdProjectId: Id<"projects"> | null = null;

    try {
      // Create project first
      const result = await createProject({
        name,
        summary,
        headline: formData.headline.trim() || undefined,
        link: formData.link.trim() || undefined,
        focusAreaIds: selectedFocusAreas,
        readinessStatus: selectedReadinessStatus,
      });
      createdProjectId = result.projectId;

      // Upload and add media files if any are selected
      if (selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(async (file) => {
            // Generate upload URL
            const uploadUrl = await generateUploadUrl();

            // Upload file to storage
            const uploadResult = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!uploadResult.ok) {
              throw new Error(`Failed to upload ${file.name}`);
            }

            const { storageId } = await uploadResult.json();

            // Add media to project with metadata
            await addMediaToProject({
              projectId: result.projectId,
              storageId,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              contentType: file.type,
            });
          })
        );
      }

      // If no similar projects found, auto-confirm and go home
      if (result.similarProjects.length === 0) {
        await confirmProject({ projectId: result.projectId });
        router.push("/");
      } else {
        // Redirect to confirmation page to show similar projects
        router.push(`/submit/confirm?projectId=${result.projectId}`);
      }
    } catch (error) {
      if (createdProjectId) {
        try {
          await cancelProject({ projectId: createdProjectId });
        } catch (cancelError) {
          console.error("Failed to clean up pending project:", cancelError);
        }
      }
      console.error("Failed to create project:", error);
      alert("Failed to share. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryForPreview = `${formData.problem}\n\n${formData.solution}`.trim();

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="mb-2 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Share something you built</h2>
          <p className="text-sm text-zinc-600">
            If you built something in response to friction — whether self-initiated or requested — it belongs here.
          </p>
          <p className="text-sm text-zinc-600">
            Rough, unfinished, and hacky is welcome — no polish required.
          </p>
          <p className="text-sm text-zinc-600">
            It doesn&apos;t matter whether this was self-initiated or requested — if it solved real friction, it belongs here.
          </p>
          <p className="text-sm text-zinc-600">
            Things that belong: a script you wrote for yourself, a tool your manager asked you to build, a dashboard requested by a department, a deadline workaround, a prototype that never shipped, or a compliance/reporting solution.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="w-full">

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="problem" className="text-sm font-medium text-zinc-900">
                What problem triggered this to be built?
              </label>
              <Textarea
                id="problem"
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                placeholder="Example: Deploy approvals stalled because no one knew who owned the service."
                className="min-h-24"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="solution" className="text-sm font-medium text-zinc-900">
                What did you build to stop dealing with it?
              </label>
              <Textarea
                id="solution"
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                placeholder="Example: A rough Slack bot + sheet that pings the right approver with context."
                className="min-h-24"
                required
              />
              <p className="text-xs text-zinc-500">
                Rough drafts are welcome. Garden isn&apos;t about who had the idea — it&apos;s about preserving how the problem was solved.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Add more detail (optional)</p>
                  <p className="text-xs text-zinc-500">Skip this if you just want to share quickly.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails((prev) => !prev)}
                  className="whitespace-nowrap"
                >
                  {showDetails ? "Hide" : "Add"}
                </Button>
              </div>

              {showDetails && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label htmlFor="workingTitle" className="text-sm font-medium text-zinc-900">
                      Working title <span className="text-xs text-zinc-500">(optional)</span>
                    </label>
                    <Input
                      id="workingTitle"
                      value={formData.workingTitle}
                      onChange={(e) => setFormData({ ...formData, workingTitle: e.target.value })}
                      placeholder="Example: Approver Nudge Bot"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="headline" className="text-sm font-medium text-zinc-900">
                        One-liner <span className="text-xs text-zinc-500">(optional)</span>
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            A quick one-liner helps people decide if they should click in, but it&apos;s totally optional.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="headline"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      placeholder="Example: Slack pings the right deploy approver instantly."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="link" className="text-sm font-medium text-zinc-900">
                      Link <span className="text-xs text-zinc-500">(optional)</span>
                    </label>
                    <Input
                      id="link"
                      type="url"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-zinc-900">
                        Focus Areas <span className="text-xs text-zinc-500">(optional)</span>
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Tags help the right folks find this later, but you can skip this step.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FocusAreaPicker
                      focusAreasGrouped={focusAreasGrouped}
                      selectedFocusAreas={selectedFocusAreas}
                      onSelectionChange={setSelectedFocusAreas}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="readinessStatus" className="text-sm font-medium text-zinc-900">
                        How rough is it?
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p><strong>In Progress:</strong> Still a rough cut, sharing for visibility.</p>
                            <p><strong>Ready to Use:</strong> Stable enough for others to try today.</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={selectedReadinessStatus}
                      onValueChange={(value: "in_progress" | "ready_to_use") => setSelectedReadinessStatus(value)}
                    >
                      <SelectTrigger id="readinessStatus" className="w-full">
                        <SelectValue placeholder="Select readiness status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="ready_to_use">Ready to use</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900">
                      Media <span className="text-xs text-zinc-500">(optional)</span>
                    </label>
                    <div
                      {...getRootProps()}
                      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                        isDragActive
                          ? 'border-zinc-900 bg-zinc-100'
                          : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="space-y-2">
                        <Upload className="mx-auto h-10 w-10 text-zinc-400" />
                        <div className="text-sm text-zinc-600">
                          {isDragActive ? (
                            <span className="font-medium text-zinc-900">Drop files here</span>
                          ) : (
                            <span className="text-zinc-500">
                              Screenshots or short clips are welcome but not required.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {fileRejections.length > 0 && (
                      <div className="text-sm text-red-600 mt-2">
                        Invalid file type(s): {fileRejections.map(({ file }) => file.name).join(', ')}.
                        Please upload images or videos only.
                      </div>
                    )}

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-sm font-medium text-zinc-900">
                          Selected files ({selectedFiles.length})
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
                                {file.type.startsWith('image/') ? (
                                  <Image
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    width={200}
                                    height={200}
                                    className="h-full w-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <div className="text-4xl">🎥</div>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                              >
                                ×
                              </button>
                              <div className="mt-1 text-xs text-zinc-500 truncate">
                                {file.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center pt-4">
              <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                {isSubmitting ? "Sharing..." : "Share this"}
              </Button>
            </div>
          </form>
          </section>

          <section className="w-full lg:sticky lg:top-10 lg:self-start">
            <SimilarProjectsPreview
              name={deriveName()}
              headline={formData.headline}
              description={summaryForPreview}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
