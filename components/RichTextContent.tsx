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
    ],
    ALLOWED_ATTR: ["href", "rel", "target", "class", "data-language"],
  });

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
