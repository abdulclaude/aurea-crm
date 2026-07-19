"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { FormEditorData } from "@/features/forms-builder/components/form-editor-types";
import { FormPublicationSheet } from "@/features/forms-builder/components/form-publication-sheet";
import { FormStatusBadge } from "@/features/forms-builder/components/form-status-badge";
import { useTRPC } from "@/trpc/client";

export function FormEditorHeader({
  form,
  saving,
  saveDisabled,
  onSave,
}: {
  form: FormEditorData;
  saving: boolean;
  saveDisabled: boolean;
  onSave: () => void;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const publications = useQuery(
    trpc.publications.list.queryOptions({ kind: "FORM" }),
  );
  const publication = publications.data?.find(
    (target) => target.sourceKey === `form:${form.id}`,
  );
  const status =
    form.status === "ARCHIVED" ? "ARCHIVED" : publication?.status ?? "DRAFT";
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{form.name}</h1>
            <FormStatusBadge status={status} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {form._count.formSubmission} responses
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild type="button" size="sm" variant="outline">
          <Link href={`/builder/forms/${form.id}/submissions`}>
            <span className="hidden sm:inline">Responses</span>
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="gradient"
          className="w-max"
          disabled={saving || saveDisabled}
          onClick={onSave}
        >
          <span className="hidden sm:inline">
            {saving ? "Saving" : "Save changes"}
          </span>
        </Button>
        <FormPublicationSheet formId={form.id} />
      </div>
    </header>
  );
}
