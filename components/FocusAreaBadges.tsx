import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

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
        "text-zinc-500",
        className
      )}
      aria-label="Project focus areas"
    >
      {focusAreas.map((area, index) => (
        <span key={area._id}>
          {index > 0 && <span className="mx-1.5">•</span>}
          <span className="whitespace-nowrap">{area.name}</span>
        </span>
      ))}
    </span>
  );
}
