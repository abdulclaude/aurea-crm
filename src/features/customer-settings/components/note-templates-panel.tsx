import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchiveButton } from "@/features/customer-settings/components/archive-button";
import { DefinitionRows } from "@/features/customer-settings/components/definition-rows";
import {
  NoteTemplateDialog,
  type NoteTemplateFormValues,
} from "@/features/customer-settings/components/note-template-dialog";
import { SettingsCard } from "@/features/customer-settings/components/settings-card";
import type {
  NoteTemplateDefinition,
  RefreshSettings,
} from "@/features/customer-settings/components/types";
import { useTRPC } from "@/trpc/client";

const emptyValues: NoteTemplateFormValues = {
  name: "",
  description: "",
  content: "",
};

export function NoteTemplatesPanel({
  items,
  canManage,
  onRefresh,
}: {
  items: NoteTemplateDefinition[];
  canManage: boolean;
  onRefresh: RefreshSettings;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NoteTemplateDefinition | null>(
    null,
  );
  const [values, setValues] =
    React.useState<NoteTemplateFormValues>(emptyValues);
  const create = useMutation(
    trpc.customerSettings.createNoteTemplate.mutationOptions(),
  );
  const update = useMutation(
    trpc.customerSettings.updateNoteTemplate.mutationOptions(),
  );
  const archive = useMutation(
    trpc.customerSettings.archiveNoteTemplate.mutationOptions(),
  );

  const openDialog = (item: NoteTemplateDefinition | null): void => {
    setEditing(item);
    setValues(
      item
        ? {
            name: item.name,
            description: item.description ?? "",
            content: item.content,
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
      description: values.description || null,
      content: values.content,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...input });
      else await create.mutateAsync(input);
      toast.success(
        editing ? "Note template updated" : "Note template created",
      );
      setOpen(false);
      await onRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Note template could not be saved",
      );
    }
  };

  return (
    <SettingsCard
      title="Note templates"
      description="Reusable internal-note structures for consistent customer follow-up."
      action={
        canManage ? (
          <Button size="sm" onClick={() => openDialog(null)}>
            <Plus className="size-3.5" />
            Add template
          </Button>
        ) : undefined
      }
    >
      <DefinitionRows
        empty="No note templates configured."
        items={items}
        render={(item) => (
          <>
            <div>
              <p className="text-sm font-medium">
                {item.name}{" "}
                {item.archivedAt ? (
                  <Badge variant="secondary">Archived</Badge>
                ) : null}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {item.description ?? item.content}
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
                        toast.error("Note template could not be archived"),
                    },
                  )
                }
              />
            </div>
          </>
        )}
      />
      <NoteTemplateDialog
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
