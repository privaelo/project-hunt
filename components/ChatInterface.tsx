"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, ArrowRight } from "lucide-react";
import { MessageList } from "./MessageList";

export function ChatInterface() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const createThread = useMutation(api.ragbot.createThread);

  const sendMessageToAgent = useAction(api.ragbot.sendMessageToAgent);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleStartChat = async () => {
    try {
      const newThreadId = await createThread();
      setThreadId(newThreadId);
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !threadId) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      await sendMessageToAgent({ threadId, prompt: userMessage });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!threadId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 border rounded-xl bg-muted/20">
        <div className="p-3 bg-primary/10 rounded-full">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-lg">Project Assistant</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Ask me to help you find projects or answer questions about the community.
          </p>
        </div>
        <Button onClick={handleStartChat} className="gap-2">
          Start Chat <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-xl overflow-hidden bg-background shadow-sm">
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Project Assistant</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Thread: {threadId.slice(0, 8)}...
        </div>
      </div>
      
      <MessageList threadId={threadId} isSending={isSending} />

      <div className="p-4 border-t bg-muted/10">
        <form className="flex gap-2" onSubmit={handleSendMessage}>
          <Input 
            className="flex-1"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
          />
          <Button type="submit" size="sm" disabled={isSending || !inputValue.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

