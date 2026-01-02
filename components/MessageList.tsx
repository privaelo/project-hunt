"use client";

import { useEffect, useRef, useMemo } from "react";
import { useThreadMessages } from "@convex-dev/agent/react";
import { api } from "@/convex/_generated/api";
import { SearchingIndicator } from "@/components/chat/SearchingIndicator";
import { ProjectCardsDisplay } from "@/components/chat/ProjectCardsDisplay";
import ReactMarkdown from "react-markdown";

type OptimisticMessage = {
  id: string;
  role: 'user';
  content: string;
  timestamp: number;
};

interface MessageListProps {
  threadId: string;
  optimisticMessages?: OptimisticMessage[];
}

// Type for tool-call content parts
interface ToolCallPart {
  type: "tool-call";
  toolName: string;
  args: Record<string, unknown>;
}

// Type guard for tool-call parts
function isToolCallPart(part: unknown): part is ToolCallPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type: string }).type === "tool-call" &&
    "toolName" in part
  );
}

// Check if a content part has visible text
function hasTextContent(part: unknown): boolean {
  if (typeof part === "object" && part !== null && "type" in part) {
    const typed = part as { type: string; text?: string };
    return typed.type === "text" && !!typed.text;
  }
  return false;
}

// Check if a content part is a tool-call we want to display
function isDisplayableToolCall(part: unknown): boolean {
  if (isToolCallPart(part)) {
    return part.toolName === "searchProjects" || part.toolName === "showProjects";
  }
  return false;
}

// Markdown component with styled prose
function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children }) => (
          <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-black/10 dark:bg-white/10 p-2 rounded text-xs overflow-x-auto mb-2">
            {children}
          </pre>
        ),
        a: ({ href, children }) => (
          <a href={href} className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// Render a single content part
function renderContentPart(part: unknown, index: number) {
  if (typeof part === "object" && part !== null && "type" in part) {
    const typed = part as { type: string; text?: string };

    // Handle text parts
    if (typed.type === "text" && typed.text) {
      return <Markdown key={index}>{typed.text}</Markdown>;
    }

    // Handle tool-call parts
    if (isToolCallPart(part)) {
      if (part.toolName === "searchProjects") {
        return <SearchingIndicator key={index} />;
      }
      if (part.toolName === "showProjects") {
        const args = part.args as { projectIds?: string[]; summary?: string };
        if (args.projectIds && Array.isArray(args.projectIds)) {
          return (
            <ProjectCardsDisplay
              key={index}
              projectIds={args.projectIds}
              summary={args.summary ?? ""}
            />
          );
        }
      }
    }
  }
  return null;
}

export function MessageList({ threadId, optimisticMessages = [] }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { results: messages } = useThreadMessages(
    api.ragbot.listThreadMessages,
    { threadId },
    { initialNumItems: 20, stream: true }
  );

  // Filter out optimistic messages that already exist in the database
  const filteredOptimisticMessages = useMemo(() => {
    if (!messages || messages.length === 0) return optimisticMessages;

    // Collect all user message contents from database
    const dbUserMessageContents = new Set(
      messages
        .filter(msg => msg.message?.role === 'user')
        .map(msg => {
          const content = msg.message?.content;
          return typeof content === 'string' ? content : '';
        })
        .filter(Boolean)
    );

    // Filter out optimistic messages that match database messages
    return optimisticMessages.filter(
      optimistic => !dbUserMessageContents.has(optimistic.content)
    );
  }, [optimisticMessages, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      {(!messages || messages.length === 0) && filteredOptimisticMessages.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground mt-8">
          Ask me anything about projects!
        </div>
      ) : (
        <>
        {messages && messages.length > 0 && (
        // Deduplicate messages by tracking showProjects tool calls we've seen
        (() => {
          const seenShowProjectsCalls = new Set<string>();
          return messages.map((msg, index) => {
            const role = msg.message?.role;
            const content = msg.message?.content;
            if (!content || !role) return null;

            // Skip tool result messages (they duplicate what tool-call shows)
            if (role === "tool") return null;

            // Deduplicate showProjects tool calls by their args
            if (Array.isArray(content)) {
              const showProjectsPart = content.find(
                (part) => isToolCallPart(part) && part.toolName === "showProjects"
              );
              if (showProjectsPart && isToolCallPart(showProjectsPart)) {
                const key = JSON.stringify(showProjectsPart.args);
                if (seenShowProjectsCalls.has(key)) {
                  return null; // Skip duplicate
                }
                seenShowProjectsCalls.add(key);
              }
            }

          // For array content, check what types of content we have
          if (Array.isArray(content)) {
            const hasText = content.some(hasTextContent);
            const hasToolCalls = content.some(isDisplayableToolCall);

            // Skip if no displayable content
            if (!hasText && !hasToolCalls) return null;

            // Render tool calls without bubble wrapper (assistant only)
            if (!hasText && hasToolCalls && role === "assistant") {
              return (
                <div key={index} className="flex justify-start">
                  <div className="max-w-[80%]">
                    {content.map((part, i) => renderContentPart(part, i))}
                  </div>
                </div>
              );
            }
          }

          return (
          <div
            key={index}
            className={`flex ${
              role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 text-sm ${
                role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {typeof content === 'string'
                ? <Markdown>{content}</Markdown>
                : Array.isArray(content)
                  ? content.map((part, i) => renderContentPart(part, i))
                  : null
              }
            </div>
          </div>
        );})
        })()
        )}
        {/* Render optimistic messages with reduced opacity */}
        {filteredOptimisticMessages.map((optimisticMsg) => (
          <div key={optimisticMsg.id} className="flex justify-end opacity-70">
            <div className="max-w-[80%] rounded-lg p-3 text-sm bg-primary text-primary-foreground">
              <Markdown>{optimisticMsg.content}</Markdown>
            </div>
          </div>
        ))}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
