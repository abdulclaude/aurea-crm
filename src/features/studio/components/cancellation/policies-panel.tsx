"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDecimalMoney } from "@/features/commerce/lib/money";
import { useTRPC } from "@/trpc/client";

import { PolicyEditorDialog } from "./policy-editor-dialog";
import { CancellationQueryError } from "./cancellation-query-error";
import type { CancellationPolicy } from "./types";

export function PoliciesPanel({
  canManage,
  hydrated,
}: {
  canManage: boolean;
  hydrated: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const policies = useQuery(trpc.cancellationPolicy.list.queryOptions());
  const [editing, setEditing] = useState<CancellationPolicy | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [archiving, setArchiving] = useState<CancellationPolicy | null>(null);
  const archivePolicy = useMutation(
    trpc.cancellationPolicy.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.cancellationPolicy.list.queryKey(),
        });
        toast.success("Cancellation policy archived");
        setArchiving(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!hydrated || policies.isLoading) {
    return (
      <div className="space-y-3 p-6 sm:p-8">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (policies.isError) {
    return (
      <CancellationQueryError
        message={policies.error.message}
        onRetry={() => void policies.refetch()}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 p-6 sm:px-8">
        <div>
          <h2 className="text-sm font-semibold">Policies</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Set fees, credit deductions, notifications, and collection behavior.
          </p>
        </div>
        <Button
          size="sm"
          disabled={!canManage}
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus />
          New policy
        </Button>
      </div>
      <Separator />
      {policies.data?.length ? (
        <div className="divide-y">
          {policies.data.map((policy) => (
            <div
              key={policy.id}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{policy.name}</p>
                  {policy.isDefault ? (
                    <Badge variant="secondary">Default</Badge>
                  ) : null}
                  {!policy.isActive ? (
                    <Badge variant="outline">Archived</Badge>
                  ) : null}
                  {policy.chargeCard ? (
                    <Badge variant="outline">Automatic collection</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {policy.lateCancelWindow}h window /{" "}
                  {formatDecimalMoney(policy.lateCancelFee, policy.currency)}{" "}
                  late /{" "}
                  {formatDecimalMoney(policy.noShowFeeAmount, policy.currency)}{" "}
                  no-show
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => {
                    setEditing(policy);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil />
                  Edit
                </Button>
                {policy.isActive ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Archive policy"
                    aria-label={`Archive ${policy.name}`}
                    disabled={!canManage}
                    onClick={() => setArchiving(policy)}
                  >
                    <Archive />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No cancellation policies configured.
        </div>
      )}

      <PolicyEditorDialog
        policy={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
      <AlertDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Upcoming classes must be reassigned first. Historical fees keep
              their policy reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archivePolicy.isPending}
              onClick={() =>
                archiving && archivePolicy.mutate({ id: archiving.id })
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
