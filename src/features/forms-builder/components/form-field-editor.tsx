"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import * as React from "react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formFieldDraft,
  formFieldUpdate,
  type FormFieldUpdate,
} from "@/features/forms-builder/components/form-field-editor-utils";
import { FormFieldSettings } from "@/features/forms-builder/components/form-field-settings";
import type { FormEditorField } from "@/features/forms-builder/components/form-editor-types";
import { formFieldTypeLabel } from "@/features/forms-builder/components/form-field-presets";

export type { FormFieldUpdate };

export function FormFieldEditor({
  field,
  index,
  pending,
  onSave,
  onDelete,
}: {
  field: FormEditorField;
  index: number;
  pending: boolean;
  onSave: (value: FormFieldUpdate) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [draft, setDraft] = React.useState(() => formFieldDraft(field));
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  React.useEffect(() => setDraft(formFieldDraft(field)), [field]);

  return (
    <>
      <Collapsible
        ref={setNodeRef}
        open={open}
        onOpenChange={setOpen}
        className={`overflow-hidden rounded-md border bg-background shadow-xs transition-colors hover:bg-muted/30 ${
          isDragging ? "relative z-10 opacity-70 shadow-md" : ""
        }`}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
      >
        <div className="flex min-h-14 items-center gap-2 px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 cursor-grab touch-none hover:bg-transparent active:cursor-grabbing"
                aria-label={`Reorder question ${index + 1}`}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Drag to reorder</TooltipContent>
          </Tooltip>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start px-1 py-2 text-left hover:bg-transparent"
            >
              <span className="min-w-0">
                <span className="block text-[10px] text-muted-foreground">
                  Question {index + 1}
                </span>
                <span className="block truncate text-xs font-medium">
                  {field.label}
                </span>
              </span>
            </Button>
          </CollapsibleTrigger>
          {field.required ? (
            <Badge
              variant="outline"
              className="max-w-32 truncate text-[10px] text-amber-700 ring-0 dark:text-amber-300"
              style={{
                backgroundColor: "rgb(245 158 11 / 0.1)",
                borderColor: "rgb(245 158 11 / 0.4)",
                boxShadow: "0 0 0 1px rgb(245 158 11 / 0.4)",
              }}
            >
              Required
            </Badge>
          ) : null}
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            {formFieldTypeLabel(field.type)}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
          <Pencil
            aria-hidden="true"
            className="size-3 text-muted-foreground"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:bg-transparent hover:text-destructive"
                aria-label={`Delete question ${index + 1}`}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete question</TooltipContent>
          </Tooltip>
        </div>
        <CollapsibleContent>
          <FormFieldSettings
            fieldId={field.id}
            draft={draft}
            pending={pending}
            onChange={setDraft}
            onSave={() => onSave(formFieldUpdate(field.id, draft))}
            onDelete={() => setConfirmDelete(true)}
          />
        </CollapsibleContent>
      </Collapsible>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this field?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing published versions remain unchanged, but the field will
              be removed from the current draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(field.id)}>
              Remove field
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
