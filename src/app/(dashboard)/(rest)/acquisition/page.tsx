"use client";

import { useState, useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { PageTabs } from "@/components/ui/page-tabs";
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/shadcn-io/kanban";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import { AcquisitionToolbar } from "@/features/acquisition/components/acquisition-toolbar";
import { cn } from "@/lib/utils";

const acquisitionStages = ["INQUIRY", "TRIAL", "ACTIVE", "LOST"] as const;
type AcquisitionStage = (typeof acquisitionStages)[number];

const ALL_COLUMNS = [
  { id: "INQUIRY", name: "Inquiry", color: "#6366f1" },
  { id: "TRIAL", name: "Trial", color: "#f59e0b" },
  { id: "ACTIVE", name: "Active", color: "#10b981" },
  { id: "LOST", name: "Lost", color: "#ef4444" },
];

const stageLabels = new Map(
  ALL_COLUMNS.map((column) => [column.id, column.name]),
);
const stageColors = new Map(
  ALL_COLUMNS.map((column) => [column.id, column.color]),
);
const stageBadgeColors: Record<string, string> = {
  INQUIRY: "text-indigo-600 ring-indigo-300 bg-indigo-100 dark:border-indigo-800",
  TRIAL: "text-amber-600 ring-amber-300 bg-amber-100 dark:border-amber-800",
  ACTIVE: "text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800",
  LOST: "text-rose-600 ring-rose-300 bg-rose-100 dark:border-rose-800",
};

type KanbanItem = {
  id: string;
  name: string;
  column: string;
  email: string | null;
  phone: string | null;
  updatedAt: string;
};

const tableColumns: ColumnDef<KanbanItem>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name" },
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary">
        {row.original.name}
      </span>
    ),
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    meta: { label: "Email" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/60">
        {row.original.email ?? "—"}
      </span>
    ),
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    meta: { label: "Phone" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/60">
        {row.original.phone ?? "—"}
      </span>
    ),
  },
  {
    id: "stage",
    accessorKey: "column",
    header: "Stage",
    meta: { label: "Stage" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "w-fit text-[11px] capitalize",
          stageBadgeColors[row.original.column] ??
            "text-gray-600 ring-gray-300 bg-gray-100 dark:border-gray-700",
        )}
      >
        {stageLabels.get(row.original.column) ?? row.original.column}
      </Badge>
    ),
  },
  {
    id: "updatedAt",
    accessorFn: (row) => new Date(row.updatedAt).getTime(),
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/50">
        {format(new Date(row.original.updatedAt), "MMM d, yyyy")}
      </span>
    ),
  },
];

function buildKanbanData(
  stages: {
    stage: string;
    clients: {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      updatedAt: Date | string;
    }[];
  }[],
): KanbanItem[] {
  return stages.flatMap((stage) =>
    stage.clients.map((client) => ({
      id: client.id,
      name: client.name,
      column: stage.stage,
      email: client.email ?? null,
      phone: client.phone ?? null,
      updatedAt: String(client.updatedAt),
    })),
  );
}

export default function AcquisitionPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(trpc.acquisition.dashboard.queryOptions());

  const [localData, setLocalData] = useState<KanbanItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [sortValue, setSortValue] = useState("updatedAt.desc");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("table");

  const rawKanbanData = localData ?? buildKanbanData(data.stages);

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((col) => !hiddenColumns.includes(col.id)),
    [hiddenColumns],
  );

  const displayData = useMemo(() => {
    let result = [...rawKanbanData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q),
      );
    }

    if (selectedStages.length > 0) {
      result = result.filter((item) => selectedStages.includes(item.column));
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [rawKanbanData, search, selectedStages, sortValue]);

  const updateStage = useMutation(
    trpc.acquisition.updateStage.mutationOptions({
      onSuccess: async () => {
        setLocalData(null);
        await queryClient.invalidateQueries();
      },
      onError: (err) => {
        setLocalData(null);
        toast.error(err.message);
      },
    }),
  );

  const handleDataChange = (newData: KanbanItem[]) => {
    setLocalData(newData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const clientId = active.id as string;
    const currentData = localData ?? rawKanbanData;
    const client = currentData.find((c) => c.id === clientId);
    if (!client) return;

    const overClient = currentData.find((c) => c.id === over.id);
    const targetStage = (overClient?.column ??
      (over.id as string)) as AcquisitionStage;

    if (client.column !== targetStage) {
      updateStage.mutate({ clientId, stage: targetStage });
    }
  };

  const getColumnCount = (columnId: string) =>
    displayData.filter((item) => item.column === columnId).length;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-end justify-between gap-4 px-6 py-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Member acquisition
          </h1>
          <p className="text-xs text-primary/70">
            Track the inquiry to trial to active member journey.
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={[
          { id: "table", label: "Data table" },
          { id: "kanban", label: "Kanban" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      <Separator className="bg-black/5 dark:bg-white/5" />

      <AcquisitionToolbar
        search={search}
        onSearchChange={setSearch}
        sortValue={sortValue}
        onSortChange={setSortValue}
        selectedStages={selectedStages}
        onStagesChange={setSelectedStages}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={setHiddenColumns}
      />

      {activeTab === "table" ? (
        <DataTable
          columns={tableColumns}
          data={displayData}
          getRowId={(row) => row.id}
          enableGlobalSearch={false}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-primary/50">
                No acquisition records found.
              </p>
            </div>
          }
        />
      ) : (
        <div className="flex-1 overflow-x-auto border-l border-b border-black/5 dark:border-white/5">
          <KanbanProvider
            columns={visibleColumns}
            data={displayData}
            onDataChange={handleDataChange}
            onDragEnd={handleDragEnd}
          >
            {(column) => (
              <KanbanBoard
                key={column.id}
                id={column.id}
                className="border-0 border-r border-black/5 dark:border-white/5 divide-black/5 dark:divide-white/5 bg-primary-foreground/30 dark:bg-[#202e32] text-primary shadow-none rounded-none"
              >
                <KanbanHeader className="text-primary px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-medium text-xs">{column.name}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-black/5 dark:bg-white/5 rounded-full px-1.5 py-0 text-primary/70"
                    >
                      {getColumnCount(column.id)}
                    </Badge>
                  </div>
                </KanbanHeader>

                <KanbanCards id={column.id} className="p-3 gap-2">
                  {(item: KanbanItem) => (
                    <KanbanCard
                      key={item.id}
                      {...item}
                      className="rounded-lg border border-black/5 dark:border-white/[0.08] bg-background dark:bg-[#1e2b30] p-3.5 shadow-sm cursor-grab space-y-1.5"
                    >
                      <p className="text-xs font-medium text-primary truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-primary/55 truncate">
                        {item.email ?? item.phone ?? "No client details"}
                      </p>
                      <p className="text-[10px] text-primary/40">
                        Updated{" "}
                        {format(new Date(item.updatedAt), "MMM d, yyyy")}
                      </p>
                    </KanbanCard>
                  )}
                </KanbanCards>
              </KanbanBoard>
            )}
          </KanbanProvider>
        </div>
      )}
    </div>
  );
}
