import { Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/features/customer-settings/components/field-label";
import type { NoteTemplateDefinition } from "@/features/customer-settings/components/types";

export type NoteTemplateFormValues = {
  name: string;
  description: string;
  content: string;
};

export function NoteTemplateDialog({
  open,
  editing,
  values,
  isPending,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: {
  open: boolean;
  editing: NoteTemplateDefinition | null;
  values: NoteTemplateFormValues;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange: (values: NoteTemplateFormValues) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit note template" : "Add note template"}
            </DialogTitle>
            <DialogDescription>
              Templates can be copied into customer notes without exposing them
              externally.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <FieldLabel id="note-template-name" label="Name">
              <Input
                id="note-template-name"
                value={values.name}
                onChange={(event) =>
                  onValuesChange({ ...values, name: event.target.value })
                }
                required
              />
            </FieldLabel>
            <FieldLabel id="note-template-description" label="Description">
              <Input
                id="note-template-description"
                value={values.description}
                onChange={(event) =>
                  onValuesChange({ ...values, description: event.target.value })
                }
              />
            </FieldLabel>
            <FieldLabel id="note-template-content" label="Content">
              <Textarea
                id="note-template-content"
                className="min-h-40"
                value={values.content}
                onChange={(event) =>
                  onValuesChange({ ...values, content: event.target.value })
                }
                required
              />
            </FieldLabel>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Save className="size-3.5" />
              Save template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
