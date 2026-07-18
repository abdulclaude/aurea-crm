"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildFormSubmissionColumns } from "@/features/forms-builder/components/form-submission-columns";
import { FormSubmissionExportButton } from "@/features/forms-builder/components/form-submission-export-button";
import {
  FormSubmissionToolbar,
  type FormSubmissionAutomationStatus,
  type FormSubmissionClientStatus,
  type FormSubmissionSort,
} from "@/features/forms-builder/components/form-submission-toolbar";
import { useTRPC } from "@/trpc/client";

const DEFAULT_COLUMN_ORDER = [
  "submitted",
  "respondent",
  "automation",
  "source",
  "retention",
  "response",
  "actions",
];

export function FormSubmissions({ formId }: { formId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] =
    React.useState<FormSubmissionSort>("submitted.desc");
  const [clientStatuses, setClientStatuses] = React.useState<
    FormSubmissionClientStatus[]
  >([]);
  const [automationStatuses, setAutomationStatuses] = React.useState<
    FormSubmissionAutomationStatus[]
  >([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      automation: false,
      retention: false,
    });
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);

  const formQuery = useQuery(trpc.forms.get.queryOptions({ id: formId }));
  const responseQuery = useInfiniteQuery({
    ...trpc.forms.getSubmissions.infiniteQueryOptions(
      {
        formId,
        limit: 50,
        search: search.trim() || undefined,
        clientResolutionStatuses: clientStatuses,
        triggerDispatchStatuses: automationStatuses,
        sort,
      },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  });
  const form = formQuery.data;
  const submissions =
    responseQuery.data?.pages.flatMap((page) => page.submissions) ?? [];
  const fields =
    form?.formStep.flatMap((step) =>
      step.formField.map((field) => ({ id: field.id, label: field.label })),
    ) ?? [];
  const columns = React.useMemo(
    () => buildFormSubmissionColumns({ formId, fields }),
    [fields, formId],
  );

  if (formQuery.isLoading && !form) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/builder/forms/${formId}/editor`)}
            aria-label="Back to form editor"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{form?.name}</h1>
            <p className="text-xs text-muted-foreground">
              {form?._count.formSubmission ?? submissions.length} responses
            </p>
          </div>
        </div>
        <FormSubmissionExportButton formId={formId} />
      </header>

      {formQuery.isError || responseQuery.isError ? (
        <div className="border-b bg-destructive/5 px-6 py-3 text-xs text-destructive">
          {formQuery.error?.message ??
            responseQuery.error?.message ??
            "Responses could not be loaded."}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={submissions}
        isLoading={responseQuery.isLoading}
        getRowId={(submission) => submission.id}
        enableGlobalSearch={false}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        initialColumnOrder={DEFAULT_COLUMN_ORDER}
        toolbar={{
          filters: ({ table }) => (
            <FormSubmissionToolbar
              search={search}
              onSearchChange={setSearch}
              clientStatuses={clientStatuses}
              onClientStatusesChange={setClientStatuses}
              automationStatuses={automationStatuses}
              onAutomationStatusesChange={setAutomationStatuses}
              sort={sort}
              onSortChange={setSort}
              table={table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              initialColumnOrder={DEFAULT_COLUMN_ORDER}
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="size-8 text-primary/20" aria-hidden="true" />
            <p className="text-sm text-primary/50">
              {search || clientStatuses.length || automationStatuses.length
                ? "No responses match this view."
                : "No responses yet."}
            </p>
          </div>
        }
      />

      {responseQuery.hasNextPage ? (
        <div className="flex justify-center border-b p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={responseQuery.isFetchingNextPage}
            onClick={() => responseQuery.fetchNextPage()}
          >
            {responseQuery.isFetchingNextPage ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Load more responses
          </Button>
        </div>
      ) : null}
    </div>
  );
}
