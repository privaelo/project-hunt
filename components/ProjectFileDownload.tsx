"use client";

import { File as FileIcon } from "lucide-react";

interface ProjectFileDownloadProps {
  files: Array<{
    filename: string;
    fileSize: number;
    url: string | null;
  }>;
}

export function ProjectFileDownload({ files }: ProjectFileDownloadProps) {
  const downloadableFiles = files.filter((f) => f.url);

  if (downloadableFiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {downloadableFiles.map((file, i) => (
        <a
          key={i}
          href={file.url!}
          download={file.filename}
          className="flex items-center gap-2 text-m font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
          aria-label={`Download ${file.filename}`}
        >
          <FileIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
          {file.filename}
        </a>
      ))}
    </div>
  );
}
