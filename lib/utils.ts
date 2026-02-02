import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips HTML tags from a string, returning plain text.
 * Used for displaying rich text summaries in preview contexts.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Checks if a rich text HTML string has meaningful content
 * (not just empty tags like "<p><br></p>").
 */
export function isRichTextEmpty(html: string): boolean {
  return stripHtml(html).length === 0;
}
