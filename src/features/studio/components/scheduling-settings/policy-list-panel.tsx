"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Copy,
  History,
  Pencil,
  Plus,
  Search,
  Star,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

import { policySummary } from "./format";
import type { SchedulingPolicy, SchedulingPolicyKind } from "./types";

export function PolicyListPanel(props: {
  kind: SchedulingPolicyKind;
  policies: SchedulingPolicy[];
  canManage: boolean;
  scopeLocationId: string | null;
  onCreate: () => void;
  onVersion: (policy: SchedulingPolicy) => void;
  onClone: (policy: SchedulingPolicy) => void;
  onHistory: (policy: SchedulingPolicy) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query, setQuery] = React.useState("");
  const [archiving, setArchiving] = React.useState<SchedulingPolicy | null>(
    null,
  );
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.schedulingPolicy.list.queryKey(),
    });
  const setDefault = useMutation(
    trpc.schedulingPolicy.setDefault.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Scheduling default updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const archive = useMutation(
    trpc.schedulingPolicy.archive.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        setArchiving(null);
        toast.success("Scheduling policy archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = props.policies.filter((policy) =>
    [policy.name, policy.description ?? "", policySummary(policy)].some(
      (value) => value.toLocaleLowerCase().includes(normalized),
    ),
  );
  const label = props.kind === "BOOKING_WINDOW" ? "booking window" : "waitlist";

  return (
    <div>
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 className="text-sm font-semibold capitalize">{label} policies</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Changes publish as immutable versions; existing bookings keep their
            resolved policy.
          </p>
        </div>
        <Button size="sm" disabled={!props.canManage} onClick={props.onCreate}>
          <Plus />
          New policy
        </Button>
      </div>
      <Separator />
      <div className="p-4 sm:px-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={`Search ${label} policies`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${label} policies`}
            className="pl-9"
          />
        </div>
      </div>
      <Separator />
      {filtered.length ? (
        <div className="divide-y">
          {filtered.map((policy) => {
            const owned = policy.locationId === props.scopeLocationId;
            return (
              <div
                key={policy.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {policy.name}
                    </p>
                    {policy.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {!policy.isActive ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                    {!owned ? <Badge variant="outline">Inherited</Badge> : null}
                    {policy.currentVersion ? (
                      <Badge variant="outline">
                        Version {policy.currentVersion.version}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Scheduled</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {policySummary(policy)}
                  </p>
                  {policy.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {policy.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => props.onHistory(policy)}
                  >
                    <History />
                    History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!props.canManage || !owned || !policy.isActive}
                    onClick={() => props.onVersion(policy)}
                  >
                    <Pencil />
                    New version
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Clone policy"
                    aria-label={`Clone ${policy.name}`}
                    disabled={!props.canManage || !policy.currentVersion}
                    onClick={() => props.onClone(policy)}
                  >
                    <Copy />
                  </Button>
                  {!policy.isDefault && policy.isActive ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Make default"
                      aria-label={`Make ${policy.name} the default`}
                      disabled={
                        !props.canManage || !owned || setDefault.isPending
                      }
                      onClick={() =>
                        setDefault.mutate({
                          kind: policy.kind,
                          policyId: policy.id,
                          isDefault: true,
                        })
                      }
                    >
                      <Star />
                    </Button>
                  ) : null}
                  {policy.isActive ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Archive policy"
                      aria-label={`Archive ${policy.name}`}
                      disabled={!props.canManage || !owned}
                      onClick={() => setArchiving(policy)}
                    >
                      <Archive />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-sm text-muted-foreground">
          {normalized
            ? "No policies match this search."
            : `No ${label} policies configured.`}
        </div>
      )}

      <AlertDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Services and future class overrides must be reassigned first.
              Historical snapshots remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archive.isPending}
              onClick={() =>
                archiving &&
                archive.mutate({ kind: archiving.kind, policyId: archiving.id })
              }
            >
              Archive policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
