"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import * as React from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Deal = RouterOutput["deals"]["list"]["items"][number];

type PipelineKanbanViewProps = {
  pipelineId: string;
};

export function PipelineKanbanView({ pipelineId }: PipelineKanbanViewProps) {
  const trpc = useTRPC();

  const { data: pipeline } = useSuspenseQuery(
    trpc.pipelines.getById.queryOptions({ id: pipelineId })
  );

  const { data: deals, refetch } = useSuspenseQuery(
    trpc.deals.list.queryOptions({ pipelineId })
  );

  const updateDeal = useMutation(
    trpc.deals.update.mutationOptions({
      onSuccess: async () => {
        await refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to move deal");
      },
    })
  );

  // Transform pipeline stages into kanban columns
  const columns = React.useMemo(
    () =>
      pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color || "#ffffff",
        probability: stage.probability,
      })),
    [pipeline.stages]
  );

  // Transform deals into kanban items
  type KanbanItem = {
    id: string;
    name: string;
    column: string;
    value: Deal["value"];
    currency: Deal["currency"];
    deadline: Deal["deadline"];
    contacts: Deal["contacts"];
    members: Deal["members"];
  };

  const kanbanData = React.useMemo<KanbanItem[]>(
    () =>
      deals.items.map((deal) => ({
        id: deal.id,
        name: deal.name,
        column: deal.pipelineStageId || "",
        value: deal.value,
        currency: deal.currency,
        deadline: deal.deadline,
        contacts: deal.contacts,
        members: deal.members,
      })),
    [deals.items]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const dealId = active.id as string;
    const deal = deals.items.find((d) => d.id === dealId);
    if (!deal) return;

    // Determine target column: either the column dropped into, or another card's column
    const overDeal = deals.items.find((d) => d.id === over.id);
    const targetStageId = overDeal?.pipelineStageId || (over.id as string);

    // Only update if the stage actually changed
    if (deal.pipelineStageId !== targetStageId) {
      const targetStage = pipeline.stages.find((s) => s.id === targetStageId);

      updateDeal.mutate(
        {
          id: dealId,
          pipelineStageId: targetStageId,
        },
        {
          onSuccess: () => {
            toast.success(
              `${deal.name} moved to ${targetStage?.name || "new stage"}`
            );
          },
        }
      );
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-x-auto">
        <KanbanProvider
          columns={columns}
          data={kanbanData}
          onDragEnd={handleDragEnd}
        >
          {(column) => (
            <KanbanBoard id={column.id}>
              <KanbanHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-medium text-xs">{column.name}</span>

                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-[#202e32] brightness-140 rounded-full p-0 px-1 text-white/50"
                    >
                      {kanbanData.filter((d) => d.column === column.id).length}
                    </Badge>
                  </div>
                  <span className="text-xs text-white/50">
                    {column.probability}%
                  </span>
                </div>
              </KanbanHeader>

              <KanbanCards id={column.id}>
                {(item: any) => (
                  <KanbanCard
                    {...item}
                    className="bg-[#202e32] brightness-140 rounded-sm border-white/5"
                  >
                    <div className="space-y-2">
                      {/* Deal Name and Value */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-white line-clamp-2">
                          {item.name}
                        </h4>
                        {item.value && (
                          <p className="text-xs font-medium text-emerald-500">
                            {new Intl.NumberFormat("en", {
                              style: "currency",
                              currency: item.currency ?? "USD",
                              maximumFractionDigits: 0,
                            }).format(Number(item.value))}
                          </p>
                        )}
                      </div>

                      {/* Contacts */}
                      {item.contacts && item.contacts.length > 0 && (
                        <div className="flex items-center gap-2">
                          {item.contacts.length > 1 ? (
                            <div className="flex -space-x-2">
                              {item.contacts.slice(0, 2).map((contact: any) => (
                                <Avatar key={contact.id} className="size7">
                                  <AvatarFallback className="bg-[#202e32] brightness-120 text-[10px] text-white">
                                    {(contact.name?.[0] ?? "C").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              {item.contacts.slice(0, 2).map((contact: any) => (
                                <div key={contact.id} className="flex items-center gap-2">
                                  <Avatar className="size-7.5">
                                    <AvatarFallback className="bg-[#202e32] brightness-120 text-white text-[10px]">
                                      {(contact.name?.[0] ?? "C").toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex flex-col text-[10px] text-white">
                                    <p className="text-xs"> {contact.name} </p>
                                    <p className="text-white/40">
                                      {" "}
                                      {contact.email}{" "}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {item.contacts.length > 2 && (
                            <span className="text-[10px] text-white/50">
                              +{item.contacts.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: Deadline and Members */}
                      <div className="flex items-center justify-between pt-4">
                        {item.deadline ? (
                          <span className="text-[10px] text-white/50">
                            Due {format(new Date(item.deadline), "MMM d")}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40">
                            No deadline set
                          </span>
                        )}

                        {item.members && item.members.length > 0 && (
                          <div className="flex -space-x-2">
                            {item.members.slice(0, 3).map((member: any) => (
                              <Tooltip key={member.id}>
                                <TooltipTrigger asChild>
                                  <Avatar className="size-5 cursor-pointer">
                                    {member.image ? (
                                      <AvatarImage
                                        src={member.image}
                                        alt={member.name}
                                      />
                                    ) : (
                                      <AvatarFallback className="bg-[#202e32] brightness-120 text-white text-[10px]">
                                        {(
                                          member.name?.[0] ?? "U"
                                        ).toUpperCase()}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-[#202e32] border-white/10"
                                >
                                  <p className="text-xs text-white">
                                    {member.name}
                                  </p>
                                  {member.email && (
                                    <p className="text-[10px] text-white/50">
                                      {member.email}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </KanbanCard>
                )}
              </KanbanCards>
            </KanbanBoard>
          )}
        </KanbanProvider>
      </div>
    </TooltipProvider>
  );
}
