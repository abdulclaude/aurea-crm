"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { Box, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetHeader,
  SheetDescription,
  SheetTitle,
  ResizableSheetContent,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { RoomsToolbar } from "./rooms-toolbar";
import { RoomVisualizer } from "./room-visualizer";

type RouterOutput = inferRouterOutputs<AppRouter>;
type RoomRow = RouterOutput["rooms"]["list"][number];

const DEFAULT_SORT = "name.asc";
const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_KEY = "rooms-table.column-order";

function buildColumns(
  onEdit: (row: RoomRow) => void,
  onDelete: (id: string) => void,
  onVisualize: (row: RoomRow) => void,
): ColumnDef<RoomRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Room",
      meta: { label: "Room" },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary truncate">
            {row.original.name}
          </p>
          {row.original.description && (
            <p className="text-[11px] text-primary/50 truncate">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "capacity",
      accessorFn: (row) => row.capacity,
      header: "Capacity",
      meta: { label: "Capacity" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs text-primary/60 flex items-center gap-1 whitespace-nowrap">
          {row.original.capacity ? <>{row.original.capacity} max</> : "—"}
        </span>
      ),
    },
    {
      id: "classes",
      accessorFn: (row) => row._count.studioClass,
      header: "Classes",
      meta: { label: "Classes" },
      enableSorting: true,
      cell: ({ row }) => (
        <Link
          href={`/studio/classes?room=${row.original.id}`}
          className="text-xs text-primary/60 underline-offset-2 hover:text-primary hover:underline"
        >
          {row.original._count.studioClass}
        </Link>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      meta: { label: "Actions" },
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary/40 hover:text-emerald-500"
            onClick={() =>
              window.open(`/test/spot-booking/${row.original.id}`, "_blank")
            }
            title="View spots"
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary/40 hover:text-violet-500"
            onClick={() => onVisualize(row.original)}
            title="3D view"
          >
            <Box className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary/40 hover:text-primary"
            onClick={() => onEdit(row.original)}
            title="Edit room"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary/40 hover:text-destructive"
            onClick={() => onDelete(row.original.id)}
            title="Delete room"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

export function RoomsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const [editingRow, setEditingRow] = React.useState<RoomRow | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCapacity, setEditCapacity] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [visualizingRow, setVisualizingRow] = React.useState<RoomRow | null>(
    null,
  );

  const { data: rooms, isFetching } = useSuspenseQuery(
    trpc.rooms.list.queryOptions(),
  );

  const updateMutation = useMutation(trpc.rooms.update.mutationOptions());
  const deleteMutation = useMutation(trpc.rooms.delete.mutationOptions());

  function invalidate() {
    queryClient.invalidateQueries(trpc.rooms.list.queryOptions());
  }

  function handleEdit(row: RoomRow) {
    setEditingRow(row);
    setEditName(row.name);
    setEditCapacity(row.capacity?.toString() ?? "");
    setEditDescription(row.description ?? "");
  }

  function handleSaveEdit() {
    if (!editingRow) return;
    updateMutation.mutate(
      {
        id: editingRow.id,
        name: editName,
        capacity: editCapacity ? parseInt(editCapacity) : null,
        description: editDescription || null,
      },
      {
        onSuccess: () => {
          toast.success("Room updated");
          invalidate();
          setEditingRow(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Room deleted");
          invalidate();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const columns = React.useMemo(
    () => buildColumns(handleEdit, handleDelete, setVisualizingRow),
    [],
  );

  const COLUMN_IDS = React.useMemo(
    () => columns.map((col, i) => (col.id ?? `col-${i}`) as string),
    [columns],
  );

  React.useEffect(() => {
    setColumnOrder(COLUMN_IDS);
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setColumnOrder(parsed);
    } catch {}
  }, []);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
  }, []);

  const handleColumnOrderChange = React.useCallback(
    (order: ColumnOrderState) => {
      setColumnOrder(order);
      persistColumnOrder(order);
    },
    [persistColumnOrder],
  );

  const filtered = React.useMemo(() => {
    let result = [...rooms];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => row.name.toLowerCase().includes(q));
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "capacity") cmp = (a.capacity ?? 0) - (b.capacity ?? 0);
      else if (col === "classes")
        cmp = a._count.studioClass - b._count.studioClass;
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [rooms, search, sortValue]);

  const columnOrderOrDefault =
    columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  return (
    <>
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(updater) =>
          setColumnVisibility(
            typeof updater === "function"
              ? (updater as (s: VisibilityState) => VisibilityState)(
                  columnVisibility,
                )
              : updater,
          )
        }
        columnOrder={columnOrderOrDefault}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={COLUMN_IDS}
        enableGlobalSearch={false}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-primary">No rooms yet</p>
            <p className="text-xs text-primary/55 mt-1">
              Create your first room to start scheduling classes.
            </p>
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <RoomsToolbar
              search={search}
              onSearchChange={setSearch}
              sortValue={sortValue}
              onSortChange={setSortValue}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrderOrDefault}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={COLUMN_IDS}
            />
          ),
        }}
      />

      <Sheet
        open={!!visualizingRow}
        onOpenChange={(open) => !open && setVisualizingRow(null)}
      >
        <ResizableSheetContent
          side="right"
          defaultSize={1180}
          minSize={860}
          maxSize={1500}
          className="p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
            <SheetTitle className="text-sm">
              {visualizingRow?.name}
              {visualizingRow?.capacity
                ? ` — ${visualizingRow.capacity} capacity`
                : ""}
            </SheetTitle>
            <SheetDescription>
              Configure the studio model, equipment, spacing, and saved spot
              layout.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            {visualizingRow && (
              <RoomVisualizer
                roomId={visualizingRow.id}
                name={visualizingRow.name}
                capacity={visualizingRow.capacity}
                className="w-full h-full"
              />
            )}
          </div>
          {visualizingRow?.description && (
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5">
              <p className="text-xs text-primary/60">
                {visualizingRow.description}
              </p>
            </div>
          )}
        </ResizableSheetContent>
      </Sheet>

      <Dialog
        open={!!editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div className="space-y-3">
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingRow(null)}>
              Cancel
            </Button>

            <Button
              variant="outline"
              onClick={handleSaveEdit}
              disabled={!editName || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
