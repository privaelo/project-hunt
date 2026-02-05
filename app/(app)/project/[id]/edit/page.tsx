"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { isRichTextEmpty } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { Info, Plus, X } from "lucide-react";
import { SpacePicker } from "@/components/SpacePicker";
import { MediaUploadField, type ExistingMediaItem, type NewFileItem } from "@/components/MediaUploadField";
import { ZipUploadField } from "@/components/ZipUploadField";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const readinessSliderValues = ["just_an_idea", "early_prototype", "mostly_working", "ready_to_use"] as const;
const readinessSliderLabels = ["Just an idea", "Early prototype", "Mostly working", "Ready to use"];

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const projectId = id as Id<"projects">;
  const project = useQuery(api.projects.getById, { projectId });
  const projectMedia = useQuery(api.projects.getProjectMedia, { projectId });
  const projectFile = useQuery(api.projects.getProjectFile, { projectId });
  const updateProject = useAction(api.projects.updateProject);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const deleteMediaFromProject = useMutation(api.projects.deleteMediaFromProject);
  const addMediaToProject = useMutation(api.projects.addMediaToProject);
  const addFileToProject = useMutation(api.projects.addFileToProject);
  const deleteFileFromProject = useMutation(api.projects.deleteFileFromProject);
  const reorderProjectMedia = useMutation(api.projects.reorderProjectMedia)
    .withOptimisticUpdate((localStore, args) => {
      const existing = localStore.getQuery(api.projects.getProjectMedia, { projectId: args.projectId });
      if (existing) {
        // Reorder in the local cache immediately based on the new order
        const reordered = args.orderedMediaIds
          .map(id => existing.find(m => m._id === id))
          .filter((m): m is NonNullable<typeof m> => m !== undefined);
        localStore.setQuery(api.projects.getProjectMedia, { projectId: args.projectId }, reordered);
      }
    });
  const focusAreas = useQuery(api.focusAreas.listActive);
  const currentUser = useQuery(api.users.current);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [links, setLinks] = useState<{ url: string; label: string }[]>([{ url: "", label: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<NewFileItem[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [deleteExistingZipFile, setDeleteExistingZipFile] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<Id<"focusAreas"> | "personal" | null>(null);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use">("just_an_idea");

  const handleExistingMediaReorder = async (reorderedMedia: ExistingMediaItem[]) => {
    try {
      await reorderProjectMedia({
        projectId,
        orderedMediaIds: reorderedMedia.map((media) => media._id),
      });
    } catch (error) {
      console.error("Failed to reorder media:", error);
      alert("Failed to reorder media. Please try again.");
      // No manual rollback needed - Convex optimistic update handles this
    }
  };

  const handleExistingMediaDelete = async (mediaId: Id<"mediaFiles">) => {
    try {
      await deleteMediaFromProject({ projectId, mediaId });
    } catch (error) {
      console.error("Failed to delete media:", error);
      alert("Failed to delete media. Please try again.");
    }
  };

  const handleExistingZipFileDelete = () => {
    setDeleteExistingZipFile(true);
  };

  // Populate form when project data loads
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.summary || "",
      });
      // Populate links from project.links, fall back to legacy project.link
      if (project.links && project.links.length > 0) {
        setLinks(project.links.map((l) => ({ url: l.url, label: l.label ?? "" })));
      } else if (project.link) {
        setLinks([{ url: project.link, label: "" }]);
      } else {
        setLinks([{ url: "", label: "" }]);
      }
      setSelectedFocusArea(project.focusAreaId ?? null);
      const loadedStatus = project.readinessStatus === "in_progress" ? "early_prototype" : project.readinessStatus ?? "just_an_idea";
      setSelectedReadinessStatus(loadedStatus);
      setIsLoading(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      alert("Please add a title.");
      setIsSubmitting(false);
      return;
    }

    try {
      const filteredLinks = links
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url.trim(), ...(l.label.trim() ? { label: l.label.trim() } : {}) }));

      // Update project fields
      await updateProject({
        projectId,
        name: trimmedName,
        summary: isRichTextEmpty(formData.description) ? undefined : formData.description,
        links: filteredLinks.length > 0 ? filteredLinks : undefined,
        focusAreaId: selectedFocusArea === "personal" ? undefined : selectedFocusArea ?? undefined,
        readinessStatus: selectedReadinessStatus,
      });

      // Upload and add new media files if any are selected
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
              projectId,
              storageId,
              type: file.type.startsWith('video/') ? 'video' : 'image',
              contentType: file.type,
            });
          })
        );
      }

      // Handle zip file changes
      if (deleteExistingZipFile && !selectedZipFile) {
        // Delete existing file without replacement
        await deleteFileFromProject({ projectId });
      } else if (selectedZipFile) {
        // Upload new zip file (will replace existing if any)
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
          projectId,
          storageId,
          filename: selectedZipFile.name,
          contentType: selectedZipFile.type,
          fileSize: selectedZipFile.size,
        });
      }

      router.push(`/project/${id}`);
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("Failed to update project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
          <p className="text-zinc-500">Project not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10">
        <div className="mb-2 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Update your project details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Space Selector - Required field at top */}
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
            <div className="max-w-2xl">
              <SpacePicker
                spaces={focusAreas}
                selectedSpace={selectedFocusArea}
                onSelectionChange={setSelectedFocusArea}
                currentUserName={currentUser?.name}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section className="w-full space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-zinc-900">
                  Title
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="AI Prompt Template: Clear Email Reply"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="description" className="text-sm font-medium text-zinc-900">
                    What did you build and why? <span className="text-xs text-zinc-500">(optional)</span>
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-zinc-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        A good description makes your project easier to find when teammates search for solutions. Describe the problem and how you solved it—this helps the right people discover your work.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="A copy-and-paste prompt I use with AI to turn a few bullet points into a clear, polite email response. It asks for the right details, includes next steps, and keeps the tone consistent."
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <MediaUploadField
                  existingMedia={projectMedia}
                  onExistingMediaReorder={handleExistingMediaReorder}
                  onExistingMediaDelete={handleExistingMediaDelete}
                  newFiles={selectedFiles}
                  onNewFilesChange={setSelectedFiles}
                  disabled={isSubmitting}
                />

                <ZipUploadField
                  selectedFile={selectedZipFile}
                  onFileChange={setSelectedZipFile}
                  existingFile={!deleteExistingZipFile && projectFile ? {
                    filename: projectFile.filename,
                    fileSize: projectFile.fileSize,
                  } : null}
                  onExistingFileDelete={handleExistingZipFileDelete}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" className="whitespace-nowrap" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/project/${id}`)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </section>

            <section className="w-full lg:sticky lg:top-10 lg:self-start space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900">
                  Links <span className="text-xs text-zinc-500">(optional)</span>
                </label>
                <div className="space-y-3">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[index] = { ...updated[index], url: e.target.value };
                            setLinks(updated);
                          }}
                          placeholder="https://example.com"
                        />
                        <Input
                          type="text"
                          value={link.label}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[index] = { ...updated[index], label: e.target.value };
                            setLinks(updated);
                          }}
                          placeholder="Label (optional, e.g. GitHub Repo)"
                          className="h-8 text-xs"
                        />
                      </div>
                      {links.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-zinc-400 hover:text-zinc-600"
                          onClick={() => setLinks(links.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setLinks([...links, { url: "", label: "" }])}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add link
                </Button>
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

            </section>
          </div>
        </form>
      </main>
    </div>
  );
}
