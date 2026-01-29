import { cn } from "@/lib/utils";

interface SpaceIconProps {
  icon?: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5 text-sm",
  md: "h-8 w-8 text-lg",
} as const;

const fallbackSizeClasses = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-8 w-8 text-xs",
} as const;

export function SpaceIcon({ icon, name, size = "sm", className }: SpaceIconProps) {
  if (icon) {
    return (
      <span
        role="img"
        aria-label={`${name} icon`}
        className={cn(
          "flex shrink-0 items-center justify-center",
          sizeClasses[size],
          className
        )}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded bg-zinc-200 font-semibold text-zinc-600",
        fallbackSizeClasses[size],
        className
      )}
      aria-label={`${name} icon`}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
