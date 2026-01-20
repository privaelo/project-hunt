"use client";

import { useDropzone } from "react-dropzone";
import { FileArchive, X } from "lucide-react";
import { formatFileSize, MAX_ZIP_FILE_SIZE } from "@/lib/fileSize";

interface ZipUploadFieldProps {
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  existingFile?: {
    filename: string;
    fileSize: number;
  } | null;
  onExistingFileDelete?: () => void;
  disabled?: boolean;
}

export function ZipUploadField({
  selectedFile,
  onFileChange,
  existingFile,
  onExistingFileDelete,
  disabled = false,
}: ZipUploadFieldProps) {
  const { getRootProps, getInputProps, fileRejections, isDragActive } = useDropzone({
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    maxSize: MAX_ZIP_FILE_SIZE,
    maxFiles: 1,
    multiple: false,
    disabled,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileChange(acceptedFiles[0]);
      }
    },
  });

  const handleRemoveFile = () => {
    onFileChange(null);
  };

  const hasExistingFile = existingFile && !selectedFile;
  const hasSelectedFile = selectedFile !== null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">
        Downloadable file{" "}
        <span className="text-xs text-zinc-500">(optional, .zip only, max 50MB)</span>
      </label>

      {/* Existing file display (edit page) */}
      {hasExistingFile && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900">{existingFile.filename}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(existingFile.fileSize)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExistingFileDelete}
            disabled={disabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors disabled:opacity-50"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Selected new file display */}
      {hasSelectedFile && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900">{selectedFile.name}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            disabled={disabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors disabled:opacity-50"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dropzone (show when no file selected) */}
      {!hasExistingFile && !hasSelectedFile && (
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
            <FileArchive className="mx-auto h-8 w-8 text-zinc-400" />
            <div className="text-sm text-zinc-600">
              {isDragActive ? (
                <span className="font-medium text-zinc-900">Drop your zip file here</span>
              ) : (
                <span className="text-zinc-500">
                  Upload a zip file containing your tool (source code, scripts, etc.)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="text-sm text-red-600 mt-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {errors.map((e) => (
                <p key={e.code}>
                  {e.code === "file-too-large"
                    ? `File is too large. Maximum size is ${formatFileSize(MAX_ZIP_FILE_SIZE)}.`
                    : e.code === "file-invalid-type"
                      ? "Invalid file type. Please upload a .zip file."
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
