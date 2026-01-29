"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SmilePlus } from "lucide-react";

function EmojiPickerPopover({
  selectedEmoji,
  onSelect,
}: {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerMountedRef = useRef(false);

  const handleEmojiSelect = useCallback(
    (emoji: { native: string }) => {
      onSelect(emoji.native);
      setOpen(false);
    },
    [onSelect]
  );

  useEffect(() => {
    if (!open || !containerRef.current || pickerMountedRef.current) return;
    let cancelled = false;

    Promise.all([
      import("emoji-mart"),
      import("@emoji-mart/data"),
    ]).then(([{ Picker }, dataModule]) => {
      if (cancelled || !containerRef.current) return;
      pickerMountedRef.current = true;
      new Picker({
        data: dataModule.default,
        onEmojiSelect: handleEmojiSelect,
        theme: "light",
        previewPosition: "none",
        skinTonePosition: "none",
        parent: containerRef.current,
      });
    });

    return () => { cancelled = true; };
  }, [open, handleEmojiSelect]);

  // Reset mount tracking when popover closes so it re-creates on next open
  useEffect(() => {
    if (!open) {
      pickerMountedRef.current = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-12 p-0"
        >
          {selectedEmoji ? (
            <span className="text-2xl">{selectedEmoji}</span>
          ) : (
            <SmilePlus className="h-5 w-5 text-zinc-400" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0"
        side="right"
        align="start"
      >
        <div ref={containerRef}>
          {!pickerMountedRef.current && (
            <div className="flex items-center justify-center p-8 text-sm text-zinc-400">
              Loading...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CreateFocusAreaDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createFocusArea = useMutation(api.focusAreas.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createFocusArea({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon || undefined,
      });
      setName("");
      setDescription("");
      setIcon("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What kind of tools belong here?</DialogTitle>
          <DialogDescription>
            Create a new category to help others discover tools
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fa-name" className="text-sm font-medium text-zinc-700">
              Name
            </label>
            <div className="flex items-center gap-3">
              <EmojiPickerPopover
                selectedEmoji={icon}
                onSelect={setIcon}
              />
              <Input
                id="fa-name"
                placeholder="e.g. Developer Productivity"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex-1"
              />
            </div>
            {icon && (
              <button
                type="button"
                onClick={() => setIcon("")}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Remove icon
              </button>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="fa-desc" className="text-sm font-medium text-zinc-700">
              Description
            </label>
            <Textarea
              id="fa-desc"
              placeholder="What kind of tools belong here?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
