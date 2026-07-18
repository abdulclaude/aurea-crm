"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { LoaderCircle, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { MemberStatusBadge } from "./member-status-badge";

export function MemberInboxThread({
  conversationId,
}: {
  conversationId: string | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [reply, setReply] = React.useState("");
  const conversationQuery = useQuery({
    ...trpc.inbox.getConversation.queryOptions({ id: conversationId ?? "" }),
    enabled: Boolean(conversationId),
  });
  const sendMessage = useMutation(
    trpc.inbox.sendMessage.mutationOptions({
      onSuccess: async () => {
        setReply("");
        if (conversationId) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: trpc.inbox.getConversation.queryKey({ id: conversationId }),
            }),
            queryClient.invalidateQueries({
              queryKey: trpc.inbox.listConversations.queryKey(),
            }),
          ]);
        }
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (conversationQuery.isLoading || !conversationQuery.data) {
    return (
      <div className="flex h-full min-h-48 flex-1 items-center justify-center gap-2 text-xs text-primary/50">
        <LoaderCircle className="size-3.5 animate-spin" /> Loading messages...
      </div>
    );
  }

  const conversation = conversationQuery.data;
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 px-5 py-3 dark:border-white/5">
        <div>
          <p className="text-xs font-medium text-primary">
            {conversation.subject ?? `${conversation.channel} conversation`}
          </p>
          <p className="text-[11px] text-primary/50">
            Updated {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {conversation.channel}
          </Badge>
          <MemberStatusBadge status={conversation.status} />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-primary-foreground/20 p-5">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.direction === "OUTBOUND" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-xl px-3.5 py-2.5 text-xs",
                message.direction === "OUTBOUND"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm border border-black/5 bg-background text-primary dark:border-white/5",
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="mt-1 text-right text-[9px] opacity-60">
                {format(new Date(message.createdAt), "d MMM, HH:mm")}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-end gap-2 border-t border-black/5 p-4 dark:border-white/5">
        <Textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Write a reply..."
          className="min-h-20 resize-none text-xs"
        />
        <Button
          size="icon"
          disabled={!reply.trim() || sendMessage.isPending}
          onClick={() => {
            if (conversationId && reply.trim()) {
              sendMessage.mutate({
                conversationId,
                content: reply.trim(),
              });
            }
          }}
        >
          {sendMessage.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
        </Button>
      </div>
    </section>
  );
}
