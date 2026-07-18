"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

import {
  RecoveryCaseFilters,
  type RecoveryStatusFilter,
  type RecoveryTargetFilter,
} from "./recovery-case-filters";
import { RecoveryCaseSheet } from "./recovery-case-sheet";
import { RecoveryCasesTable } from "./recovery-cases-table";
import { RecoveryStatsStrip } from "./recovery-stats-strip";

type CaseCursor = { openedAt: Date; id: string };

export function RecoveryOperationsPage() {
  const trpc = useTRPC();
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<RecoveryStatusFilter>("ACTIVE");
  const [target, setTarget] = useState<RecoveryTargetFilter>("ALL");
  const [ownerUserId, setOwnerUserId] = useState("ALL");
  const [cursorStack, setCursorStack] = useState<Array<CaseCursor | undefined>>(
    [undefined],
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const cursor = cursorStack.at(-1);

  useEffect(() => setHydrated(true), []);
  const resetPage = () => setCursorStack([undefined]);
  const permissions = useQuery({
    ...trpc.permissions.getCurrent.queryOptions(),
    enabled: hydrated,
    retry: false,
  });
  const stats = useQuery({
    ...trpc.paymentRecovery.getStats.queryOptions(),
    enabled: hydrated,
    retry: false,
  });
  const owners = useQuery({
    ...trpc.paymentRecovery.listOwners.queryOptions(),
    enabled: hydrated,
    retry: false,
  });
  const cases = useQuery({
    ...trpc.paymentRecovery.listCases.queryOptions({
      status,
      target: target === "ALL" ? undefined : target,
      search: deferredSearch || undefined,
      ownerUserId:
        ownerUserId === "ALL" || ownerUserId === "UNASSIGNED"
          ? undefined
          : ownerUserId,
      unassignedOnly: ownerUserId === "UNASSIGNED",
      cursor,
      limit: 25,
    }),
    enabled: hydrated,
    retry: false,
  });
  const canManage = Boolean(
    permissions.data?.capabilities.includes("commerce.manage"),
  );

  return (
    <div className="min-w-0">
      <header className="p-8">
        <h1 className="text-xl font-semibold">Recovery operations</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Work failed payments, retry delivery, and keep ownership visible.
        </p>
      </header>
      <Separator />
      <RecoveryStatsStrip stats={stats.data} />
      <RecoveryCaseFilters
        search={search}
        status={status}
        target={target}
        ownerUserId={ownerUserId}
        owners={owners.data ?? []}
        onSearchChange={(value) => {
          setSearch(value);
          resetPage();
        }}
        onStatusChange={(value) => {
          setStatus(value);
          resetPage();
        }}
        onTargetChange={(value) => {
          setTarget(value);
          resetPage();
        }}
        onOwnerChange={(value) => {
          setOwnerUserId(value);
          resetPage();
        }}
      />
      <Separator />
      {cases.isError ? (
        <p className="p-8 text-xs text-rose-600">{cases.error.message}</p>
      ) : (
        <RecoveryCasesTable
          items={cases.data?.items ?? []}
          isLoading={!hydrated || cases.isPending}
          hasPrevious={cursorStack.length > 1}
          hasNext={Boolean(cases.data?.nextCursor)}
          onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
          onNext={() => {
            if (cases.data?.nextCursor) {
              setCursorStack((current) => [
                ...current,
                cases.data.nextCursor ?? undefined,
              ]);
            }
          }}
          onOpen={setSelectedCaseId}
        />
      )}
      <RecoveryCaseSheet
        caseId={selectedCaseId}
        canManage={canManage}
        onClose={() => setSelectedCaseId(null)}
      />
    </div>
  );
}
