"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Smartphone,
  Search,
  Plus,
  CheckCheck,
  RotateCcw,
  Send,
  Inbox,
  X,
} from "lucide-react";
import { ConversationChannel, ConversationStatus } from "@/db/enums";
import type { InboxConversation, InboxMessage, Client } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InboxAssigneeSelect } from "@/features/inbox/components/inbox-assignee-select";
import { InboxEmailFields } from "@/features/inbox/components/inbox-email-fields";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationWithMeta = InboxConversation & {
  client: Pick<Client, "id" | "name" | "logo" | "email" | "phone"> | null;
  messages: Pick<InboxMessage, "content" | "direction" | "createdAt">[];
  assignee: AssigneeSummary;
};

type ConversationWithMessages = InboxConversation & {
  client: Pick<Client, "id" | "name" | "logo" | "email" | "phone"> | null;
  messages: InboxMessage[];
  assignee: AssigneeSummary;
};

type AssigneeSummary = {
  id: string;
  displayName: string;
  email: string | null;
} | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function channelIcon(channel: ConversationChannel): React.ElementType {
  switch (channel) {
    case ConversationChannel.EMAIL:
      return Mail;
    case ConversationChannel.SMS:
      return MessageSquare;
    case ConversationChannel.APP:
      return Smartphone;
  }
}

function channelLabel(channel: ConversationChannel) {
  switch (channel) {
    case ConversationChannel.EMAIL:
      return "Email";
    case ConversationChannel.SMS:
      return "SMS";
    case ConversationChannel.APP:
      return "App";
  }
}

function formatMsgTime(date: Date | string) {
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function clientInitials(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Channel badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: ConversationChannel }) {
  const Icon = channelIcon(channel);
  return (
    <span
      className={cn(
        "absolute -bottom-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full border border-background",
        channel === ConversationChannel.EMAIL &&
          "bg-indigo-100 text-indigo-600",
        channel === ConversationChannel.SMS &&
          "bg-emerald-100 text-emerald-600",
        channel === ConversationChannel.APP && "bg-sky-100 text-sky-600",
      )}
    >
      <Icon className="size-2.5" />
    </span>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: ConversationWithMeta;
  isActive: boolean;
  onClick: () => void;
}) {
  const lastMsg = conv.messages[0];
  const name = conv.client?.name ?? "Unknown";
  const preview = lastMsg?.content ?? "No messages yet";
  const time = conv.lastMessageAt
    ? formatMsgTime(conv.lastMessageAt)
    : formatMsgTime(conv.createdAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full px-3 py-2.5 text-left transition-colors",
        isActive ? "bg-accent" : "hover:bg-accent/60",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar + channel badge */}
        <div className="relative mt-0.5 shrink-0">
          <Avatar className="size-10">
            <AvatarImage src={conv.client?.logo ?? undefined} />
            <AvatarFallback
              className={cn(
                "bg-muted text-muted-foreground text-xs font-medium border",
                isActive && "bg-white text-black",
              )}
            >
              {clientInitials(conv.client?.name)}
            </AvatarFallback>
          </Avatar>
          <ChannelBadge channel={conv.channel} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "truncate text-xs",
                !conv.isRead ? "font-semibold" : "font-medium text-black/25",
              )}
            >
              {name}
            </span>

            <span className="shrink-0 text-[10px] text-muted-foreground/60">
              {time}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {!conv.isRead && (
              <span className="size-1.5 shrink-0 rounded-full bg-indigo-500" />
            )}
            <p className="truncate text-xs text-muted-foreground/70">
              {lastMsg?.direction === "OUTBOUND" ? "You: " : ""}
              {preview}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: InboxMessage }) {
  const isOutbound = msg.direction === "OUTBOUND";
  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isOutbound
            ? "rounded-br-sm bg-indigo-500 text-white"
            : "rounded-bl-sm bg-accent text-black/75 border",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            isOutbound ? "text-white/60" : "text-muted-foreground/50",
          )}
        >
          {format(new Date(msg.createdAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/50 border">
        <Inbox className="size-5 text-muted-black" />
      </div>
      <p className="text-[13px] font-medium text-black">{label}</p>
    </div>
  );
}

// ─── New conversation modal ───────────────────────────────────────────────────

function NewConversationPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<ConversationChannel>(
    ConversationChannel.EMAIL,
  );
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [senderAddressId, setSenderAddressId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    logo: string | null;
  } | null>(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);

  const { data: clientResults } = useQuery(
    trpc.inbox.searchClients.queryOptions(
      { search: clientSearch },
      { enabled: clientSearch.length >= 1 && !selectedClient },
    ),
  );

  const create = useMutation(
    trpc.inbox.createConversation.mutationOptions({
      onSuccess: (conv) => {
        qc.invalidateQueries({ queryKey: ["inbox"] });
        onCreated(conv.id);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const isEmail = channel === ConversationChannel.EMAIL;
  const emailReady =
    !isEmail ||
    Boolean(
      senderAddressId && subject.trim() && selectedClient?.email,
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-4.5 shrink-0">
        <h2 className="text-base font-semibold text-black">New conversation</h2>
      </div>

      <div className="flex flex-col overflow-y-auto p-4 space-y-4">
        {/* Recipient */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            To
          </label>
          {selectedClient ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/40 px-3 py-2">
              <Avatar className="size-5">
                <AvatarImage src={selectedClient.logo ?? undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                  {clientInitials(selectedClient.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {selectedClient.name ?? selectedClient.email ?? "Unknown"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {channel === ConversationChannel.EMAIL
                    ? (selectedClient.email ?? "No email address")
                    : channel === ConversationChannel.SMS
                      ? (selectedClient.phone ?? "No phone number")
                      : "In-app message"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(null);
                  setClientSearch("");
                }}
                className="shrink-0 text-muted-foreground hover:text-black transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/40 px-3 py-2">
                <Search className="size-3 shrink-0 text-muted-foreground/50" />
                <input
                  ref={clientInputRef}
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setIsClientDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (clientSearch.length >= 1)
                      setIsClientDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsClientDropdownOpen(false), 200);
                  }}
                  placeholder="Search members…"
                  className="min-w-0 flex-1 bg-transparent text-xs text-black placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </div>
              {isClientDropdownOpen &&
                clientResults &&
                clientResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                    {clientResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedClient(client);
                          setClientSearch("");
                          setIsClientDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors"
                      >
                        <Avatar className="size-6">
                          <AvatarImage src={client.logo ?? undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                            {clientInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {client.name ?? "Unknown"}
                          </p>
                          {client.email && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {client.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Channel */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Channel
          </label>
          <div className="flex gap-2">
            {(
              [
                ConversationChannel.EMAIL,
                ConversationChannel.SMS,
                ConversationChannel.APP,
              ] as ConversationChannel[]
            ).map((ch) => {
              const Icon = channelIcon(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors",
                    channel === ch
                      ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                      : "border-border bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="size-3" />
                  {channelLabel(ch)}
                </button>
              );
            })}
          </div>
        </div>

        {isEmail ? (
          <InboxEmailFields
            senderAddressId={senderAddressId}
            onSenderAddressChange={setSenderAddressId}
            subject={subject}
            onSubjectChange={setSubject}
          />
        ) : null}

        {isEmail && selectedClient && !selectedClient.email ? (
          <p className="text-[11px] text-destructive">
            This customer does not have an email address.
          </p>
        ) : null}

        {/* Message */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={6}
            className="resize-none min-h-[10rem]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 p-4">
        <Button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-black transition-colors"
        >
          Cancel
        </Button>

        <Button
          type="button"
          disabled={
            !message.trim() ||
            !selectedClient ||
            !emailReady ||
            create.isPending
          }
          onClick={() =>
            create.mutate({
              clientId: selectedClient?.id,
              channel,
              subject: isEmail ? subject.trim() : undefined,
              senderAddressId: isEmail ? senderAddressId : undefined,
              initialMessage: message.trim(),
            })
          }
          variant="success"
          className="w-max"
        >
          <Send className="size-3.5" />
          Send message
        </Button>
      </div>
    </div>
  );
}

// ─── Conversation detail ──────────────────────────────────────────────────────

function ConversationDetail({ id }: { id: string }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [senderAddressId, setSenderAddressId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedReadKey = useRef<string | null>(null);

  const { data: conv, isLoading } = useQuery(
    trpc.inbox.getConversation.queryOptions({ id }),
  );

  const send = useMutation(
    trpc.inbox.sendMessage.mutationOptions({
      onSuccess: () => {
        setReply("");
        qc.invalidateQueries({
          queryKey: trpc.inbox.getConversation.queryKey({ id }),
          exact: false,
        });
        qc.invalidateQueries({
          queryKey: trpc.inbox.listConversations.queryKey({}) as unknown[],
          exact: false,
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const setStatus = useMutation(
    trpc.inbox.setStatus.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: trpc.inbox.listConversations.queryKey({}) as unknown[],
          exact: false,
        });
        qc.invalidateQueries({
          queryKey: trpc.inbox.getConversation.queryKey({ id }),
          exact: false,
        });
      },
    }),
  );

  const markRead = useMutation(
    trpc.inbox.markRead.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: trpc.inbox.listConversations.queryKey(),
        });
        qc.invalidateQueries({ queryKey: trpc.inbox.unreadCount.queryKey() });
      },
    }),
  );

  useEffect(() => {
    if (!conv?.id) return;
    const readKey = `${conv.id}:${conv.lastMessageAt?.toISOString() ?? "empty"}`;
    if (markedReadKey.current === readKey) return;
    markedReadKey.current = readKey;
    markRead.mutate({
      conversationId: conv.id,
      lastReadMessageId: conv.messages.at(-1)?.id ?? null,
    });
  }, [conv?.id, conv?.lastMessageAt, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length]);

  const handleSend = () => {
    const content = reply.trim();
    if (
      !content ||
      send.isPending ||
      (conv?.channel === ConversationChannel.EMAIL && !senderAddressId)
    ) {
      return;
    }
    send.mutate({
      conversationId: id,
      content,
      senderAddressId:
        conv?.channel === ConversationChannel.EMAIL
          ? senderAddressId
          : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-indigo-500" />
      </div>
    );
  }

  if (!conv) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedConv = conv as unknown as ConversationWithMessages;
  const Icon = channelIcon(typedConv.channel);
  const isDone = typedConv.status === ConversationStatus.DONE;
  const preferredFromAddress = [...typedConv.messages]
    .reverse()
    .find(
      (message) =>
        message.direction === "OUTBOUND" && message.fromAddress,
    )?.fromAddress;

  return (
    <div className="flex h-full flex-col">
      {/* Detail header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="size-8">
              <AvatarImage src={typedConv.client?.logo ?? undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                {clientInitials(typedConv.client?.name)}
              </AvatarFallback>
            </Avatar>

            <ChannelBadge channel={typedConv.channel} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-black">
              {typedConv.client?.name ?? "Unknown"}
            </p>

            <p className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              {channelLabel(typedConv.channel)}
              {typedConv.client?.email && <> · {typedConv.client.email}</>}
            </p>
            {typedConv.channel === ConversationChannel.EMAIL &&
            typedConv.subject ? (
              <p className="truncate text-[11px] text-muted-foreground">
                Subject: {typedConv.subject}
              </p>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <InboxAssigneeSelect
            conversationId={id}
            assignee={typedConv.assignee}
          />
          {isDone ? (
            <button
              type="button"
              onClick={() =>
                setStatus.mutate({ id, status: ConversationStatus.OPEN })
              }
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-black"
            >
              <RotateCcw className="size-3" />
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setStatus.mutate({ id, status: ConversationStatus.DONE })
              }
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-black"
            >
              <CheckCheck className="size-3" />
              Mark done
            </button>
          )}
        </div>
      </div>

      {/* Done banner */}
      {isDone && (
        <div className="shrink-0 border-b border-emerald-700/10 bg-emerald-50 px-5 py-2 text-center text-[11px] font-medium text-emerald-700">
          This conversation is marked as done.
        </div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {typedConv.messages.length === 0 ? (
          <EmptyState label="No messages yet" />
        ) : (
          typedConv.messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="shrink-0 bg-background p-4">
        {typedConv.channel === ConversationChannel.EMAIL ? (
          <div className="mb-3">
            <InboxEmailFields
              senderAddressId={senderAddressId}
              onSenderAddressChange={setSenderAddressId}
              preferredFromAddress={preferredFromAddress}
            />
          </div>
        ) : null}
        <p className="mb-1.5 text-center text-[10px] text-muted-foreground/40">
          ⌘ + Enter to send
        </p>
        <div className="flex items-end gap-2 rounded-xl bg-background px-3 py-2.5">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply…"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            className="resize-none bg-transparent placeholder:text-muted-foreground/50 focus:outline-none"
            style={{ maxHeight: 120, overflowY: "auto" }}
          />

          <button
            type="button"
            disabled={
              !reply.trim() ||
              send.isPending ||
              (typedConv.channel === ConversationChannel.EMAIL &&
                !senderAddressId)
            }
            onClick={handleSend}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main inbox page ──────────────────────────────────────────────────────────

type FilterMode = "all" | "unread" | "done";
type AssignmentFilter = "ALL" | "MINE" | "UNASSIGNED";

export default function InboxPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [assignment, setAssignment] = useState<AssignmentFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const queryInput = {
    status:
      filter === "done"
        ? ConversationStatus.DONE
        : filter === "all" || filter === "unread"
          ? ConversationStatus.OPEN
          : undefined,
    unreadOnly: filter === "unread",
    search: search.trim() || undefined,
    assignment,
  };

  const { data, isLoading } = useQuery(
    trpc.inbox.listConversations.queryOptions(queryInput),
  );

  const conversations =
    (data?.conversations as ConversationWithMeta[] | undefined) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        {/* ── Left sidebar ── */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-background">
          {/* Search + new conversation */}
          <div className="shrink-0 p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-accent/40 px-3 py-2">
                <Search className="size-3.5 shrink-0 text-muted-foreground/50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-black placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNew(true);
                  setSelectedId(null);
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-black"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="shrink-0 border-b border-border px-3 py-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterMode)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1">
                  Unread
                </TabsTrigger>
                <TabsTrigger value="done" className="flex-1">
                  Done
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={assignment}
              onValueChange={(value) =>
                setAssignment(value as AssignmentFilter)
              }
            >
              <SelectTrigger
                className="mt-2 h-8 w-full text-xs"
                aria-label="Assignment filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All assignments</SelectItem>
                <SelectItem value="MINE">Assigned to me</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-4 animate-spin rounded-full border-2 border-border border-t-indigo-500" />
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState label="No conversations" />
            ) : (
              <div className="divide-y divide-border/50">
                {conversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={selectedId === conv.id && !showNew}
                    onClick={() => {
                      setSelectedId(conv.id);
                      setShowNew(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Right pane ── */}
        <main className="min-h-0 flex-1 bg-accent/10">
          {showNew ? (
            <NewConversationPanel
              onClose={() => setShowNew(false)}
              onCreated={(id) => {
                setSelectedId(id);
                setShowNew(false);
              }}
            />
          ) : selectedId ? (
            <ConversationDetail key={selectedId} id={selectedId} />
          ) : (
            <EmptyState label="Select a conversation to get started" />
          )}
        </main>
      </div>
    </div>
  );
}
