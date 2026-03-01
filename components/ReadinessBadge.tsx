import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ReadinessStatus = "in_progress" | "just_an_idea" | "early_prototype" | "mostly_working" | "ready_to_use";

interface ReadinessBadgeProps {
  status: ReadinessStatus | undefined;
  className?: string;
}

const statusConfig: Record<string, { color: string; ring: string; label: string; tooltip: string }> = {
  just_an_idea: {
    color: "bg-zinc-400",
    ring: "ring-zinc-400/45",
    label: "Just an idea",
    tooltip: "Just an idea — not built yet.",
  },
  early_prototype: {
    color: "bg-amber-400",
    ring: "ring-amber-400/45",
    label: "Early prototype",
    tooltip: "Early prototype, feedback welcome.",
  },
  mostly_working: {
    color: "bg-lime-400",
    ring: "ring-lime-400/45",
    label: "Mostly working",
    tooltip: "Mostly working, still has rough edges.",
  },
  ready_to_use: {
    color: "bg-emerald-600",
    ring: "ring-emerald-600/45",
    label: "Ready to use",
    tooltip: "Stable and ready to use.",
  },
};

function resolveStatus(status: ReadinessStatus | undefined): string {
  if (!status || status === "in_progress") return "early_prototype";
  return status;
}

export function ReadinessBadge({ status, className }: ReadinessBadgeProps) {
  const resolved = resolveStatus(status);
  const config = statusConfig[resolved];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={config.label}
          className={cn(
            "inline-flex h-2 w-2 shrink-0 rounded-full cursor-help ring-1 ring-inset",
            config.color,
            config.ring,
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function getReadinessStatusDescription(status: ReadinessStatus | undefined): string {
  const resolved = resolveStatus(status);
  return statusConfig[resolved].tooltip;
}
