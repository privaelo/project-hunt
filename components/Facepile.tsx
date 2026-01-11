"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

type Adopter = {
  _id: Id<"users">;
  name: string;
  avatarUrl: string;
};

type CurrentUser = {
  _id: Id<"users">;
  name: string;
  avatarUrl: string;
} | null;

interface FacepileProps {
  adopters: Adopter[];
  totalCount: number;
  maxVisible?: number;
  size?: "sm" | "md";
  // Interactive props
  hasAdopted?: boolean;
  currentUser?: CurrentUser;
  isAuthenticated?: boolean;
  onToggle?: () => void;
  showLabel?: boolean;
  projectId?: Id<"projects">;
}

export function Facepile({
  adopters,
  totalCount,
  maxVisible = 4,
  size = "sm",
  hasAdopted = false,
  currentUser = null,
  isAuthenticated = false,
  onToggle,
  showLabel = true,
  projectId,
}: FacepileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isInteractive = onToggle !== undefined;
  const sizeClasses = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  // Fetch all adopters if dialog is open and projectId is available
  const allAdopters = useQuery(
    api.projects.getAdopters,
    isOpen && projectId ? { projectId } : "skip"
  );

  // Filter out current user from adopters to avoid duplicate display
  const otherAdopters = currentUser
    ? adopters.filter((a) => a._id !== currentUser._id)
    : adopters;

  // Calculate how many "other" adopters to show
  // If user has adopted, their avatar takes one slot
  const slotsForOthers = hasAdopted ? maxVisible - 1 : maxVisible;
  const visibleOthers = otherAdopters.slice(0, Math.max(0, slotsForOthers));

  // Remaining count excludes visible others and current user (if adopted)
  const displayedCount = visibleOthers.length + (hasAdopted ? 1 : 0);
  const remainingCount = totalCount - displayedCount;

  // Empty state: show only the +You button if interactive
  if (totalCount === 0 && !isInteractive) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.();
  };

  // The +You button or user's avatar with checkmark
  const renderUserAction = () => {
    if (!isInteractive) return null;

    if (!isAuthenticated) {
      // Link to sign-in
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/sign-in"
              prefetch={false}
              onClick={(e) => e.stopPropagation()}
              className={`${sizeClasses} relative z-10 flex items-center justify-center rounded-full bg-zinc-100 font-medium text-zinc-500 ring-2 ring-white hover:bg-zinc-200 hover:text-zinc-700 transition-colors cursor-pointer`}
            >
              <Plus className={iconSize} />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Sign in to mark as using</TooltipContent>
        </Tooltip>
      );
    }

    if (hasAdopted && currentUser) {
      // Show user's avatar with checkmark overlay
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileTap={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 800, damping: 20 }}
              onClick={handleClick}
              className="relative z-10 cursor-pointer"
            >
              <Avatar
                className={`${sizeClasses} bg-emerald-100 ring-2 ring-emerald-500`}
              >
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback className="font-semibold text-emerald-700 bg-emerald-100">
                  {(currentUser.name || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <Check className="h-2 w-2 text-white" strokeWidth={3} />
              </div>
          </motion.button>
        </TooltipTrigger>
          <TooltipContent>You&apos;re using this. Click to remove</TooltipContent>
        </Tooltip>
      );
    }

    // Show +You button
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileTap={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 800, damping: 20 }}
            onClick={handleClick}
            className={`${sizeClasses} relative z-10 flex items-center justify-center rounded-full bg-zinc-100 font-medium text-zinc-500 ring-2 ring-white hover:bg-emerald-100 hover:text-emerald-600 hover:ring-emerald-200 transition-colors cursor-pointer`}
          >
            <Plus className={iconSize} />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>I&apos;m using this</TooltipContent>
      </Tooltip>
    );
  };

  const content = (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2 [&_[data-slot=avatar]]:ring-2 [&_[data-slot=avatar]]:ring-white">
        {/* Other adopters */}
        {visibleOthers.map((adopter) => (
          <Avatar
            key={adopter._id}
            className={`${sizeClasses} bg-zinc-100 cursor-pointer`}
          >
            <AvatarImage src={adopter.avatarUrl} alt={adopter.name} />
            <AvatarFallback className="font-semibold text-zinc-600">
              {(adopter.name || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}

        {/* Current user's avatar (if adopted) or +You button */}
        {renderUserAction()}
      </div>
      {remainingCount > 0 && (
        <span className="text-sm text-zinc-500 whitespace-nowrap cursor-pointer hover:underline">
          and {remainingCount} {remainingCount === 1 ? "other" : "others"}
        </span>
      )}
    </div>
  );

  // If projectId is provided, wrap in Dialog
  if (projectId) {
    return (
      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {showLabel && totalCount > 0 && (
          <span className="text-sm text-zinc-500 whitespace-nowrap">
            Used by
          </span>
        )}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <div className="cursor-pointer hover:opacity-80 transition-opacity">
              {content}
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Used by {totalCount} people</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-4">
                {allAdopters === undefined ? (
                  <div className="flex items-center justify-center py-4 text-zinc-500">
                    Loading...
                  </div>
                ) : (
                  (allAdopters || []).map((adopter) => (
                    <Link
                      key={adopter._id}
                      href={`/profile/${adopter._id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-8 w-8 bg-zinc-100">
                        <AvatarImage src={adopter.avatarUrl} alt={adopter.name} />
                        <AvatarFallback className="font-semibold text-zinc-600">
                          {(adopter.name || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium text-zinc-900 hover:underline">
                        {adopter.name}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Fallback if no projectId (shouldn't happen in project page)
  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {showLabel && totalCount > 0 && (
        <span className="text-sm text-zinc-500 whitespace-nowrap">
          Used by
        </span>
      )}
      {content}
    </div>
  );
}
