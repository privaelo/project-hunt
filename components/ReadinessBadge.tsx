import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ReadinessStatus = "in_progress" | "ready_to_use";

interface ReadinessBadgeProps {
  status: ReadinessStatus | undefined;
  className?: string;
}

export function ReadinessBadge({ status, className }: ReadinessBadgeProps) {
  const effectiveStatus = status ?? "in_progress";
  const description = getReadinessStatusDescription(effectiveStatus);
  const label = effectiveStatus === "ready_to_use" ? "Ready to use" : "In progress";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className={cn(
            "inline-flex h-2 w-2 shrink-0 rounded-full cursor-help ring-1 ring-inset",
            effectiveStatus === "ready_to_use"
              ? "bg-emerald-500 ring-emerald-500/40"
              : "bg-amber-400 ring-amber-400/40",
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function getReadinessStatusDescription(status: ReadinessStatus | undefined): string {
  const effectiveStatus = status ?? "in_progress";
  if (effectiveStatus === "ready_to_use") {
    return "Stable and ready to use.";
  }
  return "Work in progress, feedback welcome.";
}
