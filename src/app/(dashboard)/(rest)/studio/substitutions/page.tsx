"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { Bell, Check, Plus, UserRoundCheck } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { SubstitutionsToolbar } from "@/features/instructor-substitutions/components/substitutions-toolbar";
import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";

type RouterOutput = inferRouterOutputs<AppRouter>;
type SubRequest = RouterOutput["instructorSubstitutions"]["list"][number];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OFFERED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACCEPTED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-primary/5 text-primary/50",
  EXPIRED: "bg-primary/5 text-primary/50",
};

const DEFAULT_SORT = "requestedAt.desc";
const PRIMARY_COLUMN_ID = "class";
const COLUMN_ORDER_KEY = "substitutions-table.column-order";

function buildColumns(
  onAccept: (requestId: string) => void,
  onNotify: (requestId: string) => void,
  acceptPending: boolean,
  instructorId: string | null,
): ColumnDef<SubRequest>[] {
  return [
    {
      id: "class",
      accessorFn: (row) => row.studioClass.name,
      header: "Class",
      meta: { label: "Class" },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary truncate">
            {row.original.studioClass.name}
          </p>
          <p className="text-[11px] text-primary/50 whitespace-nowrap">
            {format(
              new Date(row.original.studioClass.startTime),
              "EEE MMM d, h:mm a",
            )}
          </p>
        </div>
      ),
    },
    {
      id: "classType",
      accessorFn: (row) => row.studioClass.classType?.name ?? "",
      header: "Type",
      meta: { label: "Type" },
      enableSorting: true,
      cell: ({ row }) =>
        row.original.studioClass.classType ? (
          <span
            className="text-[10px] rounded-md px-2 py-0.5 font-medium"
            style={{
              backgroundColor: row.original.studioClass.classType.color
                ? `${row.original.studioClass.classType.color}20`
                : undefined,
              color: row.original.studioClass.classType.color ?? undefined,
            }}
          >
            {row.original.studioClass.classType.name}
          </span>
        ) : (
          <span className="text-xs text-primary/40">—</span>
        ),
    },
    {
      id: "originalInstructor",
      accessorFn: (row) => row.originalInstructor?.name ?? "",
      header: "Instructor",
      meta: { label: "Instructor" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs text-primary/70">
          {row.original.originalInstructor?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "substitute",
      accessorFn: (row) => row.substitute?.name ?? "",
      header: "Substitute",
      meta: { label: "Substitute" },
      cell: ({ row }) =>
        row.original.substitute ? (
          <span className="text-xs text-primary/70">
            {row.original.substitute.name}
          </span>
        ) : (
          <span className="text-xs text-primary/30">Open request</span>
        ),
    },
    {
      id: "reason",
      accessorFn: (row) => row.reason ?? "",
      header: "Reason",
      meta: { label: "Reason" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/60 max-w-[200px] truncate block">
          {row.original.reason ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      header: "Status",
      meta: { label: "Status" },
      enableSorting: true,
      cell: ({ row }) => (
        <Badge
          className={
            STATUS_COLORS[row.original.status] ?? "bg-primary/5 text-primary/60"
          }
          variant="secondary"
        >
          {row.original.status.charAt(0) +
            row.original.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => {
        const req = row.original;
        const isOfferedToMe =
          instructorId &&
          req.status === "OFFERED" &&
          req.substitute?.id === instructorId;
        const isOpenAndImInstructor =
          instructorId &&
          req.status === "OPEN" &&
          req.originalInstructor?.id !== instructorId;
        const isAdminAcceptable =
          !instructorId && req.status === "OFFERED" && req.substitute;

        return (
          <div className="flex items-center gap-1 justify-end">
            {!instructorId && req.status === "OPEN" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-primary/50 hover:text-primary"
                onClick={() => onNotify(req.id)}
              >
                <Bell className="size-3.5 mr-1" />
                Notify all
              </Button>
            )}
            {(isOfferedToMe || isOpenAndImInstructor) && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={acceptPending}
                onClick={() => onAccept(req.id)}
              >
                <Check className="size-3.5" />
                Accept class
              </Button>
            )}
            {isAdminAcceptable && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={acceptPending}
                onClick={() => onAccept(req.id)}
              >
                <Check className="size-3.5" />
                Accept
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}

export default function InstructorSubstitutionsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isInstructor, instructor: myInstructorProfile } = useIsInstructor();

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([
    "OPEN",
    "OFFERED",
    "ACCEPTED",
  ]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [classId, setClassId] = React.useState("");
  const [reason, setReason] = React.useState("");

  const { data: requests, isFetching } = useSuspenseQuery(
    trpc.instructorSubstitutions.list.queryOptions(),
  );
  const { data: myClasses } = useQuery({
    ...trpc.instructors.getMyClasses.queryOptions({ status: "upcoming" }),
    enabled: isInstructor,
  });
  const { data: allUpcoming } = useQuery({
    ...trpc.studioClassesEnhanced.upcoming.queryOptions({ limit: 50 }),
    enabled: !isInstructor,
  });
  const upcoming = isInstructor ? myClasses : allUpcoming;

  function invalidate() {
    queryClient.invalidateQueries(
      trpc.instructorSubstitutions.list.queryOptions(),
    );
  }

  function invalidateAfterAccept() {
    invalidate();
    queryClient.invalidateQueries({
      queryKey: trpc.instructors.getMyClasses.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.instructors.getMySchedule.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.instructors.listMyClasses.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.instructors.getDashboard.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.studioClassesEnhanced.getSchedule.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.studioClassesEnhanced.list.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.studioClassesEnhanced.upcoming.queryKey(),
    });
  }

  const requestSubs = useMutation(
    trpc.instructorSubstitutions.requestForClass.mutationOptions({
      onSuccess: () => {
        toast.success("Notified available substitutes");
        setReason("");
        setClassId("");
        setDialogOpen(false);
        invalidate();
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  const accept = useMutation(
    trpc.instructorSubstitutions.accept.mutationOptions({
      onSuccess: () => {
        toast.success(
          isInstructor
            ? "You are now the instructor for this class"
            : "Substitution accepted — class instructor updated",
        );
        invalidateAfterAccept();
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  function handleAccept(requestId: string) {
    accept.mutate({ requestId });
  }

  function handleNotify(requestId: string) {
    toast.info("Notified all available instructors");
  }

  const myInstructorId = myInstructorProfile?.id ?? null;

  const columns = React.useMemo(
    () =>
      buildColumns(
        handleAccept,
        handleNotify,
        accept.isPending,
        myInstructorId,
      ),
    [accept.isPending, myInstructorId],
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
    let result = [...(requests ?? [])];

    // Only show open and recently accepted (within 7 days)
    result = result.filter((r) => {
      if (r.status === "OPEN" || r.status === "OFFERED") return true;
      if (r.status === "ACCEPTED") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return r.acceptedAt ? new Date(r.acceptedAt) > sevenDaysAgo : true;
      }
      return false;
    });

    if (selectedStatuses.length > 0) {
      result = result.filter((r) => selectedStatuses.includes(r.status));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.studioClass.name.toLowerCase().includes(q) ||
          r.originalInstructor?.name?.toLowerCase().includes(q) ||
          r.substitute?.name?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q),
      );
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "requestedAt")
        cmp =
          new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
      else if (col === "classTime")
        cmp =
          new Date(a.studioClass.startTime).getTime() -
          new Date(b.studioClass.startTime).getTime();
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [requests, search, selectedStatuses, sortValue]);

  const columnOrderOrDefault =
    columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Instructor substitutions
          </h1>
          <p className="text-xs text-primary/70">
            Manage cover requests and substitutions for upcoming classes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-3.5" />
          Request cover
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

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
            <UserRoundCheck className="size-8 text-primary mb-3" />
            <p className="text-sm font-medium text-primary">
              No substitution requests
            </p>
            <p className="text-xs text-primary/55 mt-1">
              Open and recently accepted requests will appear here.
            </p>
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <SubstitutionsToolbar
              search={search}
              onSearchChange={setSearch}
              selectedStatuses={selectedStatuses}
              sortValue={sortValue}
              onSortChange={setSortValue}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrderOrDefault}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={COLUMN_IDS}
              onApplyFilters={({ statuses }) => setSelectedStatuses(statuses)}
            />
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request cover</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select upcoming class" />
                </SelectTrigger>
                <SelectContent>
                  {(upcoming ?? []).map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ·{" "}
                      {format(new Date(cls.startTime), "EEE MMM d, h:mm a")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Instructor is sick, travel delay, emergency..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={!classId || requestSubs.isPending}
              onClick={() =>
                requestSubs.mutate({ classId, reason: reason || undefined })
              }
            >
              {requestSubs.isPending ? "Notifying..." : "Notify available subs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
