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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { customerFieldTypes } from "@/features/customer-settings/contracts";
import { FieldLabel } from "@/features/customer-settings/components/field-label";
import type { CustomerFieldDefinition } from "@/features/customer-settings/components/types";

export type FieldDefinitionFormValues = {
  key: string;
  label: string;
  description: string;
  fieldType: (typeof customerFieldTypes)[number];
  isRequired: boolean;
  options: string;
};

export function FieldDefinitionDialog({
  open,
  editing,
  values,
  isPending,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: {
  open: boolean;
  editing: CustomerFieldDefinition | null;
  values: FieldDefinitionFormValues;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange: (values: FieldDefinitionFormValues) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}): React.JSX.Element {
  const showOptions =
    values.fieldType === "SELECT" || values.fieldType === "MULTI_SELECT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit profile field" : "Add profile field"}
            </DialogTitle>
            <DialogDescription>
              Keys remain stable for future automations and imports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <FieldLabel id="customer-field-label" label="Label">
              <Input
                id="customer-field-label"
                value={values.label}
                onChange={(event) =>
                  onValuesChange({ ...values, label: event.target.value })
                }
                required
              />
            </FieldLabel>
            <FieldLabel id="customer-field-key" label="Key">
              <Input
                id="customer-field-key"
                value={values.key}
                onChange={(event) =>
                  onValuesChange({ ...values, key: event.target.value })
                }
                required
              />
            </FieldLabel>
            <FieldLabel id="customer-field-type" label="Type">
              <Select
                value={values.fieldType}
                onValueChange={(fieldType) =>
                  onValuesChange({
                    ...values,
                    fieldType: fieldType as (typeof customerFieldTypes)[number],
                    options:
                      fieldType === "SELECT" || fieldType === "MULTI_SELECT"
                        ? values.options
                        : "",
                  })
                }
              >
                <SelectTrigger id="customer-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customerFieldTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLabel>
            {showOptions ? (
              <FieldLabel id="customer-field-options" label="Options">
                <Input
                  id="customer-field-options"
                  value={values.options}
                  onChange={(event) =>
                    onValuesChange({ ...values, options: event.target.value })
                  }
                  placeholder="Option one, option two"
                  required
                />
              </FieldLabel>
            ) : null}
            <FieldLabel id="customer-field-description" label="Description">
              <Textarea
                id="customer-field-description"
                value={values.description}
                onChange={(event) =>
                  onValuesChange({ ...values, description: event.target.value })
                }
              />
            </FieldLabel>
            <div className="flex items-center justify-between">
              <Label htmlFor="field-required">Required</Label>
              <Switch
                id="field-required"
                checked={values.isRequired}
                onCheckedChange={(isRequired) =>
                  onValuesChange({ ...values, isRequired })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Save className="size-3.5" />
              Save field
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
