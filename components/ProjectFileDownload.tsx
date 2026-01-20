"use client";

import { FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/fileSize";

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
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500"
        aria-label={`Download ${filename}`}
      >
        <FileArchive className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        {filename}
      </a>
    </div>
  );
}
