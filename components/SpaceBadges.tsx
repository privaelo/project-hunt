import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Space = {
  _id: Id<"focusAreas">;
  name: string;
  group: string;
};

export function SpaceBadges({
  spaces,
  className,
}: {
  spaces: Space[];
  className?: string;
}) {
  if (!spaces || spaces.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-1.5 flex-nowrap", className)}
      aria-label="Project spaces"
    >
      {spaces.map((space) => (
        <Badge key={space._id} variant="secondary">
          {space.name}
        </Badge>
      ))}
    </div>
  );
}
