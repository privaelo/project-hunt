"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A textarea that supports @mention autocomplete.
 * When the user types @ followed by characters, a dropdown shows matching users.
 * Selecting a user inserts @[Username](userId) into the text.
 */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mentionActiveRef = useRef(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [debouncedMentionQuery, setDebouncedMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Debounce the query sent to Convex by 250ms — always update via timer to satisfy React Compiler
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMentionQuery(mentionQuery), 250);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const searchResults = useQuery(
    api.mentions.searchUsers,
    // Gate on mentionQuery (not debounced) so the query stops immediately when the dropdown closes,
    // even before the debounce timer fires
    mentionQuery !== null && debouncedMentionQuery !== null && debouncedMentionQuery.length > 0
      ? { query: debouncedMentionQuery, limit: 6 }
      : "skip"
  );

  const results = useMemo(() => searchResults ?? [], [searchResults]);

  const updateDropdownPosition = useCallback(
    (textarea: HTMLTextAreaElement, atIndex: number) => {
      // Create a mirror div to measure caret position
      const mirror = document.createElement("div");
      const computed = window.getComputedStyle(textarea);

      const stylesToCopy = [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "lineHeight",
        "letterSpacing",
        "wordSpacing",
        "textIndent",
        "paddingTop",
        "paddingLeft",
        "paddingRight",
        "borderTopWidth",
        "borderLeftWidth",
        "boxSizing",
        "whiteSpace",
        "wordWrap",
        "overflowWrap",
      ] as const;

      mirror.style.position = "absolute";
      mirror.style.visibility = "hidden";
      mirror.style.width = `${textarea.clientWidth}px`;
      mirror.style.overflow = "hidden";

      for (const prop of stylesToCopy) {
        mirror.style[prop] = computed[prop];
      }
      mirror.style.whiteSpace = "pre-wrap";

      // Insert text up to the @ character, then a marker span
      const textBefore = textarea.value.substring(0, atIndex);
      const textNode = document.createTextNode(textBefore);
      const marker = document.createElement("span");
      marker.textContent = "@";
      mirror.appendChild(textNode);
      mirror.appendChild(marker);

      document.body.appendChild(mirror);

      const textareaRect = textarea.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();

      const top =
        markerRect.top - mirrorRect.top - textarea.scrollTop + textarea.offsetHeight;
      const left = markerRect.left - mirrorRect.left;

      document.body.removeChild(mirror);

      setDropdownPosition({
        top: Math.min(top, textareaRect.height + 4),
        left: Math.min(left, textareaRect.width - 200),
      });
    },
    []
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      const textarea = e.target;
      const cursorPos = textarea.selectionStart;

      // Scan backwards from cursor to find an @ trigger
      let atIndex = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        const char = newValue[i];
        if (char === "@") {
          // Check that @ is at start of text or preceded by whitespace
          if (i === 0 || /\s/.test(newValue[i - 1])) {
            atIndex = i;
          }
          break;
        }
        // Stop if we hit whitespace or special chars before finding @
        if (/[\s\n]/.test(char)) break;
      }

      if (atIndex >= 0) {
        const query = newValue.slice(atIndex + 1, cursorPos);
        // Only trigger if the query is reasonable (no newlines, not too long)
        if (query.length <= 30 && !/\n/.test(query)) {
          setMentionQuery(query);
          setMentionStart(atIndex);
          setSelectedIndex(0);
          updateDropdownPosition(textarea, atIndex);
          return;
        }
      }

      setMentionQuery(null);
    },
    [onChange, updateDropdownPosition]
  );

  const insertMention = useCallback(
    (userId: string, userName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const before = value.slice(0, mentionStart);
      const after = value.slice(textarea.selectionStart);
      const mention = `@[${userName}](${userId}) `;
      const newValue = before + mention + after;

      onChange(newValue);
      setMentionQuery(null);

      // Set cursor position after the mention
      requestAnimationFrame(() => {
        const newPos = before.length + mention.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      });
    },
    [value, mentionStart, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery === null || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (results[selectedIndex]) {
          e.preventDefault();
          const user = results[selectedIndex];
          insertMention(user._id, user.name);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
      }
    },
    [mentionQuery, results, selectedIndex, insertMention]
  );

  // Keep ref in sync so the click-outside handler (registered once) can read current open state
  useEffect(() => {
    mentionActiveRef.current = mentionQuery !== null;
  }, [mentionQuery]);

  // Register click-outside listener once for the component lifetime
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!mentionActiveRef.current) return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = mentionQuery !== null && results.length > 0;

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex min-h-8 w-full rounded-md bg-transparent text-sm leading-5 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        rows={1}
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {results.map((user, index) => (
            <button
              key={user._id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-50",
                index === selectedIndex && "bg-zinc-100"
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent textarea blur
                insertMention(user._id, user.name);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatarUrlId} alt={user.name} />
                <AvatarFallback className="text-[10px] font-semibold text-zinc-600">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium text-zinc-900">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
