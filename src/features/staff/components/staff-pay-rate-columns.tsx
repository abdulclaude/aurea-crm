"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import type { StaffRow } from "@/features/staff/types";
import { useTRPC } from "@/trpc/client";

import { EditStaffDialog } from "./edit-staff-dialog";
import { StaffEmploymentTypeBadge, StaffRoleBadge } from "./staff-badges";

export const STAFF_PAY_RATE_COLUMN_ORDER = [
  "name",
  "role",
  "staffType",
  "hourlyRate",
  "status",
  "actions",
];

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRate(rate: string | null, currency: string | null): string {
  if (!rate) return "Not set";
  try {
    return `${new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "GBP",
    }).format(Number(rate))} / hour`;
  } catch {
    return `${currency ?? "GBP"} ${rate} / hour`;
  }
}

function EditRateCell({ staff }: { staff: StaffRow }): React.JSX.Element {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        title="Edit pay rate"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
        <span className="sr-only">Edit pay rate for {staff.name}</span>
      </Button>
      <EditStaffDialog
        staff={staff}
        open={open}
        onOpenChange={setOpen}
        onSuccess={async () => {
          await queryClient.invalidateQueries({
            queryKey: trpc.staff.list.queryKey(),
          });
          setOpen(false);
        }}
      />
    </>
  );
}

export const staffPayRateColumns: ColumnDef<StaffRow>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Team member",
    meta: { label: "Team member" },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-8 rounded-full bg-slate-100">
          <AvatarImage
            src={row.original.profilePhoto ?? undefined}
            alt={row.original.name}
          />
          <AvatarFallback className="rounded-full border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
            {initialsFor(row.original.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-primary">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    meta: { label: "Role" },
    cell: ({ row }) => <StaffRoleBadge role={row.original.role} />,
  },
  {
    id: "staffType",
    accessorKey: "employmentType",
    header: "Staff type",
    meta: { label: "Staff type" },
    cell: ({ row }) => (
      <StaffEmploymentTypeBadge employmentType={row.original.employmentType} />
    ),
  },
  {
    id: "hourlyRate",
    accessorKey: "hourlyRate",
    header: "Pay rate",
    meta: { label: "Pay rate" },
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-primary/70">
        {formatRate(row.original.hourlyRate, row.original.currency)}
      </span>
    ),
  },
  {
    id: "status",
    accessorKey: "isActive",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <TableBadge
        color={
          row.original.isActive
            ? TABLE_BADGE_COLORS.teal
            : TABLE_BADGE_COLORS.slate
        }
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </TableBadge>
    ),
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => <EditRateCell staff={row.original} />,
  },
];
