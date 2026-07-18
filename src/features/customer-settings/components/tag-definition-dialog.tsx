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
import type { CustomerTagDefinition } from "@/features/customer-settings/components/types";

export type TagDefinitionFormValues = {
  name: string;
  color: string;
  description: string;
};

export function TagDefinitionDialog({
  open,
  editing,
  values,
  isPending,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: {
  open: boolean;
  editing: CustomerTagDefinition | null;
  values: TagDefinitionFormValues;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange: (values: TagDefinitionFormValues) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tag" : "Add tag"}</DialogTitle>
            <DialogDescription>
              Tags are reusable labels, not customer-specific values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <FieldLabel id="customer-tag-name" label="Name">
              <Input
                id="customer-tag-name"
                value={values.name}
                onChange={(event) =>
                  onValuesChange({ ...values, name: event.target.value })
                }
                required
              />
            </FieldLabel>
            <FieldLabel id="customer-tag-color" label="Color">
              <Input
                id="customer-tag-color"
                type="color"
                value={values.color}
                onChange={(event) =>
                  onValuesChange({ ...values, color: event.target.value })
                }
              />
            </FieldLabel>
            <FieldLabel id="customer-tag-description" label="Description">
              <Textarea
                id="customer-tag-description"
                value={values.description}
                onChange={(event) =>
                  onValuesChange({ ...values, description: event.target.value })
                }
              />
            </FieldLabel>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Save className="size-3.5" />
              Save tag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
