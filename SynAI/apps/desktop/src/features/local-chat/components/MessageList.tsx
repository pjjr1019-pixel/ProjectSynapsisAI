import { useEffect, useRef } from "react";
import type { ChatMessage } from "@contracts";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  if (messages.length === 0) {
    return <div className="text-sm text-slate-400">No messages yet. Start the conversation.</div>;
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {messages.map((message, index) => {
        const previousUserAt =
          message.role === "assistant"
            ? [...messages]
                .slice(0, index)
                .reverse()
                .find((item) => item.role === "user")?.createdAt ?? null
            : null;

        return <MessageItem key={message.id} message={message} previousUserAt={previousUserAt} />;
      })}
      {loading ? <div className="text-xs text-cyan-300">Model is thinking...</div> : null}
      <div ref={bottomRef} />
    </div>
  );
}
