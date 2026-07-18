"use client";

import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export function FormSubmissionResponseDialog({
  data,
  fields,
}: {
  data: unknown;
  fields: readonly { id: string; label: string }[];
}) {
  const values = responseValues(data);
  const visibleFields = fields.filter((field) => field.id in values);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="size-4" aria-hidden="true" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Form response</DialogTitle>
          <DialogDescription>
            Values stored from the validated published form version.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        {visibleFields.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            This response does not contain displayable fields.
          </p>
        ) : (
          <dl className="divide-y">
            {visibleFields.map((field) => (
              <div key={field.id} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm font-medium">{field.label}</dt>
                <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {formatValue(values[field.id])}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

function responseValues(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}
