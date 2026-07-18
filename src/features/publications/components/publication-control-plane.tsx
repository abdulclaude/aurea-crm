"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicationCreateDialog } from "@/features/publications/components/publication-create-dialog";
import {
  PublicationFilters,
  type PublicationStatusFilter,
} from "@/features/publications/components/publication-filters";
import { PublicationSummaryStrip } from "@/features/publications/components/publication-summary-strip";
import { PublicationTargetSheet } from "@/features/publications/components/publication-target-sheet";
import { PublicationTargetState } from "@/features/publications/components/publication-target-state";
import type { PublicationKind } from "@/features/publications/contracts";
import { useTRPC } from "@/trpc/client";

export function PublicationControlPlane(): React.JSX.Element {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedTargetId = searchParams.get("target");
  const linkedSourceKey = searchParams.get("sourceKey");
  const [selectedTargetId, setSelectedTargetId] = React.useState<string | null>(
    linkedTargetId,
  );
  const [createOpen, setCreateOpen] = React.useState(Boolean(linkedSourceKey));
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<PublicationKind | "ALL">("ALL");
  const [status, setStatus] = React.useState<PublicationStatusFilter>("ALL");
  const targets = useQuery(trpc.publications.list.queryOptions());
  const inventory = useQuery(trpc.publications.sourceInventory.queryOptions());

  React.useEffect(() => {
    if (linkedTargetId) setSelectedTargetId(linkedTargetId);
  }, [linkedTargetId]);
  React.useEffect(() => {
    if (linkedSourceKey) setCreateOpen(true);
  }, [linkedSourceKey]);

  function clearRouteState(): void {
    router.replace("/settings/publication", { scroll: false });
  }

  function openTarget(id: string): void {
    setCreateOpen(false);
    setSelectedTargetId(id);
    router.replace(`/settings/publication?target=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  async function refreshTarget(id: string): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries(trpc.publications.list.queryOptions()),
      queryClient.invalidateQueries(
        trpc.publications.sourceInventory.queryOptions(),
      ),
      queryClient.invalidateQueries(trpc.publications.get.queryOptions({ id })),
      queryClient.invalidateQueries(
        trpc.publications.parity.queryOptions({ id }),
      ),
      queryClient.invalidateQueries(
        trpc.publications.versions.queryOptions({ id }),
      ),
      queryClient.invalidateQueries(
        trpc.publications.domainInstructions.queryOptions({ id }),
      ),
    ]);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTargets = (targets.data ?? []).filter(
    (target) =>
      (kind === "ALL" || target.kind === kind) &&
      (status === "ALL" || target.status === status) &&
      (!normalizedQuery ||
        target.name.toLowerCase().includes(normalizedQuery) ||
        target.slug.toLowerCase().includes(normalizedQuery) ||
        target.domainHost?.toLowerCase().includes(normalizedQuery)),
  );

  return (
    <div className="min-w-0">
      <header className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h1 className="text-xl font-semibold">Publishing</h1>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
            Manage reusable publication channels, verified domains, consent, and
            immutable rollback history.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" />
          New target
        </Button>
      </header>
      <Separator />
      {targets.data ? (
        <PublicationSummaryStrip targets={targets.data} />
      ) : (
        <Skeleton className="h-[74px] rounded-none" />
      )}
      <PublicationFilters
        query={query}
        kind={kind}
        status={status}
        onQueryChange={setQuery}
        onKindChange={setKind}
        onStatusChange={setStatus}
      />

      <PublicationTargetState
        isLoading={targets.isLoading}
        error={targets.error}
        totalCount={targets.data?.length ?? 0}
        targets={visibleTargets}
        onRetry={() => void targets.refetch()}
        onOpen={openTarget}
      />

      <PublicationCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) clearRouteState();
        }}
        sources={inventory.data ?? []}
        sourceKey={linkedSourceKey}
        isLoading={inventory.isLoading}
        error={inventory.error}
        onRetry={() => void inventory.refetch()}
        onCreated={(id) => {
          void refreshTarget(id);
          openTarget(id);
        }}
        onOpenTarget={openTarget}
      />
      <PublicationTargetSheet
        targetId={selectedTargetId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTargetId(null);
            clearRouteState();
          }
        }}
        onChanged={refreshTarget}
      />
    </div>
  );
}
