"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox, LoaderCircle, Mail, MessageSquare, Smartphone } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { MemberInboxThread } from "./member-inbox-thread";

const channelIcons = {
  EMAIL: Mail,
  SMS: MessageSquare,
  APP: Smartphone,
} as const;

export function MemberInboxView({ clientId }: { clientId: string }) {
  const trpc = useTRPC();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const conversationsQuery = useQuery(
    trpc.inbox.listConversations.queryOptions({
      clientId,
      assignment: "ALL",
    }),
  );
  const conversations = conversationsQuery.data?.conversations ?? [];
  const activeId = selectedId ?? conversations[0]?.id ?? null;

  if (conversationsQuery.isLoading) {
    return <LoadingState label="Loading conversations..." />;
  }

  if (!conversations.length) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 border-y border-black/5 text-center text-xs text-primary/50 dark:border-white/5">
        <Inbox className="size-5" />
        No inbox conversations with this client.
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[16rem_minmax(0,1fr)] border-y border-black/5 dark:border-white/5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-1">
      <aside className="flex min-h-0 flex-col border-b border-black/5 dark:border-white/5 lg:border-b-0 lg:border-r">
        <div className="border-b border-black/5 px-4 py-3 dark:border-white/5">
          <p className="text-xs font-medium text-primary">Client conversations</p>
          <p className="text-[11px] text-primary/50">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => {
            const Icon = channelIcons[conversation.channel];
            const latestMessage = conversation.messages[0];
            return (
              <Button
                key={conversation.id}
                type="button"
                variant="ghost"
                onClick={() => setSelectedId(conversation.id)}
                className={cn(
                  "mb-1 h-auto w-full justify-start gap-3 rounded-lg px-3 py-3 text-left",
                  activeId === conversation.id && "bg-primary-foreground",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-primary">
                      {conversation.subject ?? conversation.channel}
                    </span>
                    {!conversation.isRead ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-sky-500" />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-normal text-primary/50">
                    {latestMessage?.content ?? "No messages yet"}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </aside>
      <MemberInboxThread conversationId={activeId} />
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-48 flex-1 items-center justify-center gap-2 text-xs text-primary/50">
      <LoaderCircle className="size-3.5 animate-spin" /> {label}
    </div>
  );
}
