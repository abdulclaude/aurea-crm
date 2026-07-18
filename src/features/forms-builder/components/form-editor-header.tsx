"use client";

import { ArrowLeft, ListChecks, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { FormEditorData } from "@/features/forms-builder/components/form-editor-types";
import { FormPublicationSheet } from "@/features/forms-builder/components/form-publication-sheet";
import { FormStatusBadge } from "@/features/forms-builder/components/form-status-badge";

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
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Back to forms"
          onClick={() => router.push("/builder/forms")}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{form.name}</h1>
            <FormStatusBadge status={form.status} />
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
