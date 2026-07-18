"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

import { formatMinutes, modeLabel } from "./format";
import type { SchedulingPolicy, SchedulingPolicyHistory } from "./types";

export function PolicyHistoryDialog(props: {
  open: boolean;
  policy: SchedulingPolicy | null;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const history = useQuery({
    ...trpc.schedulingPolicy.history.queryOptions({
      kind: props.policy?.kind ?? "BOOKING_WINDOW",
      policyId: props.policy?.id ?? "",
    }),
    enabled: props.open && Boolean(props.policy),
  });
  const rollback = useMutation(
    trpc.schedulingPolicy.rollback.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.schedulingPolicy.list.queryKey(),
          }),
          history.refetch(),
        ]);
        toast.success("Policy restored as a new version");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const latestVersion = history.data?.at(0)?.version;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.policy?.name ?? "Policy"} history</DialogTitle>
          <DialogDescription>
            Versions are append-only. Restoring publishes the selected values as
            a new version.
          </DialogDescription>
        </DialogHeader>
        {history.isLoading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="space-y-3"
          >
            <span className="sr-only">Loading policy history</span>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : history.isError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 p-4 text-sm text-destructive"
          >
            {history.error.message}
          </div>
        ) : history.data?.length ? (
          <div className="divide-y rounded-md border">
            {history.data.map((version) => {
              const isEffective =
                props.policy?.currentVersion?.id === version.id;
              const isLatest = version.version === latestVersion;
              return (
                <div
                  key={version.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        Version {version.version}
                      </p>
                      {isEffective ? <Badge>Effective</Badge> : null}
                      {isLatest && !isEffective ? (
                        <Badge variant="secondary">Scheduled latest</Badge>
                      ) : null}
                      {version.rollbackFromVersion ? (
                        <Badge variant="outline">
                          Restored from {version.rollbackFromVersion}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {versionSummary(version)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Effective{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(version.effectiveFrom))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {version.changeNote || "No change note"}
                    </p>
                  </div>
                  {props.canManage && !isLatest && latestVersion ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={rollback.isPending}
                        >
                          <RotateCcw />
                          Restore
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Restore version {version.version}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            A new version becomes effective immediately.
                            Existing class snapshots remain unchanged.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              props.policy &&
                              rollback.mutate({
                                kind: props.policy.kind,
                                policyId: props.policy.id,
                                targetVersion: version.version,
                                expectedVersion: latestVersion,
                                effectiveFrom: new Date(),
                                changeNote: `Restored version ${version.version}`,
                              })
                            }
                          >
                            Restore version
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p
            role="status"
            className="py-10 text-center text-sm text-muted-foreground"
          >
            No versions found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function versionSummary(version: SchedulingPolicyHistory[number]): string {
  if ("opensMinutesBeforeStart" in version.values) {
    return `Opens ${formatMinutes(version.values.opensMinutesBeforeStart)} / closes ${formatMinutes(version.values.closesMinutesBeforeStart)}`;
  }
  const limit = version.values.maxEntries ?? "unlimited";
  return `${modeLabel(version.values.mode)} / ${limit} entries`;
}
