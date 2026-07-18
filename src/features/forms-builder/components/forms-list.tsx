"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import {
  buildFormColumns,
  type FormListRow,
} from "./forms-table-columns";
import { FormDeleteDialog } from "./form-delete-dialog";
import { FORM_BLUEPRINT_OPTIONS } from "@/features/forms-builder/lib/form-blueprints";

const DEFAULT_COLUMN_ORDER = [
  "name",
  "status",
  "steps",
  "responses",
  "publication",
  "created",
  "updated",
  "actions",
];

export function FormsList() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("updated.desc");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({ steps: false, updated: false });
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
  const [deletingForm, setDeletingForm] = React.useState<FormListRow | null>(
    null,
  );

  const formsQuery = useQuery(trpc.forms.list.queryOptions());
  const publicationsQuery = useQuery(
    trpc.publications.list.queryOptions({ kind: "FORM" }),
  );
  const createForm = useMutation(
    trpc.forms.create.mutationOptions({
      onSuccess: (form) => router.push(`/builder/forms/${form.id}/editor`),
      onError: (error) => toast.error(error.message),
    }),
  );
  const archiveForm = useMutation(
    trpc.forms.archive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.forms.list.queryOptions());
        toast.success("Form archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const duplicateForm = useMutation(
    trpc.forms.duplicate.mutationOptions({
      onSuccess: async (form) => {
        await queryClient.invalidateQueries(trpc.forms.list.queryOptions());
        toast.success("Form duplicated");
        router.push(`/builder/forms/${form.id}/editor`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteForm = useMutation(
    trpc.forms.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.forms.list.queryOptions());
        setDeletingForm(null);
        toast.success("Form deleted");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const forms = React.useMemo(() => {
    let rows = formsQuery.data ?? [];
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      rows = rows.filter((form) =>
        [form.name, form.description]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      );
    }
    if (statuses.length > 0) {
      rows = rows.filter((form) => statuses.includes(form.status));
    }
    const [field, direction] = sort.split(".");
    return [...rows].sort((left, right) => {
      let result = 0;
      if (field === "name") result = left.name.localeCompare(right.name);
      if (field === "responses") {
        result = left._count.formSubmission - right._count.formSubmission;
      }
      if (field === "updated") {
        result =
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
      }
      if (field === "created") {
        result =
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
      return direction === "desc" ? -result : result;
    });
  }, [formsQuery.data, search, sort, statuses]);

  const columns = React.useMemo(
    () =>
      buildFormColumns({
        onArchive: (form) => archiveForm.mutate({ id: form.id }),
        onDuplicate: (form) => duplicateForm.mutate({ id: form.id }),
        onDelete: setDeletingForm,
        publicationsBySourceKey: new Map(
          (publicationsQuery.data ?? []).map((target) => [
            target.sourceKey,
            target,
          ]),
        ),
      }),
    [archiveForm, duplicateForm, publicationsQuery.data],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Forms</h1>
          <p className="text-xs text-primary/70">
            Collect responses, publish forms, and connect follow-up automations.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={createForm.isPending}>
              <Plus className="size-3.5" />
              {createForm.isPending ? "Creating..." : "Create form"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {FORM_BLUEPRINT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.id}
                className="items-start py-2"
                onSelect={() =>
                  createForm.mutate({
                    name:
                      option.id === "BLANK" ? "Untitled Form" : option.name,
                    blueprint: option.id,
                    isMultiStep: option.id === "LEAD_NURTURE",
                  })
                }
              >
                <span>
                  <span className="block text-xs font-medium">
                    {option.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      {formsQuery.isError || publicationsQuery.isError ? (
        <div className="border-b bg-destructive/5 px-6 py-3 text-xs text-destructive">
          {formsQuery.error?.message ??
            publicationsQuery.error?.message ??
            "Forms could not be loaded."}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={forms}
        isLoading={formsQuery.isLoading || publicationsQuery.isLoading}
        getRowId={(form) => form.id}
        onRowClick={(form) => router.push(`/builder/forms/${form.id}/editor`)}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        initialColumnOrder={DEFAULT_COLUMN_ORDER}
        enableGlobalSearch={false}
        toolbar={{
          filters: ({ table }) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search forms..."
              filterGroups={[
                {
                  label: "Status",
                  options: [
                    { value: "DRAFT", label: "Draft" },
                    { value: "PUBLISHED", label: "Published" },
                    { value: "ARCHIVED", label: "Archived" },
                  ],
                  selectedValues: statuses,
                  onChange: setStatuses,
                },
              ]}
              sortOptions={[
                { value: "updated.desc", label: "Recently updated" },
                { value: "updated.asc", label: "Oldest updated" },
                { value: "created.desc", label: "Newest created" },
                { value: "created.asc", label: "Oldest created" },
                { value: "name.asc", label: "Name A-Z" },
                { value: "name.desc", label: "Name Z-A" },
                { value: "responses.desc", label: "Most responses" },
              ]}
              sortValue={sort}
              onSortChange={setSort}
              table={table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              initialColumnOrder={DEFAULT_COLUMN_ORDER}
              primaryColumnId="name"
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="size-8 text-primary/20" />
            <p className="text-sm text-primary/50">No forms match this view.</p>
          </div>
        }
      />
      <FormDeleteDialog
        formName={deletingForm?.name ?? null}
        pending={deleteForm.isPending}
        onClose={() => setDeletingForm(null)}
        onConfirm={() =>
          deletingForm && deleteForm.mutate({ id: deletingForm.id })
        }
      />
    </div>
  );
}
