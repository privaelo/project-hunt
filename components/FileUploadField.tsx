"use client";

import { useDropzone } from "react-dropzone";
import { File as FileIcon, X } from "lucide-react";
import { formatFileSize, MAX_FILE_SIZE, MAX_PROJECT_FILES } from "@/lib/fileSize";
import { Id } from "@/convex/_generated/dataModel";
import type { ExistingFileItem, NewProjectFileItem } from "@/lib/types";

interface FileUploadFieldProps {
  existingFiles?: ExistingFileItem[];
  onExistingFileDelete?: (fileId: Id<"projectFiles">) => void;
  newFiles: NewProjectFileItem[];
  onNewFilesChange: (files: NewProjectFileItem[]) => void;
  disabled?: boolean;
}

export function FileUploadField({
  existingFiles = [],
  onExistingFileDelete,
  newFiles,
  onNewFilesChange,
  disabled = false,
}: FileUploadFieldProps) {
  const totalFileCount = existingFiles.length + newFiles.length;
  const canAddMore = totalFileCount < MAX_PROJECT_FILES;

  const { getRootProps, getInputProps, fileRejections, isDragActive } = useDropzone({
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: disabled || !canAddMore,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const remaining = MAX_PROJECT_FILES - totalFileCount;
      const filesToAdd = acceptedFiles.slice(0, remaining);
      const items: NewProjectFileItem[] = filesToAdd.map((file) => ({
        file,
        id: crypto.randomUUID(),
      }));
      onNewFilesChange([...newFiles, ...items]);
    },
  });

  const handleRemoveNewFile = (id: string) => {
    onNewFilesChange(newFiles.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">
        Downloadable files{" "}
        <span className="text-xs text-zinc-500">
          (optional, max {formatFileSize(MAX_FILE_SIZE)} each, up to {MAX_PROJECT_FILES} files)
        </span>
      </label>

      {/* Existing files list */}
      {existingFiles.map((file) => (
        <div
          key={file._id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-6 w-6 shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{file.filename}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(file.fileSize)}</p>
            </div>
          </div>
          {onExistingFileDelete && (
            <button
              type="button"
              onClick={() => onExistingFileDelete(file._id)}
              disabled={disabled}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors disabled:opacity-50"
              aria-label={`Remove ${file.filename}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      {/* New files list */}
      {newFiles.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-6 w-6 shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{item.file.name}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(item.file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRemoveNewFile(item.id)}
            disabled={disabled}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors disabled:opacity-50"
            aria-label={`Remove ${item.file.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Dropzone */}
      {canAddMore && (
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
            <FileIcon className="mx-auto h-8 w-8 text-zinc-400" />
            <div className="text-sm text-zinc-600">
              {isDragActive ? (
                <span className="font-medium text-zinc-900">Drop files here</span>
              ) : (
                <span className="text-zinc-500">
                  Drag &amp; drop files here, or click to browse
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-zinc-500">
          Maximum of {MAX_PROJECT_FILES} files reached.
        </p>
      )}

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="text-sm text-red-600 mt-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {errors.map((e) => (
                <p key={e.code}>
                  {e.code === "file-too-large"
                    ? `${file.name} is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
                    : e.message}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
