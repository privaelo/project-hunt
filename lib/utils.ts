import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips HTML tags from a string, returning plain text.
 * Inserts spaces between block-level elements and decodes HTML entities
 * so rich text like `<h1>Title</h1><p>bold&nbsp;text</p>` becomes
 * "Title bold text".
 */
export function stripHtml(html: string): string {
  return html
    // Insert a space before block-level closing/opening tags so words don't merge
    .replace(/<\/(p|h[1-6]|li|div|blockquote|pre|ol|ul)>/gi, " ")
    .replace(/<(p|h[1-6]|li|div|blockquote|pre|ol|ul|br)[^>]*\/?>/gi, " ")
    // Remove all remaining tags
    .replace(/<[^>]*>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace and trim
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a rich text HTML string has meaningful content
 * (not just empty tags like "<p><br></p>").
 */
export function isRichTextEmpty(html: string): boolean {
  return stripHtml(html).length === 0;
}
