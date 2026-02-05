"use client";

import { FileArchive } from "lucide-react";

interface ProjectFileDownloadProps {
  filename: string;
  fileSize: number;
  url: string | null;
}

export function ProjectFileDownload({ filename, fileSize, url }: ProjectFileDownloadProps) {
  if (!url) {
    return null;
  }

  return (
    <div>
      <a
        href={url}
        download={filename}
        className="flex items-center gap-2 text-m font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
        aria-label={`Download ${filename}`}
      >
        <FileArchive className="h-5 w-5 text-zinc-400" aria-hidden="true" />
        {filename}
      </a>
    </div>
  );
}
