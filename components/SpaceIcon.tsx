import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SpaceIconProps {
  icon?: string;
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const sizeClasses = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-8 w-8",
} as const;

const iconTextClasses = {
  xs: "text-xs",
  sm: "text-base",
  md: "text-2xl",
} as const;

const fallbackTextClasses = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
} as const;

export function SpaceIcon({ icon, name, size = "sm", className }: SpaceIconProps) {
  // For emojis, render standalone without Avatar wrapper
  if (icon) {
    return (
      <span
        role="img"
        aria-label={`${name} icon`}
        className={cn(
          "flex shrink-0 items-center justify-center",
          sizeClasses[size],
          iconTextClasses[size],
          className
        )}
      >
        {icon}
      </span>
    );
  }

  // For fallback initials, use Avatar for consistency
  return (
    <Avatar className={cn("rounded", sizeClasses[size], className)}>
      <AvatarFallback className={cn("bg-zinc-200 text-zinc-600 font-semibold", fallbackTextClasses[size])}>
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
