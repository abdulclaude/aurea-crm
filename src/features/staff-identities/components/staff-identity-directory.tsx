"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { Unlink } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkSourceDialog } from "@/features/staff-identities/components/link-source-dialog";
import { getStaffIdentityColumns } from "@/features/staff-identities/components/staff-identity-columns";
import {
  StaffIdentityToolbar,
  type StaffIdentitySort,
} from "@/features/staff-identities/components/staff-identity-toolbar";
import type { StaffIdentityStatus } from "@/features/staff-identities/contracts";
import { useTRPC } from "@/trpc/client";

const DEFAULT_SORT: StaffIdentitySort = "createdAt.desc";

function sortToState(sort: StaffIdentitySort): SortingState {
  const [id, direction] = sort.split(".");
  return [{ id, desc: direction === "desc" }];
}

export function StaffIdentityDirectory() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<StaffIdentitySort>(DEFAULT_SORT);
  const [statuses, setStatuses] = useState<StaffIdentityStatus[]>([]);
  const { data } = useSuspenseQuery(
    trpc.staffIdentities.directory.queryOptions(),
  );
  const { data: permissions } = useSuspenseQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );
  const canManage = permissions.capabilities.includes("team.manage");
  const columns = useMemo(
    () => getStaffIdentityColumns(canManage),
    [canManage],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const identities = useMemo(
    () =>
      data.identities.filter((identity) => {
        const matchesStatus =
          statuses.length === 0 || statuses.includes(identity.status);
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [
            identity.displayName,
            identity.email,
            identity.phone,
            ...identity.sources.flatMap((source) => [
              source.label,
              source.role,
            ]),
          ]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        return matchesStatus && matchesSearch;
      }),
    [data.identities, normalizedSearch, statuses],
  );

  return (
    <div>
      <DataTable
        data={identities}
        columns={columns}
        getRowId={(identity) => identity.id}
        sorting={sortToState(sort)}
        onSortingChange={(state) => {
          const primary = state[0];
          if (!primary) {
            setSort(DEFAULT_SORT);
            return;
          }
          const nextSort = `${primary.id}.${primary.desc ? "desc" : "asc"}`;
          if (
            nextSort === "createdAt.desc" ||
            nextSort === "createdAt.asc" ||
            nextSort === "name.asc" ||
            nextSort === "name.desc" ||
            nextSort === "status.asc"
          ) {
            setSort(nextSort);
          }
        }}
        enableGlobalSearch={false}
        emptyState={
          <div className="py-12 text-center text-xs text-primary/60">
            No team identities found.
          </div>
        }
        toolbar={{
          filters: ({ table }) => (
            <StaffIdentityToolbar
              search={search}
              onSearchChange={setSearch}
              sortValue={sort}
              onSortChange={setSort}
              selectedStatuses={statuses}
              onStatusesChange={setStatuses}
              table={table}
            />
          ),
        }}
      />

      {data.unlinked.length > 0 ? (
        <section className="py-6">
          <div className="flex items-center justify-between gap-3 px-6 pb-3">
            <div className="flex items-center gap-2">
              <Unlink className="size-4 text-amber-600" />
              <h2 className="text-sm font-medium text-primary">
                Unlinked staff records
              </h2>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {data.unlinked.length} need review
            </Badge>
          </div>
          <div className="border-y border-black/5 dark:border-white/5">
            {data.unlinked.map((source) => (
              <div
                key={`${source.sourceType}-${source.sourceId}`}
                className="flex flex-col gap-3 border-t border-black/5 px-6 py-3 first:border-t-0 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-primary">
                    {source.displayName}
                  </p>
                  <p className="truncate text-[11px] text-primary/55">
                    {source.label}
                    {source.role ? ` ${source.role}` : ""}
                  </p>
                </div>
                {canManage ? (
                  <LinkSourceDialog
                    source={source}
                    identities={data.identities}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
