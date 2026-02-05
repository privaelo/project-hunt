"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRichTextEmpty, stripHtml } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import { SimilarProjectsPreview } from "@/components/SimilarProjectsPreview";
import { SpacePicker } from "@/components/SpacePicker";
import { MediaUploadField, type NewFileItem } from "@/components/MediaUploadField";
import { ZipUploadField } from "@/components/ZipUploadField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LinksEditor, type LinkItem } from "@/components/LinksEditor";

const readinessSliderValues = ["just_an_idea", "early_prototype", "mostly_working", "ready_to_use"] as const;
const readinessSliderLabels = ["Just an idea", "Early prototype", "Mostly working", "Ready to use"];

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
  const focusAreas = useQuery(api.focusAreas.listActive);
  const currentUser = useQuery(api.users.current);
  const [formData, setFormData] = useState({
    summary: "",
    workingTitle: "",
  });
  const [links, setLinks] = useState<LinkItem[]>([{ url: "", label: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<NewFileItem[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [selectedFocusArea, setSelectedFocusArea] = useState<Id<"focusAreas"> | "personal" | null>(null);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use">("just_an_idea");

  const deriveName = () => {
    const title = formData.workingTitle.trim();
    if (title) return title;
    const summary = stripHtml(formData.summary);
    if (summary) return summary.length > 60 ? `${summary.slice(0, 60)}...` : summary;
    return "Shared solution";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedTitle = formData.workingTitle.trim();
    const summary = isRichTextEmpty(formData.summary) ? undefined : formData.summary;

    if (!trimmedTitle) {
      alert("Please add a title.");
      setIsSubmitting(false);
      return;
    }

    if (selectedFocusArea === null) {
      alert("Please choose a space for your project.");
      setIsSubmitting(false);
      return;
    }
    const name = deriveName();

    let createdProjectId: Id<"projects"> | null = null;

    try {
      // Create project first
      const filteredLinks = links
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url.trim(), ...(l.label.trim() ? { label: l.label.trim() } : {}) }));

      const result = await createProject({
        name,
        summary,
        links: filteredLinks.length > 0 ? filteredLinks : undefined,
        focusAreaId: selectedFocusArea === "personal" ? undefined : selectedFocusArea ?? undefined,
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

  const summaryForPreview = isRichTextEmpty(formData.summary) ? "" : formData.summary;

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

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className="w-full space-y-6">
              {/* Space Selector - Required field */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-base font-semibold text-zinc-900">
                    Choose a space
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Spaces help categorize your project and make it easier for teammates to discover relevant work.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <SpacePicker
                  spaces={focusAreas}
                  selectedSpace={selectedFocusArea}
                  onSelectionChange={setSelectedFocusArea}
                  currentUserName={currentUser?.name}
                />
              </div>

              {/* Title - Required field */}
              <div className="space-y-2">
                <label htmlFor="workingTitle" className="text-sm font-medium text-zinc-900">
                  Title
                </label>
                <Input
                  id="workingTitle"
                  className="h-11"
                  value={formData.workingTitle}
                  onChange={(e) => setFormData({ ...formData, workingTitle: e.target.value })}
                  placeholder="AI Prompt Template: Clear Email Reply"
                  required
                />
              </div>

              <Tabs defaultValue="details" className="!mt-10">
                <TabsList>
                  <TabsTrigger value="details" className="px-5">Details</TabsTrigger>
                  <TabsTrigger value="media" className="px-5">Media</TabsTrigger>
                  <TabsTrigger value="link" className="px-5">Link</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 pt-4">
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
                    <RichTextEditor
                      value={formData.summary}
                      onChange={(value) => setFormData({ ...formData, summary: value })}
                      placeholder="A copy-and-paste prompt I use with AI to turn a few bullet points into a clear, polite email response. It asks for the right details, includes next steps, and keeps the tone consistent."
                      disabled={isSubmitting}
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
                          <div className="space-y-1.5 text-xs">
                            <p><strong>Just an idea:</strong> Haven&apos;t started building yet.</p>
                            <p><strong>Early prototype:</strong> First attempt — rough but shows the concept.</p>
                            <p><strong>Mostly working:</strong> Core functionality works, still has rough edges.</p>
                            <p><strong>Ready to use:</strong> Works reliably. Someone else could pick it up now.</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="space-y-3 pt-1">
                      <Slider
                        id="readinessStatus"
                        min={0}
                        max={3}
                        step={1}
                        value={[readinessSliderValues.indexOf(selectedReadinessStatus)]}
                        onValueChange={([val]) => setSelectedReadinessStatus(readinessSliderValues[val])}
                      />
                      <div className="flex justify-between text-xs text-zinc-500">
                        {readinessSliderLabels.map((label, i) => (
                          <span
                            key={label}
                            className={`text-center ${i === readinessSliderValues.indexOf(selectedReadinessStatus) ? "font-semibold text-zinc-900" : ""}`}
                            style={{ width: "25%" }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-4 pt-4">
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
                </TabsContent>

                <TabsContent value="link" className="space-y-4 pt-4">
                  <LinksEditor links={links} onChange={setLinks} disabled={isSubmitting} />
                </TabsContent>
              </Tabs>

              <div className="flex items-center pt-4">
                <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                  {isSubmitting ? "Sharing..." : "Share this"}
                </Button>
              </div>
            </section>

            <section className="w-full lg:sticky lg:top-10 lg:self-start">
              <SimilarProjectsPreview
                name={deriveName()}
                description={summaryForPreview}
              />
            </section>
          </div>

        </form>
      </main>
    </div>
  );
}
