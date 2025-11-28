"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "./types";

interface ChatMessageProps {
  message: ChatMessageType;
  userImage?: string | null;
  userName?: string | null;
}

export function ChatMessage({ message, userImage, userName }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {isUser ? (
          <>
            <AvatarImage src={userImage || undefined} />
            <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
              {userName?.charAt(0) || "U"}
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-purple-500/20 text-purple-400 text-xs">
            AI
          </AvatarFallback>
        )}
      </Avatar>

      <div
        className={cn(
          "flex-1 max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-blue-500/20 text-white"
            : "bg-[#202e32] border border-white/10 text-white"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 pl-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
