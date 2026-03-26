"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="min-h-28 rounded-md border border-zinc-200 bg-white" />
  ),
});

const BASE_TOOLBAR = [
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block"],
  ["link"],
];

const IMAGE_TOOLBAR = [
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block"],
  ["link", "image"],
];

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When provided, enables the image button in the toolbar. */
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  onImageUpload,
}: RichTextEditorProps) {
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Intercept paste/drop of images to prevent Quill from embedding base64 data URLs,
  // which can exceed Convex's 1 MiB document size limit.
  useEffect(() => {
    if (!onImageUpload || !wrapperRef.current) return;

    const blockImageTransfer = (e: ClipboardEvent | DragEvent) => {
      const files =
        "clipboardData" in e
          ? e.clipboardData?.files
          : e.dataTransfer?.files;
      if (!files) return;
      const hasImage = Array.from(files).some((f) =>
        f.type.startsWith("image/")
      );
      if (hasImage) {
        e.preventDefault();
        e.stopPropagation();
        toast.info("Use the image button in the toolbar to add images.");
      }
    };

    const el = wrapperRef.current;
    el.addEventListener("paste", blockImageTransfer as EventListener, true);
    el.addEventListener("drop", blockImageTransfer as EventListener, true);

    return () => {
      el.removeEventListener("paste", blockImageTransfer as EventListener, true);
      el.removeEventListener("drop", blockImageTransfer as EventListener, true);
    };
  }, [onImageUpload]);

  // Safety net: strip any base64 images that slip past the paste/drop blocker.
  const handleChange = useCallback(
    (html: string) => {
      if (onImageUpload && html.includes("src=\"data:")) {
        onChange(html.replace(/<img[^>]+src="data:[^"]*"[^>]*>/g, ""));
        return;
      }
      onChange(html);
    },
    [onChange, onImageUpload]
  );

  const modules = useMemo(() => {
    if (onImageUpload) {
      return {
        toolbar: {
          container: IMAGE_TOOLBAR,
          handlers: {
            image: function (this: { quill: { getSelection: (focus: boolean) => { index: number }; insertEmbed: (index: number, type: string, value: string) => void; setSelection: (index: number, length: number) => void } }) {
              const quill = this.quill;
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ACCEPTED_IMAGE_TYPES.join(",");
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                  toast.error("Please select a PNG, JPEG, GIF, or WebP image.");
                  return;
                }
                try {
                  const url = await onImageUploadRef.current!(file);
                  const range = quill.getSelection(true);
                  quill.insertEmbed(range.index, "image", url);
                  quill.setSelection(range.index + 1, 0);
                } catch {
                  toast.error("Failed to upload image. Please try again.");
                }
              };
              input.click();
            },
          },
        },
      };
    }
    return { toolbar: BASE_TOOLBAR };
  }, [onImageUpload]);

  return (
    <div ref={wrapperRef} className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        placeholder={placeholder}
        readOnly={disabled}
      />
    </div>
  );
}
