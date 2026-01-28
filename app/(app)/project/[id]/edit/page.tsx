"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";
import { Info } from "lucide-react";
import { FocusAreaPicker } from "@/components/FocusAreaPicker";
import { MediaUploadField, type ExistingMediaItem, type NewFileItem } from "@/components/MediaUploadField";
import { ZipUploadField } from "@/components/ZipUploadField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const focusAreasGrouped = useQuery(api.focusAreas.listActiveGrouped);
  const currentUser = useQuery(api.users.current);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<NewFileItem[]>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [deleteExistingZipFile, setDeleteExistingZipFile] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<Id<"focusAreas"> | "personal" | null>(null);
  const [selectedReadinessStatus, setSelectedReadinessStatus] = useState<"in_progress" | "ready_to_use">("in_progress");

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
        link: project.link || "",
      });
      setSelectedFocusArea(project.focusAreaId ?? null);
      setSelectedReadinessStatus(project.readinessStatus ?? "in_progress");
      setIsLoading(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedName) {
      alert("Please add a title.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Update project fields
      await updateProject({
        projectId,
        name: trimmedName,
        summary: trimmedDescription || undefined,
        link: formData.link.trim() || undefined,
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
          {/* Focus Area Selector - Required field at top */}
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
                    Focus areas help categorize your project and make it easier for teammates to discover relevant work.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="max-w-2xl">
              <FocusAreaPicker
                focusAreasGrouped={focusAreasGrouped}
                selectedFocusArea={selectedFocusArea}
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
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A copy-and-paste prompt I use with AI to turn a few bullet points into a clear, polite email response. It asks for the right details, includes next steps, and keeps the tone consistent."
                  className="min-h-28"
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

            </section>
          </div>
        </form>
      </main>
    </div>
  );
}
