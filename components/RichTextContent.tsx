"use client";

import DOMPurify from "dompurify";

interface RichTextContentProps {
  html: string;
  className?: string;
}

export function RichTextContent({ html, className = "" }: RichTextContentProps) {
  // Replace non-breaking spaces with regular spaces to allow proper text wrapping
  // Quill sometimes outputs &nbsp; between words (especially on paste), which prevents line breaks
  const normalizedHtml = html.replace(/&nbsp;/g, " ");

  const clean = DOMPurify.sanitize(normalizedHtml, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "span",
      "img",
    ],
    ALLOWED_ATTR: [
      "href", "rel", "target", "class", "data-language", "src", "alt", "width", "height",
      "data-id", "data-value", "data-denotation-char",
    ],
  });

  // Post-process: convert mention spans to profile links
  const withMentionLinks = clean.replace(
    /<span class="mention"[^>]*data-id="([^"]*)"[^>]*data-value="([^"]*)"[^>]*>[^<]*<\/span>/g,
    (_match, id, value) =>
      `<a href="/profile/${encodeURIComponent(id)}" class="mention" data-id="${id}">@${escapeHtml(value)}</a>`
  );

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: withMentionLinks }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
