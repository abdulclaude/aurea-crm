import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchiveButton } from "@/features/customer-settings/components/archive-button";
import { DefinitionRows } from "@/features/customer-settings/components/definition-rows";
import { SettingsCard } from "@/features/customer-settings/components/settings-card";
import {
  TagDefinitionDialog,
  type TagDefinitionFormValues,
} from "@/features/customer-settings/components/tag-definition-dialog";
import type {
  CustomerTagDefinition,
  RefreshSettings,
} from "@/features/customer-settings/components/types";
import { useTRPC } from "@/trpc/client";

const emptyValues: TagDefinitionFormValues = {
  name: "",
  color: "#0f766e",
  description: "",
};

export function TagDefinitionsPanel({
  items,
  canManage,
  onRefresh,
}: {
  items: CustomerTagDefinition[];
  canManage: boolean;
  onRefresh: RefreshSettings;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomerTagDefinition | null>(
    null,
  );
  const [values, setValues] =
    React.useState<TagDefinitionFormValues>(emptyValues);
  const create = useMutation(trpc.customerSettings.createTag.mutationOptions());
  const update = useMutation(trpc.customerSettings.updateTag.mutationOptions());
  const archive = useMutation(
    trpc.customerSettings.archiveTag.mutationOptions(),
  );

  const openDialog = (item: CustomerTagDefinition | null): void => {
    setEditing(item);
    setValues(
      item
        ? {
            name: item.name,
            color: item.color ?? "#0f766e",
            description: item.description ?? "",
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
      name: values.name,
      color: values.color || null,
      description: values.description || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...input });
      else await create.mutateAsync(input);
      toast.success(editing ? "Customer tag updated" : "Customer tag created");
      setOpen(false);
      await onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Customer tag could not be saved",
      );
    }
  };

  return (
    <SettingsCard
      title="Tags"
      description="Shared tag names prevent duplicate customer segments and automation labels."
      action={
        canManage ? (
          <Button size="sm" onClick={() => openDialog(null)}>
            <Plus className="size-3.5" />
            Add tag
          </Button>
        ) : undefined
      }
    >
      <DefinitionRows
        empty="No tags configured."
        items={items}
        render={(item) => (
          <>
            <div className="flex items-center gap-2">
              <span
                role="img"
                aria-label={`Tag color ${item.color ?? "default"}`}
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color ?? "currentColor" }}
              />
              <div>
                <p className="text-sm font-medium">
                  {item.name}{" "}
                  {item.archivedAt ? (
                    <Badge variant="secondary">Archived</Badge>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Color {item.color ?? "default"} -{" "}
                  {item.description ?? "No description"}
                </p>
              </div>
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
                label={item.name}
                disabled={
                  !canManage || Boolean(item.archivedAt) || archive.isPending
                }
                onArchive={() =>
                  archive.mutate(
                    { id: item.id },
                    {
                      onSuccess: () => void onRefresh(),
                      onError: () =>
                        toast.error("Customer tag could not be archived"),
                    },
                  )
                }
              />
            </div>
          </>
        )}
      />
      <TagDefinitionDialog
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
