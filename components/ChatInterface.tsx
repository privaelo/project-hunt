"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { MessageList } from "./MessageList";

export function ChatInterface() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const createThread = useMutation(api.ragbot.createThread);

  const sendMessageToAgent = useAction(api.ragbot.sendMessageToAgent);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    try {
      let currentThreadId = threadId;

      // Create thread on first message if it doesn't exist
      if (!currentThreadId) {
        currentThreadId = await createThread();
        setThreadId(currentThreadId);
      }

      await sendMessageToAgent({ threadId: currentThreadId, prompt: userMessage });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[700px] border rounded-xl overflow-hidden bg-background shadow-sm">
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Project Assistant</span>
        </div>
        {threadId && (
          <div className="text-xs text-muted-foreground">
            Thread: {threadId.slice(0, 8)}...
          </div>
        )}
      </div>

      {threadId ? (
        <MessageList threadId={threadId} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Start a conversation...
        </div>
      )}

      <div className="p-4 border-t bg-muted/10">
        <form className="flex gap-2" onSubmit={handleSendMessage}>
          <Input
            className="flex-1"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!inputValue.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

