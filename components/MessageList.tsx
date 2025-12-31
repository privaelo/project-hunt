"use client";

import { useEffect, useRef } from "react";
import { useThreadMessages } from "@convex-dev/agent/react";
import { api } from "@/convex/_generated/api";

interface MessageListProps {
  threadId: string;
  isSending?: boolean;
}

export function MessageList({ threadId, isSending }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { results: messages } = useThreadMessages(
    api.ragbot.listThreadMessages,
    { threadId },
    { initialNumItems: 20 }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      {(!messages || messages.length === 0) ? (
        <div className="text-center text-sm text-muted-foreground mt-8">
          Ask me anything about projects!
        </div>
      ) : (
        messages.map((msg, index) => {
          const role = msg.message?.role;
          const content = msg.message?.content;
          if (!content || !role) return null;
          
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
                ? content 
                : content.map((part, i) => {
                    if (part.type === 'text') return <span key={i}>{part.text}</span>;
                    return null;
                  })
              }
            </div>
          </div>
        )})
      )}
      {isSending && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg p-3 text-sm">Thinking...</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
