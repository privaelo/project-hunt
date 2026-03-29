"use client";

import Link from "next/link";

/**
 * Renders plain text content with @[Username](userId) tokens
 * styled as clickable profile links.
 */
export function MentionText({ content }: { content: string }) {
  const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = re.exec(content)) !== null) {
    // Add text before this mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const userName = match[1];
    const userId = match[2];

    parts.push(
      <Link
        key={`${userId}-${match.index}`}
        href={`/profile/${encodeURIComponent(userId)}`}
        className="font-medium text-emerald-700 hover:underline"
      >
        @{userName}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  // If no mentions found, return content as-is
  if (parts.length === 0) {
    return <>{content}</>;
  }

  return <>{parts}</>;
}
