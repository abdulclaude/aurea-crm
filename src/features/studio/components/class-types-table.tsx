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
import { Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ClassTypesToolbar } from "./class-types-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClassTypeRow = RouterOutput["classTypes"]["list"][number];

const DEFAULT_SORT = "name.asc";
const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_KEY = "class-types-table.column-order";

function buildColumns(
  onEdit: (row: ClassTypeRow) => void,
  onDelete: (id: string) => void,
): ColumnDef<ClassTypeRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Class type",
      meta: { label: "Class type" },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          {row.original.color && (
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: row.original.color }}
            />
          )}
          <span className="text-xs font-medium text-primary truncate">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      id: "description",
      accessorFn: (row) => row.description,
      header: "Description",
      meta: { label: "Description" },
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-primary/60 line-clamp-1 max-w-xs">
          {row.original.description || "—"}
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
        <span className="text-xs text-primary/60">
          {row.original._count.studioClass}
        </span>
      ),
    },
    {
      id: "isActive",
      accessorFn: (row) => row.isActive,
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge
            variant="outline"
            className="text-[11px] text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[11px] text-amber-600 ring-amber-200 dark:border-amber-800"
          >
            Inactive
          </Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary/40 hover:text-primary"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary/40 hover:text-destructive"
            onClick={() => onDelete(row.original.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

export function ClassTypesTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [selectedActive, setSelectedActive] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const [editingRow, setEditingRow] = React.useState<ClassTypeRow | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editColor, setEditColor] = React.useState("#6366f1");

  const { data: classTypes, isFetching } = useSuspenseQuery(
    trpc.classTypes.list.queryOptions({ includeInactive: true }),
  );

  const updateMutation = useMutation(trpc.classTypes.update.mutationOptions());
  const deleteMutation = useMutation(trpc.classTypes.delete.mutationOptions());

  function invalidate() {
    queryClient.invalidateQueries(
      trpc.classTypes.list.queryOptions({ includeInactive: true }),
    );
  }

  function handleEdit(row: ClassTypeRow) {
    setEditingRow(row);
    setEditName(row.name);
    setEditDescription(row.description ?? "");
    setEditColor(row.color ?? "#6366f1");
  }

  function handleSaveEdit() {
    if (!editingRow) return;
    updateMutation.mutate(
      {
        id: editingRow.id,
        name: editName,
        description: editDescription || null,
        color: editColor,
      },
      {
        onSuccess: () => {
          toast.success("Class type updated");
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
          toast.success("Class type deleted");
          invalidate();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const columns = React.useMemo(
    () => buildColumns(handleEdit, handleDelete),
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
    let result = [...classTypes];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => row.name.toLowerCase().includes(q));
    }

    if (selectedActive.length > 0) {
      result = result.filter((row) =>
        selectedActive.includes(row.isActive ? "true" : "false"),
      );
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "classes")
        cmp = a._count.studioClass - b._count.studioClass;
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [classTypes, search, selectedActive, sortValue]);

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
            <p className="text-sm font-medium text-primary">
              No class types yet
            </p>
            <p className="text-xs text-primary/55 mt-1">
              Create your first class type to get started.
            </p>
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <ClassTypesToolbar
              search={search}
              onSearchChange={setSearch}
              selectedActive={selectedActive}
              sortValue={sortValue}
              onSortChange={setSortValue}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrderOrDefault}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={COLUMN_IDS}
              onApplyFilters={({ active }) => setSelectedActive(active)}
            />
          ),
        }}
      />

      <Dialog
        open={!!editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit class type</DialogTitle>
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
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-3">
              <Label>Color</Label>
              <div className="flex w-max gap-2">
                <Input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-16 h-9 p-1"
                />

                <Input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="flex w-max"
                />
              </div>
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
