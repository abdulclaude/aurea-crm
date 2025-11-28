"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { Eye, MoreHorizontal, Pencil, Trash } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DealRow = RouterOutput["deals"]["list"]["items"][number];

type PipelineListViewProps = {
  pipelineId: string;
};

const columns: ColumnDef<DealRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Deal name",
    meta: { label: "Deal name" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-white">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    id: "stage",
    header: "Stage",
    meta: { label: "Stage" },
    cell: ({ row }) => {
      const stage = row.original.pipelineStage;
      if (!stage) {
        return <span className="text-xs text-white/40">No stage</span>;
      }
      return (
        <Badge
          className="text-[11px]"
          style={{
            backgroundColor: stage.color
              ? `${stage.color}20`
              : "rgba(255, 255, 255, 0.1)",
            color: stage.color || "rgba(255, 255, 255, 0.7)",
          }}
        >
          {stage.name}
        </Badge>
      );
    },
  },
  {
    id: "contacts",
    header: "Contacts",
    meta: { label: "Contacts" },
    cell: ({ row }) => {
      const contacts = row.original.contacts;
      if (contacts.length === 0) {
        return <span className="text-xs text-white/40">No contacts</span>;
      }
      return (
        <div className="flex flex-col gap-1">
          {contacts.slice(0, 2).map((contact: (typeof contacts)[number]) => (
            <div key={contact.id} className="flex items-center gap-2">
              <Avatar className="size-6 border border-white/5">
                <AvatarFallback className="bg-[#1f2a2f] text-[10px]">
                  {(contact.name?.[0] ?? "C").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs text-white">
                  {contact.name ?? "Unknown"}
                </p>
                <p className="truncate text-[10px] text-white/50">
                  {contact.email ?? "No email"}
                </p>
              </div>
            </div>
          ))}
          {contacts.length > 2 && (
            <span className="text-[11px] text-white/50">
              +{contacts.length - 2} more contact(s)
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "members",
    header: "Members assigned",
    meta: { label: "Members assigned" },
    cell: ({ row }) => {
      const members = row.original.members;
      if (members.length === 0) {
        return <span className="text-xs text-white/40">Unassigned</span>;
      }
      return (
        <div className="flex -space-x-2">
          {members.slice(0, 3).map((member: (typeof members)[number]) => (
            <Avatar
              key={member.id}
              className="size-7 border border-[#1a2326]"
              title={member.name ?? "Unknown"}
            >
              {member.image ? (
                <AvatarImage src={member.image} alt={member.name ?? ""} />
              ) : (
                <AvatarFallback className="bg-[#1f2a2f] text-[11px]">
                  {(member.name?.[0] ?? "U").toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          ))}
          {members.length > 3 ? (
            <Avatar className="size-7 border border-[#1a2326] bg-[#1f2a2f] text-[11px]">
              +{members.length - 3}
            </Avatar>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "value",
    accessorKey: "value",
    header: "Value",
    meta: { label: "Value" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-white">
        {row.original.value
          ? new Intl.NumberFormat("en", {
              style: "currency",
              currency: row.original.currency ?? "USD",
              maximumFractionDigits: 0,
            }).format(Number(row.original.value))
          : "—"}
      </span>
    ),
  },
  {
    id: "probability",
    header: "Probability",
    meta: { label: "Probability" },
    cell: ({ row }) => (
      <span className="text-xs text-white/70">
        {row.original.pipelineStage?.probability ?? 0}%
      </span>
    ),
  },
  {
    id: "deadline",
    accessorKey: "deadline",
    header: "Deadline",
    meta: { label: "Deadline" },
    cell: ({ row }) => (
      <span className="text-xs text-white/60">
        {row.original.deadline
          ? format(new Date(row.original.deadline), "MMM d, yyyy")
          : "—"}
      </span>
    ),
  },
  {
    id: "updatedAt",
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-white/60">
        {format(new Date(row.original.updatedAt), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="size-8 p-0 hover:bg-[#202e32] hover:brightness-130 hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#202e32] border-white/5"
          >
            <DropdownMenuLabel className="text-xs text-white/50">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              className="text-xs text-white hover:bg-white/5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleSelected(true);
              }}
            >
              <Eye className="mr-2 size-3.5" />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-white hover:bg-white/5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Edit action
              }}
            >
              <Pencil className="mr-2 size-3.5" />
              Edit deal
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Delete action
              }}
            >
              <Trash className="mr-2 size-3.5" />
              Delete deal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

export function PipelineListView({ pipelineId }: PipelineListViewProps) {
  const trpc = useTRPC();
  const [rowSelection, setRowSelection] = React.useState({});

  const { data } = useSuspenseQuery(
    trpc.deals.list.queryOptions({ pipelineId })
  );

  return (
    <div className="">
      <DataTable
        data={data.items}
        columns={columns}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-white/50 leading-4.5">
            No deals in this pipeline yet. <br /> Start by creating a deal.
          </div>
        }
      />
    </div>
  );
}
