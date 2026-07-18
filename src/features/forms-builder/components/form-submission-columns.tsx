"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format, formatDistanceToNow } from "date-fns";

import type { AppRouter } from "@/trpc/routers/_app";
import { FormSubmissionDeleteButton } from "./form-submission-delete-button";
import { FormSubmissionResponseDialog } from "./form-submission-response-dialog";
import {
  FormSubmissionAutomationStatus,
  FormSubmissionMemberStatus,
} from "./form-submission-status";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type FormSubmissionRow =
  RouterOutputs["forms"]["getSubmissions"]["submissions"][number];

export function buildFormSubmissionColumns(input: {
  formId: string;
  fields: Array<{ id: string; label: string }>;
}): ColumnDef<FormSubmissionRow>[] {
  return [
    {
      id: "submitted",
      accessorFn: (row) => new Date(row.submittedAt).getTime(),
      header: "Submitted",
      meta: { label: "Submitted" },
      enableHiding: false,
      cell: ({ row }) => (
        <span
          className="whitespace-nowrap text-xs text-primary/65"
          title={format(new Date(row.original.submittedAt), "PPpp")}
        >
          {formatDistanceToNow(new Date(row.original.submittedAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: "respondent",
      accessorFn: (row) =>
        [row.client?.name, row.client?.email].filter(Boolean).join(" "),
      header: "Respondent",
      meta: { label: "Respondent" },
      cell: ({ row }) => (
        <FormSubmissionMemberStatus
          formId={input.formId}
          submissionId={row.original.id}
          member={row.original.client}
          status={row.original.clientResolutionStatus}
          error={row.original.clientResolutionError}
        />
      ),
    },
    {
      id: "automation",
      accessorKey: "triggerDispatchStatus",
      header: "Automation",
      meta: { label: "Automation" },
      cell: ({ row }) => (
        <FormSubmissionAutomationStatus
          status={row.original.triggerDispatchStatus}
          error={row.original.triggerDispatchError}
        />
      ),
    },
    {
      id: "source",
      accessorFn: (row) => row.utmSource ?? "Direct",
      header: "Source",
      meta: { label: "Source" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/65">
          {row.original.utmSource ?? "Direct"}
        </span>
      ),
    },
    {
      id: "retention",
      accessorFn: (row) =>
        row.retentionExpiresAt
          ? new Date(row.retentionExpiresAt).getTime()
          : Number.MAX_SAFE_INTEGER,
      header: "Retention",
      meta: { label: "Retention" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-primary/55">
          {row.original.retentionExpiresAt
            ? format(new Date(row.original.retentionExpiresAt), "PP")
            : "Legacy policy"}
        </span>
      ),
    },
    {
      id: "response",
      header: "Response",
      meta: { label: "Response" },
      enableHiding: false,
      cell: ({ row }) => (
        <FormSubmissionResponseDialog
          data={row.original.data}
          fields={input.fields}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <FormSubmissionDeleteButton
          formId={input.formId}
          submissionId={row.original.id}
        />
      ),
    },
  ];
}
