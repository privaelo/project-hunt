import { type SVGProps } from "react";

/**
 * Composite icon: an eye inside a rounded rectangle (representing a "post").
 * Conveys "views on this post" — distinct from a standalone Eye icon.
 * Accepts the same props as a Lucide icon for drop-in replacement.
 */
export function ViewsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Rounded rectangle — the "post" container */}
      <rect x="2" y="3" width="20" height="18" rx="3" ry="3" />
      {/* Eye shape — centered inside the rectangle */}
      <path d="M12 9.5c-3.5 0-5.5 2.5-5.5 2.5s2 2.5 5.5 2.5 5.5-2.5 5.5-2.5-2-2.5-5.5-2.5z" />
      {/* Pupil */}
      <circle cx="12" cy="12" r="1.25" />
    </svg>
  );
}
