"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { stripHtml } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ChatInterface } from "./ChatInterface";

interface SearchResult {
  _id: Id<"projects">;
  name: string;
  summary?: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const router = useRouter();

  const searchProjects = useAction(api.projects.searchProjects);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setIsOpen(true);

    searchProjects({ query: debouncedQuery })
      .then((searchResults) => {
        if (requestIdRef.current !== currentRequestId) return;
        setResults(searchResults);
        setIsOpen(true);
      })
      .catch((error) => {
        if (requestIdRef.current !== currentRequestId) return;
        console.error("Search failed:", error);
        setResults([]);
      })
      .finally(() => {
        if (requestIdRef.current !== currentRequestId) return;
        setIsLoading(false);
      });
  }, [debouncedQuery, searchProjects]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const navigateToResult = useCallback(
    (id: Id<"projects">) => {
      closeDropdown();
      setQuery("");
      router.push(`/project/${id}`);
    },
    [closeDropdown, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            navigateToResult(results[activeIndex]._id);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, activeIndex, navigateToResult, closeDropdown]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className="relative flex items-center w-80">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-14 text-sm text-foreground placeholder:text-muted-foreground shadow-sm ring-2 ring-ring/15 transition-all hover:bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Search tools..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (results.length > 0 && query.trim().length >= 2) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search tools"
            aria-expanded={isOpen}
            role="combobox"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={
              activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
            }
          />
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-primary shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="AI Search Assistant"
                onClick={(e) => e.stopPropagation()}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="p-0 border-0 bg-transparent shadow-none sm:max-w-3xl w-[90vw]">
              <VisuallyHidden>
                <DialogTitle>Search the Tools Catalog</DialogTitle>
              </VisuallyHidden>
              <ChatInterface />
            </DialogContent>
          </Dialog>
        </div>
      </PopoverAnchor>

      <PopoverContent
        id="search-results"
        role="listbox"
        className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1.5 rounded-md p-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((result, index) => (
              <Link
                key={result._id}
                id={`search-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                href={`/project/${result._id}`}
                className={`flex flex-col gap-0.5 px-3 py-2 text-sm no-underline transition-colors ${
                  index === activeIndex
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToResult(result._id);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="font-medium text-zinc-900 truncate">
                  {result.name}
                </span>
                {result.summary && (
                  <span className="text-xs text-zinc-500 line-clamp-1">
                    {stripHtml(result.summary)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-zinc-500">
            No projects found.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
