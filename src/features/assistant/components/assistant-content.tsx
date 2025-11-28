"use client";

import { useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { ChatEditor, type ChatEditorHandle } from "@/components/ai/chat-editor";
import type { EntityReference, SuggestionItem } from "@/components/ai/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { IconSearchIntelligence as AISearchIcon } from "central-icons/IconSearchIntelligence";
import { IconChevronGrabberVertical as DropdownIcon } from "central-icons/IconChevronGrabberVertical";
import { IconRunShortcut as SlashIcon } from "central-icons/IconRunShortcut";
import { IconAt as AtIcon } from "central-icons/IconAt";
import { IconPaperPlane as SendIcon } from "central-icons/IconPaperPlane";

import {
  X,
  Users,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface EntitySelectorProps {
  label: string;
  icon: React.ReactNode;
  items:
    | Array<{ label: string; items: Array<{ id: string; name: string }> }>
    | Array<{ id: string; name: string }>;
  onSelect: (id: string, type: string) => void;
}

function EntitySelector({ label, icon, items, onSelect }: EntitySelectorProps) {
  const isNested = items.length > 0 && "label" in items[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary/60 hover:text-primary gap-2 border-none"
        >
          {label}
          <DropdownIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        {isNested
          ? (
              items as Array<{
                label: string;
                items: Array<{ id: string; name: string }>;
              }>
            ).map((category) => (
              <DropdownMenuSub key={category.label}>
                <DropdownMenuSubTrigger className="text-xs py-2 text-primary/60">
                  {category.label}
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="w-48 p-1">
                  {category.items.length > 0 ? (
                    category.items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() =>
                          onSelect(item.id, category.label.toLowerCase())
                        }
                        className="text-xs py-1.5 text-primary/60 hover:text-black"
                      >
                        {item.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem
                      disabled
                      className="text-xs text-primary/75"
                    >
                      No {category.label.toLowerCase()}s
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          : (items as Array<{ id: string; name: string }>).map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => onSelect(item.id, "client")}
                className="text-xs text-primary/60 hover:text-black"
              >
                {item.name}
              </DropdownMenuItem>
            ))}
        {items.length === 0 && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            No items available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AssistantContentProps {
  subaccountId?: string;
  logsLimit?: number;
  showAllLogs?: boolean;
}

export function AssistantContent({
  subaccountId,
  logsLimit = 3,
  showAllLogs = false,
}: AssistantContentProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const editorRef = useRef<ChatEditorHandle>(null);

  // Fetch logs from database
  const logsQuery = useQuery(
    trpc.ai.getLogs.queryOptions({ limit: showAllLogs ? 100 : logsLimit })
  );

  const deleteLogMutation = useMutation(
    trpc.ai.deleteLog.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.ai.getLogs.queryKey() });
      },
    })
  );

  const { sendMessage, status } = useChat({
    body: { subaccountId },
    onFinish: () => {
      // Refetch logs when AI finishes
      queryClient.invalidateQueries({ queryKey: trpc.ai.getLogs.queryKey() });
    },
  } as any);

  const isLoading = status === "streaming" || status === "submitted";
  const logs = logsQuery.data?.items || [];

  // Fetch suggestions for mentions and commands - refetch on window focus for fresh data
  const contactsQuery = useQuery({
    ...trpc.contacts.list.queryOptions({ limit: 100 }),
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider stale after 30 seconds
  });

  const dealsQuery = useQuery({
    ...trpc.deals.list.queryOptions({ limit: 100 }),
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const pipelinesQuery = useQuery({
    ...trpc.pipelines.list.queryOptions({ limit: 100 }),
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const workflowsQuery = useQuery({
    ...trpc.workflows.getMany.queryOptions({ pageSize: 100 }),
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Fetch clients (subaccounts) for the agency
  const clientsQuery = useQuery({
    ...trpc.organizations.getClients.queryOptions(),
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Get active organization info
  const activeOrgQuery = useQuery(trpc.organizations.getActive.queryOptions());

  // Fetch user's organizations to get the agency name
  const myOrgsQuery = useQuery({
    ...trpc.organizations.getMyOrganizations.queryOptions(),
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Mutation to switch active subaccount
  const setActiveSubaccountMutation = useMutation(
    trpc.organizations.setActiveSubaccount.mutationOptions({
      onSuccess: () => {
        // Invalidate queries that depend on subaccount context
        queryClient.invalidateQueries();
      },
    })
  );

  // Get current organization name
  const currentOrg = myOrgsQuery.data?.find(
    (org) => org.id === activeOrgQuery.data?.activeOrganizationId
  );
  const agencyName = currentOrg?.name || "Agency";

  // Build client items for selector
  const clientItems = [
    { id: "agency", name: agencyName },
    ...(clientsQuery.data || []).map((client) => ({
      id: client.subaccountId,
      name: client.name,
    })),
  ];

  // Get current selection label
  const currentClientLabel = activeOrgQuery.data?.activeSubaccountId
    ? clientsQuery.data?.find(
        (c) => c.subaccountId === activeOrgQuery.data?.activeSubaccountId
      )?.name || "Client"
    : agencyName;

  const handleClientSelect = (id: string) => {
    if (id === "agency") {
      setActiveSubaccountMutation.mutate({ subaccountId: null });
    } else {
      setActiveSubaccountMutation.mutate({ subaccountId: id });
    }
  };

  const fetchSuggestions = useCallback(
    async (
      query: string,
      type: "mention" | "command"
    ): Promise<SuggestionItem[]> => {
      const items: SuggestionItem[] = [];
      const lowerQuery = query.toLowerCase();

      if (type === "command") {
        const commands: SuggestionItem[] = [
          // Contacts
          {
            id: "create-contact",
            name: "create-contact",
            type: "action",
            category: "Contacts",
            description: "Create a new contact",
          },
          // Deals
          {
            id: "create-deal",
            name: "create-deal",
            type: "action",
            category: "Deals",
            description: "Create a new deal",
          },
          // Workflows
          {
            id: "run-workflow",
            name: "run-workflow",
            type: "action",
            category: "Workflows",
            description: "Run a workflow",
          },
          {
            id: "generate-workflow",
            name: "generate-workflow",
            type: "ai",
            category: "Workflows",
            description: "✨ AI: Generate a workflow",
          },
          // AI
          {
            id: "summarise",
            name: "summarise",
            type: "ai",
            category: "AI",
            description: "✨ Summarise content",
          },
          {
            id: "analyze",
            name: "analyze",
            type: "ai",
            category: "AI",
            description: "✨ Analyze data",
          },
          // Query
          {
            id: "search",
            name: "search",
            type: "query",
            category: "Query",
            description: "Search CRM data",
          },
        ];

        for (const cmd of commands) {
          if (!query || cmd.name.toLowerCase().includes(lowerQuery)) {
            items.push(cmd);
          }
        }
      } else {
        // @ Mentions - ENTITIES
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

        const deals = dealsQuery.data?.items || [];
        for (const deal of deals) {
          if (!query || deal.name.toLowerCase().includes(lowerQuery)) {
            const currencySymbol =
              deal.currency === "GBP"
                ? "£"
                : deal.currency === "EUR"
                ? "€"
                : "$";
            const formattedValue = deal.value
              ? deal.value.toLocaleString()
              : null;
            items.push({
              id: deal.id,
              name: deal.name,
              type: "deal",
              description: formattedValue
                ? `${currencySymbol}${formattedValue}`
                : undefined,
            });
          }
        }

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

      // Return all items - the grouped submenu UI will handle display
      return items;
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

      await (sendMessage as any)(
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
    [sendMessage, isLoading, subaccountId]
  );

  const removeLog = (logId: string) => {
    deleteLogMutation.mutate({ id: logId });
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-lg font-medium text-primary">Your AI assistant</h1>
        <p className="text-xs text-primary/60">
          Generate workflows, create deals, and search your CRM data with AI
        </p>
      </div>

      {/* Chat Input Section */}
      <div className="w-full max-w-3xl mx-auto">
        <ChatEditor
          ref={editorRef}
          placeholder="What do you wish to do today?"
          onSubmit={handleSubmit}
          disabled={isLoading}
          fetchSuggestions={fetchSuggestions}
          bottomBar={
            <div className="flex items-center justify-between px-2">
              {/* Left side - Entity selectors */}
              <div className="flex items-center gap-1">
                {/* Select client - for agency accounts */}
                <EntitySelector
                  label={currentClientLabel}
                  icon={<Users className="size-3" />}
                  items={clientItems}
                  onSelect={(id) => handleClientSelect(id)}
                />

                {/* Select entity triggers */}
                <EntitySelector
                  label="Select an entity"
                  icon={<ChevronDown className="size-3.5" />}
                  items={[
                    { label: "Workspace", items: [] },
                    { label: "Bundle", items: [] },
                    {
                      label: "Pipeline",
                      items: pipelinesQuery.data?.items || [],
                    },
                    { label: "Deal", items: dealsQuery.data?.items || [] },
                    {
                      label: "Contact",
                      items: contactsQuery.data?.items || [],
                    },
                  ]}
                  onSelect={() => {}}
                />
              </div>

              {/* Right side - Actions */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5! text-xs text-primary/60 hover:text-primary border-none"
                    onClick={() => {
                      editorRef.current?.focus();
                      document.execCommand("insertText", false, "/");
                    }}
                  >
                    <SlashIcon className="size-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5! text-xs text-primary/60 hover:text-primary border-none"
                    onClick={() => {
                      editorRef.current?.focus();
                      document.execCommand("insertText", false, "@");
                    }}
                  >
                    <AtIcon className="size-4" />
                  </Button>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const event = new KeyboardEvent("keydown", {
                      key: "Enter",
                      bubbles: true,
                    });
                    document
                      .querySelector(".ProseMirror")
                      ?.dispatchEvent(event);
                  }}
                  disabled={isLoading}
                  className="h-7 px-1.5! w-max rounded-sm bg-background border-none! text-primary/60 hover:text-primary"
                >
                  {isLoading ? (
                    <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          }
        />
      </div>

      {/* Logs Section */}
      <div className="w-full max-w-3xl mx-auto flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-primary">
              {showAllLogs ? "All logs" : "Recent logs"}
            </h2>
            <p className="text-xs text-primary/60">
              Your AI command history and status
            </p>
          </div>
          <div className="flex items-center gap-2">
            {logsQuery.isLoading && (
              <LoaderIcon className="h-4 w-4 animate-spin text-primary/40" />
            )}
            {!showAllLogs && logs.length > 0 && (
              <Link
                href="/logs"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-xs text-sky-500 hover:text-white font-medium border-none hover:bg-sky-500 py-1! h-max px-2"
                )}
              >
                View all
              </Link>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4">
              <Clock className="w-12 h-12 text-primary/20" />
            </div>
            <p className="text-sm font-medium text-primary/60 mb-1">
              No logs yet
            </p>
            <p className="text-xs text-primary/40 mb-4">
              Your AI command history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "bg-background border rounded-lg p-4",
                  log.status === "FAILED"
                    ? "border-red-500/20"
                    : "border-black/10 dark:border-white/5"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {log.status === "RUNNING" && (
                        <LoaderIcon className="h-3.5 w-3.5 animate-spin text-sky-500" />
                      )}
                      {log.status === "COMPLETED" && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {log.status === "FAILED" && (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {log.status === "PENDING" && (
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <h3 className="text-sm font-medium text-primary">
                        {log.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 max-w-[600px]">
                      {log.description && (
                        <p className="text-xs text-primary mt-1 ml-5.5">
                          {log.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded font-medium capitalize",
                        log.status === "RUNNING" &&
                          "bg-indigo-400 text-white dark:bg-blue-900/30 dark:text-indigo-400",
                        log.status === "COMPLETED" &&
                          "bg-teal-400 text-white dark:bg-emerald-900/30 dark:text-emerald-400",
                        log.status === "FAILED" &&
                          "bg-rose-400 text-white dark:bg-red-900/30 dark:text-red-400",
                        log.status === "PENDING" &&
                          "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                      )}
                    >
                      {log.status.toLowerCase()}
                    </span>
                    {/* <button
                      onClick={() => removeLog(log.id)}
                      className="text-primary/40 hover:text-primary"
                    >
                      <X className="h-4 w-4" />
                    </button> */}
                  </div>
                </div>

                {/* Error message for failed logs */}
                {log.status === "FAILED" && log.error && (
                  <div className="mt-2 pt-2 border-t border-red-500/10">
                    <p className="text-xs text-red-500 font-mono">
                      {log.error}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 mt-4 pt-3">
                  {/* User message preview */}
                  <div className="flex flex-col gap-0.5">
                    <div className=" flex items-center gap-2">
                      <AISearchIcon className="size-3.5 text-black" />
                      <p className="text-xs text-black">{log.userMessage}</p>
                    </div>

                    <p className="text-xs text-primary/60 ml-5.5">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                      {log.intent && ` • ${log.intent}`}
                    </p>
                  </div>

                  {/* URL link for query results */}
                  {log.status === "COMPLETED" &&
                    log.result &&
                    typeof log.result === "object" &&
                    "url" in log.result && (
                      <div className="">
                        <Link
                          href={(log.result as { url: string }).url}
                          className="inline-flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600 font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View results
                        </Link>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
