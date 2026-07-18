import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchiveButton } from "@/features/customer-settings/components/archive-button";
import { DefinitionRows } from "@/features/customer-settings/components/definition-rows";
import {
  FieldDefinitionDialog,
  type FieldDefinitionFormValues,
} from "@/features/customer-settings/components/field-definition-dialog";
import { SettingsCard } from "@/features/customer-settings/components/settings-card";
import type {
  CustomerFieldDefinition,
  RefreshSettings,
} from "@/features/customer-settings/components/types";
import { useTRPC } from "@/trpc/client";

const emptyValues: FieldDefinitionFormValues = {
  key: "",
  label: "",
  description: "",
  fieldType: "TEXT",
  isRequired: false,
  options: "",
};

export function FieldDefinitionsPanel({
  items,
  canManage,
  onRefresh,
}: {
  items: CustomerFieldDefinition[];
  canManage: boolean;
  onRefresh: RefreshSettings;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomerFieldDefinition | null>(
    null,
  );
  const [values, setValues] =
    React.useState<FieldDefinitionFormValues>(emptyValues);
  const create = useMutation(
    trpc.customerSettings.createField.mutationOptions(),
  );
  const update = useMutation(
    trpc.customerSettings.updateField.mutationOptions(),
  );
  const archive = useMutation(
    trpc.customerSettings.archiveField.mutationOptions(),
  );

  const openDialog = (item: CustomerFieldDefinition | null): void => {
    setEditing(item);
    setValues(
      item
        ? {
            key: item.key,
            label: item.label,
            description: item.description ?? "",
            fieldType: item.fieldType,
            isRequired: item.isRequired,
            options: item.options.join(", "),
          }
        : emptyValues,
    );
    setOpen(true);
  };

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const input = {
      ...values,
      description: values.description || null,
      options: values.options
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...input });
      else await create.mutateAsync(input);
      toast.success(
        editing ? "Customer field updated" : "Customer field created",
      );
      setOpen(false);
      await onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Customer field could not be saved",
      );
    }
  };

  return (
    <SettingsCard
      title="Profile fields"
      description="Typed fields that can be used consistently across customer records."
      action={
        canManage ? (
          <Button size="sm" onClick={() => openDialog(null)}>
            <Plus className="size-3.5" />
            Add field
          </Button>
        ) : undefined
      }
    >
      <DefinitionRows
        empty="No profile fields configured."
        items={items}
        render={(item) => (
          <>
            <div>
              <p className="text-sm font-medium">
                {item.label}{" "}
                {item.archivedAt ? (
                  <Badge variant="secondary">Archived</Badge>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.key} - {item.fieldType}
                {item.isRequired ? " - Required" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {canManage && !item.archivedAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog(item)}
                >
                  Edit
                </Button>
              ) : null}
              <ArchiveButton
                label={item.label}
                disabled={
                  !canManage || Boolean(item.archivedAt) || archive.isPending
                }
                onArchive={() =>
                  archive.mutate(
                    { id: item.id },
                    {
                      onSuccess: () => void onRefresh(),
                      onError: () =>
                        toast.error("Customer field could not be archived"),
                    },
                  )
                }
              />
            </div>
          </>
        )}
      />
      <FieldDefinitionDialog
        open={open}
        editing={editing}
        values={values}
        isPending={create.isPending || update.isPending}
        onOpenChange={setOpen}
        onValuesChange={setValues}
        onSubmit={submit}
      />
    </SettingsCard>
  );
}
