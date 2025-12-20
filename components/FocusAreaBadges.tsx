import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";

type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string;
};

export function FocusAreaBadges({
  focusAreas,
  className,
}: {
  focusAreas: FocusArea[];
  className?: string;
}) {
  if (!focusAreas || focusAreas.length === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-zinc-500",
        className
      )}
      aria-label="Project focus areas"
    >
      <Tag className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span className="flex items-center flex-wrap">
        {focusAreas.map((area, index) => (
          <span key={area._id}>
            {index > 0 && <span className="mx-1.5">•</span>}
            <span className="whitespace-nowrap">{area.name}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
