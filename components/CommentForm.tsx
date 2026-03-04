"use client";

import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<unknown>;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "What do you think?",
  submitText = "Comment",
}: CommentFormProps) {
  const { isAuthenticated } = useConvexAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
      onCancel?.();
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="mb-3 text-sm text-zinc-500">
          Sign in to join the discussion
        </p>
        <Button variant="outline" asChild>
          <Link href="/sign-in" prefetch={false}>
            Sign In
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="min-h-8 border-0 px-0 text-sm leading-5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isSubmitting}
      />
      <div className="mt-1 flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? "Posting..." : submitText}
        </Button>
      </div>
    </form>
  );
}
