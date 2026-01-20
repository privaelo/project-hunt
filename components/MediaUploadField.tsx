"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types
export type ExistingMediaItem = {
  _id: Id<"mediaFiles">;
  storageId: Id<"_storage">;
  type: string;
};

export type NewFileItem = {
  file: File;
  id: string;
};

interface MediaUploadFieldProps {
  // Existing media (for edit page)
  existingMedia?: ExistingMediaItem[];
  onExistingMediaReorder?: (reorderedMedia: ExistingMediaItem[]) => void;
  onExistingMediaDelete?: (mediaId: Id<"mediaFiles">) => void;

  // New files (for both pages)
  newFiles: NewFileItem[];
  onNewFilesChange: (files: NewFileItem[]) => void;

  // Optional
  disabled?: boolean;
}

// Sortable thumbnail for existing media (fetches URL from storage)
function SortableExistingMediaThumbnail({
  media,
  onDelete,
}: {
  media: ExistingMediaItem;
  onDelete: () => void;
}) {
  const mediaUrl = useQuery(api.projects.getMediaUrl, { storageId: media.storageId });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: media._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.9 : 1,
  };

  if (!mediaUrl) {
    return (
      <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center">
        <div className="text-xs text-zinc-400">Loading...</div>
      </div>
    );
  }

  const isVideo = media.type === "video";

  return (
    <div className="relative group" ref={setNodeRef} style={style}>
      <button
        type="button"
        className="absolute left-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-600 shadow-sm transition hover:bg-white"
        aria-label="Drag to reorder"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
        {isVideo ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-4xl">🎥</div>
          </div>
        ) : (
          <Image
            src={mediaUrl}
            alt="Project media"
            width={200}
            height={200}
            className="h-full w-full object-cover"
            unoptimized
          />
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
      >
        ×
      </button>
    </div>
  );
}

// Sortable thumbnail for new file uploads
function SortableNewFileThumbnail({
  item,
  onRemove,
}: {
  item: NewFileItem;
  onRemove: () => void;
}) {
  const { file, id } = item;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.9 : 1,
  };

  const isImage = file.type.startsWith("image/");

  const previewUrl = useMemo(() => {
    if (!isImage) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file, isImage]);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="relative group" ref={setNodeRef} style={style}>
      <button
        type="button"
        className="absolute left-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-600 shadow-sm transition hover:bg-white"
        aria-label="Drag to reorder"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="aspect-square rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
        {isImage && previewUrl ? (
          <Image
            src={previewUrl}
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
        onClick={onRemove}
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
      >
        ×
      </button>
      <div className="mt-1 text-xs text-zinc-500 truncate">{file.name}</div>
    </div>
  );
}

export function MediaUploadField({
  existingMedia,
  onExistingMediaReorder,
  onExistingMediaDelete,
  newFiles,
  onNewFilesChange,
  disabled = false,
}: MediaUploadFieldProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const { getRootProps, getInputProps, fileRejections, isDragActive } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
    },
    disabled,
    onDrop: (acceptedFiles) => {
      const newItems = acceptedFiles.map((file) => ({
        file,
        id:
          globalThis.crypto?.randomUUID?.() ??
          `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
      }));
      onNewFilesChange([...newFiles, ...newItems]);
    },
  });

  const handleExistingMediaDragEnd = (event: DragEndEvent) => {
    if (!existingMedia || !onExistingMediaReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = existingMedia.findIndex((item) => item._id === active.id);
    const newIndex = existingMedia.findIndex((item) => item._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(existingMedia, oldIndex, newIndex);
    onExistingMediaReorder(reordered);
  };

  const handleNewFilesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = newFiles.findIndex((item) => item.id === active.id);
    const newIndex = newFiles.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onNewFilesChange(arrayMove(newFiles, oldIndex, newIndex));
  };

  const removeNewFile = (index: number) => {
    onNewFilesChange(newFiles.filter((_, i) => i !== index));
  };

  const hasExistingMedia = existingMedia && existingMedia.length > 0;
  const hasNewFiles = newFiles.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">
        Screenshots & clips{" "}
        <span className="text-xs text-zinc-500">(optional)</span>
      </label>
      

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          isDragActive
            ? "border-zinc-900 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <ImageIcon className="mx-auto h-8 w-8 text-zinc-400" />
          <div className="text-sm text-zinc-600">
            {isDragActive ? (
              <span className="font-medium text-zinc-900">Drop files here</span>
            ) : (
              <span className="text-zinc-500">
                UI screenshots or demo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="text-sm text-red-600 mt-2">
          Invalid file type(s): {fileRejections.map(({ file }) => file.name).join(", ")}.
          Please upload images or videos only.
        </div>
      )}

      {/* Existing media section (edit page only) */}
      {hasExistingMedia && (
        <div className="mt-4 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleExistingMediaDragEnd}
          >
            <SortableContext
              items={existingMedia.map((media) => media._id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {existingMedia.map((media) => (
                  <SortableExistingMediaThumbnail
                    key={media._id}
                    media={media}
                    onDelete={() => onExistingMediaDelete?.(media._id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* New files section */}
      {hasNewFiles && (
        <div className="mt-4 space-y-2">
          {hasExistingMedia && (
            <div className="text-sm font-medium text-zinc-700">
              New files ({newFiles.length})
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleNewFilesDragEnd}
          >
            <SortableContext
              items={newFiles.map((item) => item.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {newFiles.map((item, index) => (
                  <SortableNewFileThumbnail
                    key={item.id}
                    item={item}
                    onRemove={() => removeNewFile(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
