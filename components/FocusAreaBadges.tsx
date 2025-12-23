import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    <div
      className={cn(
        "flex items-center gap-1.5 flex-nowrap",
        className
      )}
      aria-label="Project focus areas"
    >
      {focusAreas.map((area) => (
        <Badge key={area._id} variant="secondary">
          {area.name}
        </Badge>
      ))}
    </div>
  );
}
