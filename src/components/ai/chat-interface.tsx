"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { ChatEditor, type ChatEditorHandle } from "./chat-editor";
import { ChatMessage } from "./chat-message";
import type {
  ChatMessage as ChatMessageType,
  EntityReference,
  SuggestionItem,
} from "./types";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

interface ChatInterfaceProps {
  subaccountId?: string;
  userImage?: string | null;
  userName?: string | null;
  className?: string;
}

export function ChatInterface({
  subaccountId,
  userImage,
  userName,
  className,
}: ChatInterfaceProps) {
  const trpc = useTRPC();
  const editorRef = useRef<ChatEditorHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingEntities, setPendingEntities] = useState<EntityReference[]>([]);

  const chat = useChat({
    body: {
      subaccountId,
    },
    onFinish: () => {
      setPendingEntities([]);
    },
  } as any);

  const { messages, isLoading, setMessages } = chat as any;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch suggestions for mentions and commands
  const contactsQuery = useQuery(
    trpc.contacts.list.queryOptions({ limit: 50 })
  );

  const dealsQuery = useQuery(trpc.deals.list.queryOptions({ limit: 50 }));

  const pipelinesQuery = useQuery(
    trpc.pipelines.list.queryOptions({ limit: 50 })
  );

  // Workflows available at both agency and subaccount level
  const workflowsQuery = useQuery(
    trpc.workflows.getMany.queryOptions({ pageSize: 50 })
  );

  const fetchSuggestions = useCallback(
    async (
      query: string,
      type: "mention" | "command"
    ): Promise<SuggestionItem[]> => {
      const items: SuggestionItem[] = [];
      const lowerQuery = query.toLowerCase();

      if (type === "command") {
        // Slash commands are ACTIONS
        const commands: SuggestionItem[] = [
          // CRM Actions
          {
            id: "create-contact",
            name: "create-contact",
            type: "action",
            description: "Create a new contact",
          },
          {
            id: "create-deal",
            name: "create-deal",
            type: "action",
            description: "Create a new deal",
          },
          {
            id: "create-pipeline",
            name: "create-pipeline",
            type: "action",
            description: "Create a new pipeline",
          },
          {
            id: "create-task",
            name: "create-task",
            type: "action",
            description: "Create a new task",
          },
          {
            id: "log-note",
            name: "log-note",
            type: "action",
            description: "Log a note",
          },
          {
            id: "send-email",
            name: "send-email",
            type: "action",
            description: "Send an email",
          },
          {
            id: "schedule-meeting",
            name: "schedule-meeting",
            type: "action",
            description: "Schedule a meeting",
          },
          // Automation Actions
          {
            id: "run-workflow",
            name: "run-workflow",
            type: "action",
            description: "Run a workflow",
          },
          {
            id: "list-workflows",
            name: "list-workflows",
            type: "action",
            description: "List all workflows",
          },
          {
            id: "generate-workflow",
            name: "generate-workflow",
            type: "ai",
            description: "AI: Generate a workflow",
          },
          // AI Actions
          {
            id: "summarise",
            name: "summarise",
            type: "ai",
            description: "AI: Summarise content",
          },
          {
            id: "explain",
            name: "explain",
            type: "ai",
            description: "AI: Explain something",
          },
          {
            id: "draft-email",
            name: "draft-email",
            type: "ai",
            description: "AI: Draft an email",
          },
          {
            id: "analyze",
            name: "analyze",
            type: "ai",
            description: "AI: Analyze data",
          },
          {
            id: "research",
            name: "research",
            type: "ai",
            description: "AI: Research a topic",
          },
          // Search/Query Commands
          {
            id: "show-contacts",
            name: "show-contacts",
            type: "query",
            description: "Show all contacts",
          },
          {
            id: "show-deals",
            name: "show-deals",
            type: "query",
            description: "Show all deals",
          },
          {
            id: "show-pipelines",
            name: "show-pipelines",
            type: "query",
            description: "Show all pipelines",
          },
          {
            id: "show-workflows",
            name: "show-workflows",
            type: "query",
            description: "Show all workflows",
          },
          {
            id: "search",
            name: "search",
            type: "query",
            description: "Search CRM data",
          },
        ];

        for (const cmd of commands) {
          if (!query || cmd.name.toLowerCase().includes(lowerQuery)) {
            items.push(cmd);
          }
        }
      } else {
        // @ Mentions are ENTITIES
        // Add workflows first (available at both agency and subaccount level)
        const workflows = workflowsQuery.data?.items || [];
        for (const workflow of workflows) {
          if (!query || workflow.name.toLowerCase().includes(lowerQuery)) {
            items.push({
              id: workflow.id,
              name: workflow.name,
              type: "workflow",
              description: workflow.description || undefined,
            });
          }
        }

        // Add contacts (only in subaccount context)
        const contacts = contactsQuery.data?.items || [];
        for (const contact of contacts) {
          if (!query || contact.name.toLowerCase().includes(lowerQuery)) {
            items.push({
              id: contact.id,
              name: contact.name,
              type: "contact",
              description: contact.email || contact.companyName || undefined,
            });
          }
        }

        // Add deals (only in subaccount context)
        const deals = dealsQuery.data?.items || [];
        for (const deal of deals) {
          if (!query || deal.name.toLowerCase().includes(lowerQuery)) {
            items.push({
              id: deal.id,
              name: deal.name,
              type: "deal",
              description: deal.value ? `$${deal.value}` : undefined,
            });
          }
        }

        // Add pipelines (only in subaccount context)
        const pipelines = pipelinesQuery.data?.items || [];
        for (const pipeline of pipelines) {
          if (!query || pipeline.name.toLowerCase().includes(lowerQuery)) {
            items.push({
              id: pipeline.id,
              name: pipeline.name,
              type: "pipeline",
              description: `${pipeline.stages?.length || 0} stages`,
            });
          }
        }
      }

      return items.slice(0, 10);
    },
    [
      contactsQuery.data,
      dealsQuery.data,
      pipelinesQuery.data,
      workflowsQuery.data,
    ]
  );

  const handleSubmit = useCallback(
    async (content: string, html: string, entities: EntityReference[]) => {
      if (!content.trim() || isLoading) return;

      setPendingEntities(entities);

      // @ts-expect-error - append exists on useChat return value
      await chat.append(
        {
          role: "user",
          content,
        },
        {
          body: {
            subaccountId,
            entities,
            html,
          },
        }
      );

      editorRef.current?.clear();
      editorRef.current?.focus();
    },
    [chat, isLoading, subaccountId]
  );

  const handleClear = () => {
    setMessages([]);
  };

  // Convert useChat messages to our ChatMessage type
  const chatMessages: ChatMessageType[] = messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content as string,
    createdAt: msg.createdAt || new Date(),
  }));

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-sm font-medium text-white">AI Assistant</h2>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-white/50 hover:text-white text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Sparkles className="h-12 w-12 text-purple-400/50 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              CRM Assistant
            </h3>
            <p className="text-sm text-white/50 max-w-sm">
              Ask questions about your contacts, deals, pipelines, and
              workflows. Use @ to mention entities or / for quick commands.
            </p>
          </div>
        ) : (
          <div className="py-4">
            {chatMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userImage={userImage}
                userName={userName}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                </div>
                <div className="flex-1 bg-[#202e32] border border-white/10 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <div className="flex-1">
            <ChatEditor
              ref={editorRef}
              placeholder="Ask about contacts, deals, or use @ to mention..."
              onSubmit={handleSubmit}
              disabled={isLoading}
              fetchSuggestions={fetchSuggestions}
            />
          </div>
          <Button
            size="icon"
            onClick={() => {
              // Trigger submit from editor
              const event = new KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
              });
              document.querySelector(".ProseMirror")?.dispatchEvent(event);
            }}
            disabled={isLoading}
            className="h-10 w-10 bg-purple-500 hover:bg-purple-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-white/30 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
