"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { SimilarProjectsPreview } from "@/components/SimilarProjectsPreview";
import { FocusAreaPicker } from "@/components/FocusAreaPicker";
import { MediaUploadField, type NewFileItem } from "@/components/MediaUploadField";
import { ZipUploadField } from "@/components/ZipUploadField";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const thingsThatBelong = [
  "a script you wrote for yourself",
  "a tool your manager asked you to build",
  "a department dashboard",
  "a deadline workaround",
  "a prototype that never shipped",
  "a compliance/reporting solution",
];

export default function SubmitProject() {
  const router = useRouter();
  const createProject = useAction(api.projects.create);
  const cancelProject = useAction(api.projects.cancelProject);
  const confirmProject = useMutation(api.projects.confirmProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const addFileToProject = useMutation(api.projects.addFileToProject);
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);
  const [formData, setFormData] = useState({
    summary: "",
    workingTitle: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<NewFileItem[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<Id<"focusAreas">[]>([]);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"in_progress" | "ready_to_use">("in_progress");

  const deriveName = () => {
    const title = formData.workingTitle.trim();
    if (title) return title;
    const summary = formData.summary.trim();
    if (summary) return summary.length > 60 ? `${summary.slice(0, 60)}...` : summary;
    return "Shared solution";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedTitle = formData.workingTitle.trim();
    const trimmedSummary = formData.summary.trim();

    if (!trimmedTitle) {
      alert("Please add a title.");
      setIsSubmitting(false);
      return;
    }

    const summary = trimmedSummary || undefined;
    const name = deriveName();

    let createdProjectId: Id<"projects"> | null = null;

    try {
      // Create project first
      const result = await createProject({
        name,
        summary,
        link: formData.link.trim() || undefined,
        focusAreaIds: selectedFocusAreas,
        readinessStatus: selectedReadinessStatus,
      });
      createdProjectId = result.projectId;

      // Upload and add media files if any are selected
      if (selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(async ({ file }) => {
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

      // Upload zip file if selected
      if (selectedZipFile) {
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedZipFile.type },
          body: selectedZipFile,
        });

        if (!uploadResult.ok) {
          throw new Error(`Failed to upload ${selectedZipFile.name}`);
        }

        const { storageId } = await uploadResult.json();

        await addFileToProject({
          projectId: result.projectId,
          storageId,
          filename: selectedZipFile.name,
          contentType: selectedZipFile.type,
          fileSize: selectedZipFile.size,
        });
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

  const summaryForPreview = formData.summary.trim();

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="mb-2 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Share what you&apos;re working on</h2>
          <Accordion type="single" collapsible>
            <AccordionItem value="things" className="border-b-0">
              <AccordionTrigger className="py-1 text-sm font-medium text-zinc-700">
                If you built something, it belongs here, even if it&apos;s rough and unfinished.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className="w-full space-y-4">
            <div className="space-y-2">
              <label htmlFor="workingTitle" className="text-sm font-medium text-zinc-900">
                Title
              </label>
              <Input
                id="workingTitle"
                value={formData.workingTitle}
                onChange={(e) => setFormData({ ...formData, workingTitle: e.target.value })}
                 placeholder="AI Prompt Template: Clear Email Reply"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="summary" className="text-sm font-medium text-zinc-900">
                  What did you build and why? <span className="text-xs text-zinc-500">(optional)</span>
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      A good description makes your project easier to find when teammates search for solutions. This helps the right people discover your work.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                 placeholder="A copy-and-paste prompt I use with AI to turn a few bullet points into a clear, polite email response. It asks for the right details, includes next steps, and keeps the tone consistent."
                className="min-h-28"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <MediaUploadField
                newFiles={selectedFiles}
                onNewFilesChange={setSelectedFiles}
                disabled={isSubmitting}
              />

              <ZipUploadField
                selectedFile={selectedZipFile}
                onFileChange={setSelectedZipFile}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center pt-4">
              <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                {isSubmitting ? "Sharing..." : "Share this"}
              </Button>
            </div>
            </section>

            <section className="w-full lg:sticky lg:top-10 lg:self-start space-y-4">
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

              <div className="grid gap-4 md:grid-cols-2">
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
                          <p><strong>In Progress:</strong> Early/rough, but useful. Sharing to get eyes and ideas.</p>
                          <p><strong>Ready to Use:</strong> Works reliably. Someone else could pick it up and use it now.</p>
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
                          Tags make it easier for the right people to discover this later.
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
              </div>

              <div className="border-t border-zinc-200 pt-4">
                <SimilarProjectsPreview
                  name={deriveName()}
                  description={summaryForPreview}
                />
              </div>
            </section>

          </div>

        </form>
      </main>
    </div>
  );
}
