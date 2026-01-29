import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SpaceIconProps {
  icon?: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
} as const;

const fallbackTextClasses = {
  sm: "text-[10px]",
  md: "text-xs",
} as const;

export function SpaceIcon({ icon, name, size = "sm", className }: SpaceIconProps) {
  return (
    <Avatar className={cn("rounded", sizeClasses[size], className)}>
      <AvatarFallback className={cn("bg-zinc-200 text-zinc-600 font-semibold", fallbackTextClasses[size])}>
        {icon || name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
